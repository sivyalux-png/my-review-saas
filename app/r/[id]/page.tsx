import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import PublicReviewPage, { type PublicReviewRequest } from "./public-review-page";

export const metadata: Metadata = {
  title: "Share your experience",
  description: "Rate your recent experience and share private feedback with the business.",
};

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!requestIdPattern.test(id)) notFound();
  const ratingValue = Array.isArray(query.rating) ? query.rating[0] : query.rating;
  const initialRating = ratingValue && /^[1-5]$/.test(ratingValue)
    ? Number(ratingValue)
    : null;
  const submittedValue = Array.isArray(query.submitted) ? query.submitted[0] : query.submitted;
  const errorValue = Array.isArray(query.error) ? query.error[0] : query.error;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_review_request", {
    p_request_id: id,
  });

  if (error) {
    console.error("Unable to load public review request.", error);
    throw new Error("Unable to load this review request.");
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (
    !result ||
    typeof result.customer_name !== "string" ||
    typeof result.business_name !== "string" ||
    typeof result.status !== "string" ||
    (result.logo_url !== null && typeof result.logo_url !== "string") ||
    (result.google_review_url !== null && typeof result.google_review_url !== "string") ||
    (result.rating !== null && typeof result.rating !== "number")
  ) {
    notFound();
  }

  const request: PublicReviewRequest = {
    id,
    customerName: result.customer_name,
    businessName: result.business_name,
    logoUrl: result.logo_url,
    googleReviewUrl: result.google_review_url,
    status: result.status,
    rating: result.rating,
  };

  return (
    <PublicReviewPage
      initialError={errorValue === "1" ? "We couldn't save your rating. Please try again." : ""}
      initialRating={initialRating}
      initialSubmitted={submittedValue === "1"}
      request={request}
    />
  );
}
