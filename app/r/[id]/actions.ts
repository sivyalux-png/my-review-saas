"use server";

import { createClient } from "../../../lib/supabase/server";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SubmitRatingResult =
  | { ok: true; googleReviewUrl: string | null }
  | { ok: false; message: string };

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

export async function submitPublicReview(
  requestId: string,
  rating: number,
  feedback: string,
): Promise<SubmitRatingResult> {
  if (
    typeof requestId !== "string" ||
    !requestIdPattern.test(requestId) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof feedback !== "string" ||
    feedback.trim().length > 2000 ||
    (rating <= 3 && !feedback.trim())
  ) {
    return { ok: false, message: "Please enter a rating and valid feedback before submitting." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure the public review client.", error);
    return { ok: false, message: "We couldn't submit your feedback right now. Please try again." };
  }

  const { data, error } = await supabase.rpc("submit_public_review_response", {
    p_request_id: requestId,
    p_rating: rating,
    p_feedback: feedback.trim() || null,
  });

  if (error) {
    if (error.code === "P0001") {
      return {
        ok: false,
        message: "This review link has already been used or is no longer available.",
      };
    }

    console.error("Unable to save public review response.", error);
    return { ok: false, message: "We couldn't submit your feedback right now. Please try again." };
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result || (result.google_review_url !== null && typeof result.google_review_url !== "string")) {
    console.error("Public review submission returned an invalid result.", data);
    return {
      ok: false,
      message: "Your response may have been saved, but we couldn't confirm it. Please contact the business.",
    };
  }

  return {
    ok: true,
    googleReviewUrl: safeGoogleReviewUrl(result.google_review_url),
  };
}
