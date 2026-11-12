"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import type { ReviewSettings } from "./settings-client";

type SaveSettingsResult =
  | {
      ok: true;
      message: string;
      businessCategory: string;
      googleReviewLink: string;
    }
  | { ok: false; message: string };

const fieldLimits = {
  businessName: 120,
  businessCategory: 80,
  googleReviewLink: 2048,
  privateFeedbackUrl: 2048,
  emailSubject: 200,
  emailBody: 10000,
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
    throw new Error("Settings are unavailable right now. Please try again.");
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error("Unable to verify user for review settings.", claimsError);
    throw new Error("We couldn't verify your account. Please sign in again.");
  }
  if (typeof data?.claims.sub !== "string") {
    throw new Error("Please sign in again before saving settings.");
  }

  const userId = data.claims.sub;
  const businessCategory = settings.businessCategory.trim();
  const settingsUpdate = {
    business_name: settings.businessName.trim() || null,
    business_category: businessCategory || null,
    google_review_link: googleReviewLink || null,
    private_feedback_url: privateFeedbackUrl || null,
    email_subject: settings.emailSubject,
    email_body: settings.emailBody,
  };
  const { data: savedSettings, error } = await supabase
    .from("settings")
    .upsert({ ...settingsUpdate, user_id: userId }, { onConflict: "user_id" })
    .select("user_id, business_category, google_review_link")
    .single();

  if (error) {
    console.error("Unable to save review settings.", error);
    return {
      ok: false,
      message: `Settings save failed (${error.code}): ${error.message}`,
    };
  }

  if (
    !savedSettings ||
    savedSettings.user_id !== userId ||
    savedSettings.business_category !== (businessCategory || null) ||
    savedSettings.google_review_link !== (googleReviewLink || null)
  ) {
    console.error("Supabase returned unexpected settings after saving.", savedSettings);
    return {
      ok: false,
      message: "Supabase did not return the saved business type and Google review link.",
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/overview");
  revalidatePath("/r/[id]", "page");
  return {
    ok: true,
    message: "Settings saved successfully.",
    businessCategory: savedSettings.business_category ?? "",
    googleReviewLink: savedSettings.google_review_link ?? "",
  };
}
