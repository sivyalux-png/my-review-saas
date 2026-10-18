import { redirect } from "next/navigation";
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
      .select("business_name, google_review_link, private_feedback_url, email_subject, email_body, message_body")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("plan_tier, sms_credit_limit, sms_credits_remaining")
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
    businessName: settings?.business_name ?? "",
    googleReviewLink: settings?.google_review_link ?? "",
    privateFeedbackUrl: settings?.private_feedback_url ?? "",
    emailSubject: settings?.email_subject ?? undefined,
    emailBody: settings?.email_body ?? undefined,
    messageBody: settings?.message_body ?? undefined,
  };

  return (
    <SettingsClient
      initialSettings={initialSettings}
      planTier={profile?.plan_tier ?? null}
      smsCreditLimit={profile?.sms_credit_limit ?? 0}
      smsCreditsRemaining={profile?.sms_credits_remaining ?? 0}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
