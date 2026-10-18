import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_tier, credits_remaining, sms_credits_remaining")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return (
    <DashboardShell
      creditsRemaining={profile?.credits_remaining ?? null}
      planTier={profile?.plan_tier ?? null}
      smsCreditsRemaining={profile?.sms_credits_remaining ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
