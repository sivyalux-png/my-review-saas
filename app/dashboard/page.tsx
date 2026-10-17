import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import OverviewClient from "./overview-client";

export default async function DashboardPage() {
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
    { data: profile, error: profileError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, business_name, plan_tier, monthly_credit_limit, credits_remaining")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("google_review_link")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw profileError;
  }

  if (settingsError) {
    throw settingsError;
  }

  return (
    <OverviewClient
      businessName={profile?.business_name ?? null}
      creditsRemaining={profile?.credits_remaining ?? null}
      fullName={profile?.full_name ?? null}
      googleReviewLink={settings?.google_review_link ?? null}
      monthlyCreditLimit={profile?.monthly_credit_limit ?? null}
      planTier={profile?.plan_tier ?? null}
    />
  );
}
