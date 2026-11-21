import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getBusinessContext } from "../../lib/businesses";
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

  const [{ data: profile, error: profileError }, businessContext] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, business_name, plan_tier, credits_remaining, system_email_credits_remaining")
      .eq("id", data.claims.sub)
      .maybeSingle(),
    getBusinessContext(supabase, data.claims.sub),
  ]);

  if (profileError) {
    throw profileError;
  }

  return (
    <DashboardShell
      activeBusinessId={businessContext.activeBusiness.id}
      businesses={businessContext.businesses.map(({ id, business_name }) => ({ id, business_name }))}
      businessName={businessContext.activeBusiness.business_name}
      creditsRemaining={(profile?.credits_remaining ?? 0) + (profile?.system_email_credits_remaining ?? 0)}
      fullName={profile?.full_name ?? null}
      planTier={profile?.plan_tier ?? null}
    >
      {children}
    </DashboardShell>
  );
}
