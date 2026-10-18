import { redirect } from "next/navigation";
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

  const [
    { data: profile, error: profileError },
    { data: requests, error: requestsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("monthly_credit_limit, credits_remaining")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("review_requests")
      .select("id, customer_name, contact, service, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (profileError) {
    throw profileError;
  }
  if (requestsError) {
    throw requestsError;
  }

  return (
    <RequestsClient
      initialCreditsRemaining={profile?.credits_remaining ?? 0}
      initialRequests={(requests ?? []).map((request) => ({
        id: request.id,
        name: request.customer_name,
        contact: request.contact,
        service: request.service ?? "",
        status: request.status,
      }))}
      monthlyCreditLimit={profile?.monthly_credit_limit ?? 0}
    />
  );
}
