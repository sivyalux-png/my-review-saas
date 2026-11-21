import { redirect } from "next/navigation";
import { getActiveBusiness } from "../../../lib/businesses";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import RequestsClient from "./requests-client";

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    throw claimsError;
  }

  const userId = claimsData?.claims.sub;
  if (typeof userId !== "string") {
    redirect("/login");
  }

  const activeBusiness = await getActiveBusiness(supabase, userId);
  const [
    { data: profile, error: profileError },
    { data: requests, error: requestsError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("monthly_credit_limit, credits_remaining, system_email_credits_remaining")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("review_requests")
      .select("id, customer_name, customer_email, email_status")
      .eq("business_id", activeBusiness.id)
      .not("customer_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
    createAdminClient()
      .from("email_provider_credentials")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw profileError;
  }
  if (requestsError) {
    throw requestsError;
  }
  if (providerError) throw providerError;

  return (
    <RequestsClient
      initialCreditsRemaining={(profile?.credits_remaining ?? 0) + (profile?.system_email_credits_remaining ?? 0)}
      initialRequests={(requests ?? []).map((request) => ({
        id: request.id,
        name: request.customer_name,
        email: request.customer_email ?? "",
        status: request.email_status,
      }))}
      monthlyCreditLimit={(profile?.monthly_credit_limit ?? 0) + 30}
      providerConnected={Boolean(provider)}
    />
  );
}
