"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../lib/supabase/admin";
import {
  encryptEmailCredentials,
  type ResendCredentials,
  sendEmailUsingSavedResendProvider,
} from "../../../lib/email-provider";
import { createClient } from "../../../lib/supabase/server";

type ProviderForm = {
  fromEmail: string;
  resendApiKey: string;
};

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Unable to verify the user for email provider settings.", error);
    throw new Error("Please sign in again before changing email settings.");
  }
  if (!data.user) throw new Error("Please sign in again before changing email settings.");
  return { supabase, user: data.user };
}

export async function saveEmailProvider(form: ProviderForm): Promise<ActionResult> {
  if (
    !form ||
    typeof form.fromEmail !== "string" ||
    !emailPattern.test(form.fromEmail.trim()) ||
    form.fromEmail.length > 254 ||
    typeof form.resendApiKey !== "string"
  ) {
    return { ok: false, message: "Enter a valid Resend API key and sender email." };
  }

  const apiKey = form.resendApiKey.trim();
  if (!/^re_[A-Za-z0-9_-]{10,}$/.test(apiKey) || apiKey.length > 512) {
    return { ok: false, message: "Paste a valid Resend API key." };
  }
  const credentials: ResendCredentials = { apiKey };

  try {
    const { user } = await getAuthenticatedUser();
    const admin = createAdminClient();
    const { error } = await admin.from("email_provider_credentials").upsert(
      {
        user_id: user.id,
        provider: "resend",
        from_email: form.fromEmail.trim(),
        encrypted_credentials: encryptEmailCredentials(credentials),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("Unable to save email provider settings.", error);
      return { ok: false, message: "We couldn't save your email settings. Please try again." };
    }
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/requests");
    return { ok: true, message: "Your email provider is connected." };
  } catch (error) {
    console.error("Unable to configure the email provider.", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Email settings are unavailable right now.",
    };
  }
}

export async function disconnectEmailProvider(): Promise<ActionResult> {
  try {
    const { user } = await getAuthenticatedUser();
    const admin = createAdminClient();
    const { error } = await admin
      .from("email_provider_credentials")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      console.error("Unable to disconnect email provider.", error);
      return { ok: false, message: "We couldn't disconnect your email provider." };
    }
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/requests");
    return { ok: true, message: "Your email provider was disconnected." };
  } catch (error) {
    console.error("Unable to disconnect email provider.", error);
    return { ok: false, message: "Email settings are unavailable right now." };
  }
}

export async function sendProviderTestEmail(): Promise<ActionResult> {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user.email) {
      return { ok: false, message: "Add and verify an email address on your account first." };
    }

    const delivery = await sendEmailUsingSavedResendProvider({
      userId: user.id,
      businessName: "TableSignal test",
      to: user.email,
      subject: "Your TableSignal email setup is working",
      text: "This is a test email from TableSignal. Your email delivery is ready.",
      html: "<p>This is a test email from TableSignal. Your email delivery is ready.</p>",
    });

    revalidatePath("/dashboard/settings");
    return {
      ok: true,
      message: `Test email sent to ${user.email} using your saved Resend key and ${delivery.fromEmail}. Check Resend Logs to confirm delivery.`,
    };
  } catch (error) {
    console.error("Unable to send a provider test email.", error);
    if (error instanceof Error && (
      error.message.startsWith("Set EMAIL_CREDENTIALS_ENCRYPTION_KEY") ||
      error.message.startsWith("EMAIL_CREDENTIALS_ENCRYPTION_KEY")
    )) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: error instanceof Error
        ? error.message
        : "The test email could not be sent. Check your saved Resend settings and verified sender domain.",
    };
  }
}
