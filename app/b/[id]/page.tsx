import { notFound } from "next/navigation";
import PublicReviewPage, { type PublicReviewRequest } from "../../r/[id]/public-review-page";
import { createClient } from "../../../lib/supabase/server";

const businessIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function BusinessReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!businessIdPattern.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_business_review", {
    p_business_id: id,
  });
  if (error) {
    console.error("Unable to load public business review page.", error);
    throw new Error("Unable to load this review page.");
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (
    !result ||
    typeof result.business_name !== "string" ||
    (result.logo_url !== null && typeof result.logo_url !== "string") ||
    (result.google_review_url !== null && typeof result.google_review_url !== "string") ||
    typeof result.smart_review_gating !== "boolean" ||
    typeof result.show_branding !== "boolean"
  ) {
    notFound();
  }

  const request: PublicReviewRequest = {
    id,
    customerName: "",
    businessName: result.business_name,
    logoUrl: result.logo_url,
    googleReviewUrl: result.google_review_url,
    status: "queued",
    rating: null,
    smartReviewGating: result.smart_review_gating,
    showBranding: result.show_branding,
  };

  return (
    <PublicReviewPage
      initialError=""
      initialRating={null}
      initialSubmitted={false}
      request={request}
      submissionMode="business"
    />
  );
}
