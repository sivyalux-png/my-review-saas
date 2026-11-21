import "server-only";

import { lookup } from "node:dns/promises";
import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { createAdminClient } from "./supabase/admin";

type ResendCredentials = {
  apiKey: string;
};

type SmtpCredentials = {
  host: string;
  port: number;
  username: string;
  password: string;
};

type StoredProvider = {
  provider: "resend" | "smtp";
  from_email: string;
  encrypted_credentials: string;
};

export type EmailMessage = {
  userId: string;
  businessName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getEncryptionKey() {
  const value = process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY?.trim();
  const setupLocation = process.env.NODE_ENV === "production"
    ? "Set the same stable value as a server-only environment variable in your production host, then redeploy."
    : "Add it to the project-root .env.local file, then restart the dev server.";
  if (!value) {
    throw new Error(
      `EMAIL_CREDENTIALS_ENCRYPTION_KEY is missing. Generate a 32-byte key with \`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"\` (a 64-character hex key is also accepted). ${setupLocation}`,
    );
  }

  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }

  const key = Buffer.from(value, "base64");
  if (
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value) ||
    key.length !== 32 ||
    key.toString("base64") !== value
  ) {
    throw new Error(
      `EMAIL_CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes, provided as 64 hex characters or canonical base64. Check the value in ${process.env.NODE_ENV === "production" ? "your production host's server-only environment variables and redeploy" : ".env.local and restart the dev server"}.`,
    );
  }
  return key;
}

export function getEmailCredentialEncryptionStatus() {
  try {
    getEncryptionKey();
    return { configured: true as const, message: "" };
  } catch (error) {
    return {
      configured: false as const,
      message: error instanceof Error ? error.message : "Email credential encryption is misconfigured.",
    };
  }
}

export function encryptEmailCredentials(credentials: ResendCredentials | SmtpCredentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptEmailCredentials(value: string) {
  const [version, ivValue, tagValue, encryptedValue, ...extra] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue || extra.length > 0) {
    throw new Error("Stored email credentials have an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  let decrypted: string;
  try {
    decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new Error(
      "Saved email credentials could not be decrypted. Confirm EMAIL_CREDENTIALS_ENCRYPTION_KEY is the same stable value used when they were saved.",
      { cause: error },
    );
  }

  const credentials: unknown = JSON.parse(decrypted);
  if (!credentials || typeof credentials !== "object") {
    throw new Error("Stored email credentials are invalid.");
  }
  return credentials as ResendCredentials | SmtpCredentials;
}

export async function getStoredEmailProvider(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_provider_credentials")
    .select("provider, from_email, encrypted_credentials")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load saved email provider configuration.", error);
    throw new Error("Your email provider settings are unavailable right now.");
  }

  return data as StoredProvider | null;
}

export async function sendEmail(message: EmailMessage) {
  const provider = await getStoredEmailProvider(message.userId);
  const displayName = message.businessName.replace(/[\r\n]+/g, " ").trim() || "Your business";

  if (provider) {
    const credentials = decryptEmailCredentials(provider.encrypted_credentials);
    const from = formatFrom(displayName, provider.from_email);

    if (provider.provider === "resend") {
      if (!("apiKey" in credentials)) throw new Error("Saved Resend credentials are invalid.");
      return sendWithResend(credentials.apiKey, from, message);
    }

    if (!("host" in credentials)) throw new Error("Saved SMTP credentials are invalid.");
    await validateSmtpHost(credentials.host);
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.port === 465,
      auth: { user: credentials.username, pass: credentials.password },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { provider: "smtp" as const };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error("System email delivery is not configured.");
  }
  return sendWithResend(apiKey, formatFrom(displayName, fromEmail), message);
}

export async function sendEmailUsingSavedResendProvider(message: EmailMessage) {
  const provider = await getStoredEmailProvider(message.userId);
  if (!provider) {
    throw new Error("Save your Resend API key and sender email before sending a test email.");
  }
  if (provider.provider !== "resend") {
    throw new Error("Your saved email provider is not Resend. Save your Resend API key and sender email first.");
  }

  const credentials = decryptEmailCredentials(provider.encrypted_credentials);
  if (!("apiKey" in credentials)) {
    throw new Error("Saved Resend credentials are invalid. Save your Resend API key again.");
  }

  const displayName = message.businessName.replace(/[\r\n]+/g, " ").trim() || "Your business";
  await sendWithResend(
    credentials.apiKey,
    formatFrom(displayName, provider.from_email),
    message,
  );
  return { provider: "resend" as const, fromEmail: provider.from_email };
}

async function sendWithResend(
  apiKey: string,
  from: string,
  message: EmailMessage,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    console.error("Email provider rejected a message.", response.status);
    throw new Error("The email provider could not deliver this message.");
  }
  return { provider: "resend" as const };
}

function formatFrom(businessName: string, address: string) {
  if (/[\r\n]/.test(address)) throw new Error("The sender email address is invalid.");
  const match = /^(?:([^<>]*)<([^<>]+)>|([^<>]+))$/.exec(address.trim());
  const emailAddress = (match?.[2] ?? match?.[3] ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    throw new Error("The sender email address is invalid.");
  }
  const displayName = (match?.[1]?.trim() || businessName).replace(/[\r\n]+/g, " ").trim();
  const escapedName = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escapedName}" <${emailAddress}>`;
}

async function validateSmtpHost(host: string) {
  const normalizedHost = host.trim().toLowerCase();
  if (
    !normalizedHost ||
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    normalizedHost.endsWith(".local") ||
    isIP(normalizedHost)
  ) {
    throw new Error("Enter a public SMTP hostname, not a local or private address.");
  }

  try {
    const addresses = await lookup(normalizedHost, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new Error("The SMTP host must resolve only to public IP addresses.");
    }
  } catch (error) {
    console.error("Unable to resolve the configured SMTP host.", error);
    if (error instanceof Error && error.message === "The SMTP host must resolve only to public IP addresses.") {
      throw error;
    }
    throw new Error("The SMTP host could not be reached.");
  }
}

function isPublicAddress(address: string) {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return normalized.startsWith("2") || normalized.startsWith("3");
  }

  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [first, second] = octets;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

export type { ResendCredentials, SmtpCredentials };
