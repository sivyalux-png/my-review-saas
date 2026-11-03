"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import type { ReviewSettings } from "./settings-client";

type SaveSettingsResult = {
  ok: boolean;
  message: string;
};

export type BusinessSettings = {
  businessName: string;
  businessCategory: string;
  googleReviewLink: string;
};

type UpdateBusinessSettingsResult = {
  ok: boolean;
  message: string;
};

export async function update_business_settings(
  settings: BusinessSettings,
): Promise<UpdateBusinessSettingsResult> {
  if (
    !settings ||
    typeof settings.businessName !== "string" ||
    settings.businessName.length > 120 ||
    typeof settings.businessCategory !== "string" ||
    settings.businessCategory.length > 80 ||
    typeof settings.googleReviewLink !== "string" ||
    settings.googleReviewLink.length > 2048
  ) {
    return { ok: false, message: "One or more business details are invalid or too long." };
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

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure Supabase to update business settings.", error);
    return { ok: false, message: "Settings are unavailable right now. Please try again." };
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error("Unable to verify user for business settings.", claimsError);
    return { ok: false, message: "We couldn't verify your account. Please sign in again." };
  }
  if (typeof data?.claims.sub !== "string") {
    return { ok: false, message: "Please sign in again before saving settings." };
  }

  const { error } = await supabase.from("settings").upsert({
    user_id: data.claims.sub,
    business_name: settings.businessName.trim() || null,
    business_category: settings.businessCategory.trim() || null,
    google_review_link: googleReviewLink || null,
  });
  if (error) {
    console.error("Unable to update business settings.", error);
    return { ok: false, message: "We couldn't save your business profile. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/overview");
  revalidatePath("/r/[id]", "page");
  return { ok: true, message: "Business profile saved." };
}

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
  const settingsUpdate = {
    business_name: settings.businessName.trim() || null,
    business_category: settings.businessCategory.trim() || null,
    google_review_link: googleReviewLink || null,
    private_feedback_url: privateFeedbackUrl || null,
    email_subject: settings.emailSubject,
    email_body: settings.emailBody,
  };
  const { error } = await supabase
    .from("settings")
    .upsert({ ...settingsUpdate, user_id: userId });

  if (error) {
    console.error("Unable to save review settings.", error);
    return { ok: false, message: "We couldn't save your settings right now. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/r/[id]", "page");
  return {
    ok: true,
    message: "Email settings saved. New review links will use these values.",
  };
}
