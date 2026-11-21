"use server";

import { createClient } from "../../../lib/supabase/server";

type SubmitBusinessReviewResult =
  | { ok: true; googleReviewUrl: string | null; smartReviewGating: boolean }
  | { ok: false; message: string };

export async function submitBusinessPublicReview(
  businessId: string,
  rating: number,
  customerName: string,
  customerEmail: string,
  feedback: string,
): Promise<SubmitBusinessReviewResult> {
  if (
    typeof businessId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(businessId) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof customerName !== "string" ||
    customerName.trim().length < 1 ||
    customerName.trim().length > 120 ||
    typeof customerEmail !== "string" ||
    customerEmail.trim().length > 254 ||
    typeof feedback !== "string" ||
    feedback.trim().length > 2000
  ) {
    return { ok: false, message: "Please enter a rating and valid feedback before submitting." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_business_public_review", {
    p_business_id: businessId,
    p_rating: rating,
    p_customer_name: customerName.trim(),
    p_customer_email: customerEmail.trim() || null,
    p_feedback: feedback.trim() || null,
  });
  if (error) {
    if (error.code === "P0001") {
      return { ok: false, message: "This review page is unavailable." };
    }
    console.error("Unable to save public business feedback.", error);
    return { ok: false, message: "We couldn't submit your feedback right now. Please try again." };
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (
    !result ||
    (result.google_review_url !== null && typeof result.google_review_url !== "string") ||
    typeof result.smart_review_gating !== "boolean"
  ) {
    console.error("Public business review submission returned an invalid result.", data);
    return {
      ok: false,
      message: "Your response may have been saved, but we couldn't confirm it. Please try again later.",
    };
  }

  return {
    ok: true,
    googleReviewUrl: result.google_review_url,
    smartReviewGating: result.smart_review_gating,
  };
}
