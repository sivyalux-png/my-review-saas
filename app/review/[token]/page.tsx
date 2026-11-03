import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import PrivateFeedbackForm from "./private-feedback-form";

export const metadata: Metadata = {
  title: "Share your experience",
  description: "Rate your recent experience and share private feedback with the business.",
};

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeGoogleReviewUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isGoogleDomain =
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "g.page" ||
      hostname === "maps.app.goo.gl";
    return url.protocol === "https:" && isGoogleDomain ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!requestIdPattern.test(token)) notFound();

  const ratingValue = Array.isArray(query.rating) ? query.rating[0] : query.rating;
  const initialRating = ratingValue && /^[1-5]$/.test(ratingValue)
    ? Number(ratingValue)
    : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_review_request", {
    p_request_id: token,
  });
  if (error) {
    console.error("Unable to load review request.", error);
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

  const googleReviewUrl = safeGoogleReviewUrl(result.google_review_url);
  let submissionError = "";
  if (initialRating !== null && initialRating >= 4) {
    if (result.status === "completed" && result.rating === initialRating) {
      if (googleReviewUrl) redirect(googleReviewUrl);
    } else if (result.status === "queued" || result.status === "sent") {
      const { error: submitError } = await supabase.rpc("submit_public_review_response", {
        p_request_id: token,
        p_rating: initialRating,
        p_feedback: null,
      });

      if (submitError) {
        console.error("Unable to record high review rating before redirect.", submitError);
        submissionError = "We couldn't save your rating. Please try again.";
      } else if (googleReviewUrl) {
        redirect(googleReviewUrl);
      } else {
        redirect(`/review/${token}?submitted=1&rating=${initialRating}`);
      }
    }
  }

  const submittedValue = Array.isArray(query.submitted) ? query.submitted[0] : query.submitted;
  const errorMessage = Array.isArray(query.error) ? query.error[0] : query.error;
  const isSubmitted =
    result.status === "private_feedback_submitted" ||
    result.status === "completed" ||
    submittedValue === "1";

  return (
    <PrivateFeedbackForm
      businessName={result.business_name}
      customerName={result.customer_name}
      initialError={
        submissionError ||
        (errorMessage === "1" ? "We couldn't save your rating. Please try again." : "")
      }
      initialRating={initialRating ?? result.rating}
      initialSubmitted={isSubmitted}
      logoUrl={result.logo_url}
      token={token}
    />
  );
}
