import { redirect } from "next/navigation";
import { resolveBusinessName } from "../../../lib/business-name";
import { createClient } from "../../../lib/supabase/server";
import SettingsClient, { type ReviewSettings } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    throw claimsError;
  }

  const userId = claimsData?.claims.sub;
  if (typeof userId !== "string") {
    redirect("/login");
  }

  const [
    { data: settings, error: settingsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("business_name, business_category, google_review_link, private_feedback_url, email_subject, email_body")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("business_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (settingsError) {
    throw settingsError;
  }
  if (profileError) {
    throw profileError;
  }

  const initialSettings: Partial<ReviewSettings> = {
    businessName: resolveBusinessName(settings?.business_name, profile?.business_name) ?? "",
    businessCategory: settings?.business_category ?? "",
    googleReviewLink: settings?.google_review_link ?? "",
    privateFeedbackUrl: settings?.private_feedback_url ?? "",
    emailSubject: settings?.email_subject ?? undefined,
    emailBody: settings?.email_body ?? undefined,
  };

  return (
    <SettingsClient
      initialSettings={initialSettings}
    />
  );
}
