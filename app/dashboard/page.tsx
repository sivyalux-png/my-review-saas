import { redirect } from "next/navigation";
import { getActiveBusiness } from "../../lib/businesses";
import { createAdminClient } from "../../lib/supabase/admin";
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

  const activeBusiness = await getActiveBusiness(supabase, userId);
  const [requests, { data: profile, error: profileError }, { data: provider, error: providerError }] = await Promise.all([
    getReviewRequests(supabase, activeBusiness.id),
    supabase
      .from("profiles")
      .select("full_name, business_name, plan_tier, monthly_credit_limit, credits_remaining, system_email_credits_remaining")
      .eq("id", userId)
      .maybeSingle(),
    createAdminClient()
      .from("email_provider_credentials")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw profileError;
  }
  if (providerError) throw providerError;

  const allRequests = requests;
  const sentRequests = allRequests.filter(
    (request) =>
      request.status === "sent" ||
      request.status === "completed" ||
      request.status === "private_feedback_submitted",
  );
  const ratedRequests = allRequests.filter(
    (request) => typeof request.rating === "number",
  );
  const positiveReviews = ratedRequests.filter((request) => request.rating! >= 4).length;
  const negativeReviews = ratedRequests.length - positiveReviews;
  const averageRating = ratedRequests.length
    ? ratedRequests.reduce((sum, request) => sum + (request.rating ?? 0), 0) / ratedRequests.length
    : null;

  const now = new Date();
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sentInCurrentPeriod = sentRequests.filter(
    (request) => new Date(request.created_at) >= currentPeriodStart,
  ).length;
  const sentInPreviousPeriod = sentRequests.filter((request) => {
    const createdAt = new Date(request.created_at);
    return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
  }).length;
  const requestChangePercent = sentInPreviousPeriod
    ? Math.round(((sentInCurrentPeriod - sentInPreviousPeriod) / sentInPreviousPeriod) * 100)
    : sentInCurrentPeriod
      ? 100
      : 0;

  const trendDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      label: date.toLocaleDateString("en", { weekday: "short" }),
      date,
      nextDate,
    };
  }).map((day) => ({
    ...day,
    requests: sentRequests.filter((request) => {
      const createdAt = new Date(request.created_at);
      return createdAt >= day.date && createdAt < day.nextDate;
    }).length,
    reviews: ratedRequests.filter((request) => {
      if (!request.reviewed_at) return false;
      const reviewedAt = new Date(request.reviewed_at);
      return reviewedAt >= day.date && reviewedAt < day.nextDate;
    }).length,
  }));

  return (
    <OverviewClient
      businessName={activeBusiness.business_name}
      creditsRemaining={(profile?.credits_remaining ?? 0) + (profile?.system_email_credits_remaining ?? 0)}
      fullName={profile?.full_name ?? null}
      googleReviewLink={activeBusiness.google_review_link}
      monthlyCreditLimit={(profile?.monthly_credit_limit ?? 0) + 30}
      planTier={profile?.plan_tier ?? null}
      providerConnected={Boolean(provider)}
      analytics={{
        totalSent: sentRequests.length,
        requestChangePercent,
        conversionRate: sentRequests.length
          ? (ratedRequests.length / sentRequests.length) * 100
          : null,
        averageRating,
        positiveReviews,
        negativeReviews,
        totalReviews: ratedRequests.length,
        trendDays: trendDays.map(({ label, requests: requestCount, reviews }) => ({
          label,
          requests: requestCount,
          reviews,
        })),
        recentReviews: ratedRequests
          .sort((first, second) =>
            new Date(second.reviewed_at ?? second.created_at).getTime() -
            new Date(first.reviewed_at ?? first.created_at).getTime(),
          )
          .slice(0, 4)
          .map((request) => ({
            customerName: request.customer_name,
            rating: request.rating ?? 0,
            feedback: request.feedback,
            reviewedAt: request.reviewed_at ?? request.created_at,
          })),
      }}
    />
  );
}

async function getReviewRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const pageSize = 1000;
  const requests = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("review_requests")
      .select("created_at, status, rating, feedback, customer_name, reviewed_at, id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw error;
    }
    requests.push(...(data ?? []));
    if (!data || data.length < pageSize) {
      return requests;
    }
  }
}
