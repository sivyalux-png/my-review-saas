import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveBusinessName } from "../../lib/business-name";
import { createClient } from "../../lib/supabase/server";
import DashboardShell from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }

  if (!data?.claims.sub) {
    redirect("/login");
  }

  const [
    { data: profile, error: profileError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, business_name, plan_tier, credits_remaining, sms_credits_remaining")
      .eq("id", data.claims.sub)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("business_name")
      .eq("user_id", data.claims.sub)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw profileError;
  }
  if (settingsError) {
    throw settingsError;
  }

  return (
    <DashboardShell
      businessName={resolveBusinessName(settings?.business_name, profile?.business_name) ?? "Your business"}
      creditsRemaining={profile?.credits_remaining ?? null}
      fullName={profile?.full_name ?? null}
      planTier={profile?.plan_tier ?? null}
      smsCreditsRemaining={profile?.sms_credits_remaining ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
