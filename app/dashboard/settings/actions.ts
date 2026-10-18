"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { getTierEntitlement } from "../../../lib/entitlements";
import type { ReviewSettings } from "./settings-client";

type SaveSettingsResult = {
  ok: boolean;
  message: string;
};

const fieldLimits = {
  businessName: 120,
  googleReviewLink: 2048,
  privateFeedbackUrl: 2048,
  emailSubject: 200,
  emailBody: 10000,
  messageBody: 320,
} as const;

export async function saveReviewSettings(
  settings: ReviewSettings,
): Promise<SaveSettingsResult> {
  if (
    !settings ||
    typeof settings !== "object" ||
    Object.entries(fieldLimits).some(([key, maximum]) => {
      const value = settings[key as keyof ReviewSettings];
      return typeof value !== "string" || value.length > maximum;
    })
  ) {
    return { ok: false, message: "One or more settings are invalid or too long." };
  }

  const googleReviewLink = settings.googleReviewLink.trim();
  if (googleReviewLink) {
    try {
      const url = new URL(googleReviewLink);
      const hostname = url.hostname.toLowerCase();
      const allowedHost =
        hostname === "google.com" ||
        hostname.endsWith(".google.com") ||
        hostname === "g.page" ||
        hostname === "maps.app.goo.gl";
      if (url.protocol !== "https:" || !allowedHost) {
        return { ok: false, message: "Enter a valid HTTPS Google review URL." };
      }
    } catch {
      return { ok: false, message: "Enter a valid HTTPS Google review URL." };
    }
  }

  const privateFeedbackUrl = settings.privateFeedbackUrl.trim();
  if (privateFeedbackUrl && privateFeedbackUrl.startsWith("//")) {
    return { ok: false, message: "Private feedback URLs must use HTTPS or be an internal path." };
  }
  if (privateFeedbackUrl && !privateFeedbackUrl.startsWith("/")) {
    try {
      const url = new URL(privateFeedbackUrl);
      if (url.protocol !== "https:") {
        return { ok: false, message: "Private feedback URLs must use HTTPS or be an internal path." };
      }
    } catch {
      return { ok: false, message: "Enter a valid private feedback URL." };
    }
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure Supabase to save review settings.", error);
    return { ok: false, message: "Settings are unavailable right now. Please try again." };
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error("Unable to verify user for review settings.", claimsError);
    return { ok: false, message: "We couldn't verify your account. Please sign in again." };
  }
  if (typeof data?.claims.sub !== "string") {
    return { ok: false, message: "Please sign in again before saving settings." };
  }

  const userId = data.claims.sub;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    console.error("Unable to load plan for review settings.", profileError);
    return { ok: false, message: "We couldn't verify your plan. Please try again." };
  }
  if (!profile) {
    return { ok: false, message: "Your account profile is unavailable. Please contact support." };
  }

  const settingsUpdate = {
    business_name: settings.businessName.trim() || null,
    google_review_link: googleReviewLink || null,
    private_feedback_url: privateFeedbackUrl || null,
    email_subject: settings.emailSubject,
    email_body: settings.emailBody,
  };
  const { error } = await supabase
    .from("settings")
    .upsert(
      getTierEntitlement(profile.plan_tier)?.channels.includes("SMS")
        ? { ...settingsUpdate, user_id: userId, message_body: settings.messageBody }
        : { ...settingsUpdate, user_id: userId },
    );

  if (error) {
    console.error("Unable to save review settings.", error);
    return { ok: false, message: "We couldn't save your settings right now. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/r/[id]", "page");
  return {
    ok: true,
    message: getTierEntitlement(profile.plan_tier)?.channels.includes("SMS")
      ? "Settings saved. New review links will use these values."
      : "Email settings saved. Upgrade to Tier 3 to configure SMS and WhatsApp messaging.",
  };
}
