"use server";

import { createClient } from "../../../lib/supabase/server";
import { isValidEmail } from "../../../lib/review-requests";

const maximumNameLength = 120;
const maximumEmailLength = 254;
const maximumImportRows = 200;

export type ReviewRequestImportRow = {
  name: string;
  email: string;
};

type CreateReviewRequestResult =
  | { ok: true; requestId: string; creditsRemaining: number }
  | { ok: false; message: string };

export async function createReviewRequest(
  customerName: string,
  customerEmail: string,
): Promise<CreateReviewRequestResult> {
  if (
    typeof customerName !== "string" ||
    typeof customerEmail !== "string"
  ) {
    return { ok: false, message: "Enter the customer's name and email address." };
  }

  const normalizedName = customerName.trim();
  const normalizedEmail = customerEmail.trim();

  if (!normalizedName || normalizedName.length > maximumNameLength) {
    return { ok: false, message: "Enter a customer name of 1 to 120 characters." };
  }
  if (!isValidEmail(normalizedEmail) || normalizedEmail.length > maximumEmailLength) {
    return { ok: false, message: "Enter a valid customer email address of up to 254 characters." };
  }

  const authentication = await getAuthenticatedSupabase();
  if (!authentication.ok) {
    return authentication;
  }

  let data: unknown;
  try {
    const result = await authentication.supabase.rpc("create_review_request", {
      p_customer_name: normalizedName,
      p_customer_email: normalizedEmail,
    });

    if (result.error) {
      console.error("Unable to create a review request.", result.error);
      return { ok: false, message: result.error.message };
    }

    data = result.data;
  } catch (error) {
    console.error("Unable to create a review request.", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const result = Array.isArray(data) ? data[0] : null;
  const requestId = isRecord(result)
    ? result.request_id ?? result.new_request_id
    : undefined;
  const creditsRemaining = isRecord(result)
    ? result.credits_remaining ?? result.remaining_credits
    : undefined;
  if (
    typeof requestId !== "string" ||
    typeof creditsRemaining !== "number" ||
    !Number.isInteger(creditsRemaining)
  ) {
    console.error("Review-request creation returned an invalid result.", data);
    return {
      ok: false,
      message: "The request may have been created, but we couldn't confirm its details. Refresh the page.",
    };
  }

  return {
    ok: true,
    requestId,
    creditsRemaining,
  };
}

type AuthenticatedSupabaseResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; message: string };

async function getAuthenticatedSupabase(): Promise<AuthenticatedSupabaseResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure the authenticated review-request client.", error);
    return {
      ok: false,
      message: "Creating review requests is unavailable. Please try again later.",
    };
  }

  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    console.error("Unable to verify user for review-request creation.", error);
    return { ok: false, message: "We couldn't verify your account. Please sign in again." };
  }
  if (typeof data?.claims.sub !== "string") {
    return { ok: false, message: "Please sign in again before creating a request." };
  }

  return { ok: true, supabase };
}

function handleRequestError(
  error: { code?: string; message: string },
  logMessage: string,
): { ok: false; message: string } {
  if (error.code === "P0001" && error.message === "No active credit entitlement.") {
    return { ok: false, message: "Activate a plan before creating review requests." };
  }
  if (error.code === "P0001" && error.message.startsWith("Insufficient credits:")) {
    return { ok: false, message: error.message };
  }
  if (error.code === "P0001" && error.message === "No review-request credits remain.") {
    return { ok: false, message: "You have no credits available. Activate or top up a plan to continue." };
  }

  console.error(logMessage, error);
  return { ok: false, message: "We couldn't create the request right now. Please try again." };
}

type ImportReviewRequestsResult =
  | {
      ok: true;
      importedCount: number;
      creditsRemaining: number;
      requestIds: string[];
    }
  | { ok: false; message: string };

export async function importReviewRequests(
  rows: ReviewRequestImportRow[],
): Promise<ImportReviewRequestsResult> {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > maximumImportRows) {
    return {
      ok: false,
      message: `Import between 1 and ${maximumImportRows} valid customers at a time.`,
    };
  }

  const normalizedRows: ReviewRequestImportRow[] = [];
  for (const row of rows) {
    if (
      !row ||
      typeof row.name !== "string" ||
      typeof row.email !== "string"
    ) {
      return { ok: false, message: "The import contains an invalid customer row. Check the file and try again." };
    }

    const name = row.name.trim();
    const email = row.email.trim();
    if (
      !name ||
      name.length > maximumNameLength ||
      !isValidEmail(email) ||
      email.length > maximumEmailLength
    ) {
      return { ok: false, message: "The import contains an invalid customer row. Check the file and try again." };
    }
    normalizedRows.push({ name, email });
  }

  const authentication = await getAuthenticatedSupabase();
  if (!authentication.ok) {
    return authentication;
  }

  const { data, error } = await authentication.supabase.rpc("create_review_requests", {
    p_requests: normalizedRows,
  });
  if (error) {
    return handleRequestError(error, "Unable to import review requests.");
  }

  const result = Array.isArray(data) ? data[0] : null;
  const importedCount = isRecord(result)
    ? result.inserted_count ?? result.request_count
    : undefined;
  const creditsRemaining = isRecord(result)
    ? result.available_credits ?? result.remaining_credits ?? result.credits_remaining
    : undefined;
  const requestIds = isRecord(result) ? result.request_ids : undefined;
  const validRequestIds = Array.isArray(requestIds)
    ? requestIds.filter((requestId): requestId is string => typeof requestId === "string")
    : [];
  if (
    typeof importedCount !== "number" ||
    !Number.isInteger(importedCount) ||
    importedCount !== normalizedRows.length ||
    typeof creditsRemaining !== "number" ||
    !Number.isInteger(creditsRemaining) ||
    validRequestIds.length !== normalizedRows.length
  ) {
    console.error("Bulk review-request creation returned an invalid result.", data);
    return {
      ok: false,
      message: "The import may have completed, but we couldn't confirm your updated balance. Refresh the page.",
    };
  }

  return {
    ok: true,
    importedCount,
    creditsRemaining,
    requestIds: validRequestIds,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
