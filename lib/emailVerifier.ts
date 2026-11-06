import dns from "dns";
import { promisify } from "node:util";

const resolveMx = promisify(dns.resolveMx);
const dnsTimeoutMs = 5000;
const emailPattern =
  /^[^\s@]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
const disposableEmailDomains = new Set([
  "10minutemail.com",
  "mailinator.com",
  "tempmail.com",
]);

export async function verifyEmailAddress(
  email: string,
): Promise<{ isValid: boolean; reason: string }> {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (!emailPattern.test(normalizedEmail)) {
    return { isValid: false, reason: "Invalid email format" };
  }

  const domain = normalizedEmail.split("@")[1].toLowerCase();
  if (
    [...disposableEmailDomains].some(
      (disposableDomain) =>
        domain === disposableDomain || domain.endsWith(`.${disposableDomain}`),
    )
  ) {
    return { isValid: false, reason: "Disposable email addresses are not allowed" };
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("DNS lookup timed out")),
          dnsTimeoutMs,
        );
      }),
    ]);

    if (records.length === 0) {
      return {
        isValid: false,
        reason: "Domain does not exist or has no MX records",
      };
    }

    return { isValid: true, reason: "" };
  } catch {
    return {
      isValid: false,
      reason: "Domain does not exist or has no MX records",
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
