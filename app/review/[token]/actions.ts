"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maximumFeedbackLength = 2000;

type SubmitPrivateFeedbackInput = {
  token: string;
  rating: number;
  feedbackText: string;
};

export type SubmitPrivateFeedbackResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitPrivateFeedback(
  input: SubmitPrivateFeedbackInput,
): Promise<SubmitPrivateFeedbackResult> {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      message: "Please choose a rating and enter valid feedback.",
    };
  }

  const { token, rating, feedbackText } = input;
  if (
    typeof token !== "string" ||
    !requestIdPattern.test(token) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 3 ||
    typeof feedbackText !== "string" ||
    !feedbackText.trim() ||
    feedbackText.trim().length > maximumFeedbackLength
  ) {
    return {
      ok: false,
      message: "Please choose a rating and enter feedback of up to 2,000 characters.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure the private feedback client.", error);
    return {
      ok: false,
      message: "We couldn't submit your feedback right now. Please try again.",
    };
  }

  const { error } = await supabase.rpc("submit_public_review_response", {
    p_request_id: token,
    p_rating: rating,
    p_feedback: feedbackText.trim(),
  });

  if (error) {
    if (error.code === "P0001") {
      return {
        ok: false,
        message: "This review link has already been used or is no longer available.",
      };
    }

    console.error("Unable to save private feedback.", error);
    return {
      ok: false,
      message: "We couldn't submit your feedback right now. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
