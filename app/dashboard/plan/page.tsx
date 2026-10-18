import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import PlanClient from "./plan-client";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getClaims();

  if (userError) {
    throw userError;
  }

  const userId = data?.claims.sub;
  if (typeof userId !== "string") {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_tier, monthly_credit_limit, credits_remaining, sms_credit_limit, sms_credits_remaining")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return <PlanClient initialEntitlement={profile} />;
}
