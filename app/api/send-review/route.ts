import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { sendEmail } from "../../../lib/email-provider";
import { verifyEmailAddress } from "../../../lib/emailVerifier";

export const runtime = "nodejs";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ratingWidgetToken = /\{(?:Star_Rating_Widget|Star_Rating_Links|Google_Review_Link)\}/g;

const defaultEmailSubject = "A quick favor, {Customer_Name}?";
const defaultEmailBody = `Hi {Customer_Name},

Thanks for choosing {Business_Name}. If you have a moment, would you share how your visit went? Your feedback helps our team and other people in the community.

{Star_Rating_Widget}

Thank you,
The {Business_Name} team`;

type SendReviewPayload = {
  requestId?: unknown;
};

export async function POST(request: Request) {
  let payload: SendReviewPayload;
  try {
    payload = await request.json() as SendReviewPayload;
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  if (typeof payload?.requestId !== "string" || !requestIdPattern.test(payload.requestId)) {
    return Response.json({ error: "A valid review request ID is required." }, { status: 400 });
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure authentication for review email.", error);
    return Response.json({ error: "Email sending is unavailable right now." }, { status: 503 });
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error("Unable to verify user for review email.", claimsError);
    return Response.json({ error: "We couldn't verify your account. Please sign in again." }, { status: 401 });
  }
  const userId = claimsData?.claims.sub;
  if (typeof userId !== "string") {
    return Response.json({ error: "Please sign in before sending a review email." }, { status: 401 });
  }

  const { data: reviewRequest, error: requestError } = await supabase
    .from("review_requests")
    .select("id, business_id, customer_name, customer_email, status, email_status")
    .eq("id", payload.requestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (requestError) {
    console.error("Unable to load review request for email.", requestError);
    return Response.json({ error: "We couldn't load this review request." }, { status: 500 });
  }
  if (!reviewRequest) {
    return Response.json({ error: "Review request not found." }, { status: 404 });
  }
  if (
    reviewRequest.status !== "queued" ||
    !["queued", "failed"].includes(reviewRequest.email_status)
  ) {
    return Response.json({ error: "This review request has already been sent or completed." }, { status: 409 });
  }
  if (!reviewRequest.customer_email) {
    return Response.json({ error: "This review request does not contain a valid email address." }, { status: 400 });
  }
  const emailVerification = await verifyEmailAddress(reviewRequest.customer_email);
  if (!emailVerification.isValid) {
    return Response.json({ error: emailVerification.reason }, { status: 400 });
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("business_name, email_subject, email_body")
    .eq("id", reviewRequest.business_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (businessError) {
    console.error("Unable to load the business for review email.", businessError);
    return Response.json({ error: "We couldn't load your email settings." }, { status: 500 });
  }
  if (!business) {
    return Response.json({ error: "The business for this review request is unavailable." }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("Review email is not configured. Set NEXT_PUBLIC_SITE_URL.");
    return Response.json({ error: "Email sending is not configured. Please contact support." }, { status: 503 });
  }

  let siteOrigin: string;
  try {
    const parsedSiteUrl = new URL(siteUrl);
    if (
      (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") ||
      parsedSiteUrl.username ||
      parsedSiteUrl.password
    ) {
      throw new Error("Site URL must be HTTPS (except localhost).");
    }
    siteOrigin = parsedSiteUrl.origin;
  } catch (error) {
    console.error("NEXT_PUBLIC_SITE_URL is invalid for review emails.", error);
    return Response.json({ error: "Email sending is not configured correctly." }, { status: 503 });
  }

  const businessName = business.business_name.trim() || "Your business";
  const subjectTemplate = business.email_subject?.trim() || defaultEmailSubject;
  const bodyTemplate = business.email_body?.trim() || defaultEmailBody;
  const subject = renderTemplate(subjectTemplate, reviewRequest.customer_name, businessName)
    .replace(/[\r\n]+/g, " ")
    .trim();
  const body = renderTemplate(bodyTemplate, reviewRequest.customer_name, businessName);
  const ratingLinks = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    url: new URL(`/review/${reviewRequest.id}?rating=${rating}`, siteOrigin).toString(),
  }));
  const text = body.replace(ratingWidgetToken, () =>
    ratingLinks.map(({ rating, url }) => `${rating} stars: ${url}`).join("\n"),
  );
  const html = body
    .split(ratingWidgetToken)
    .map((part) => escapeHtml(part).replace(/\r?\n/g, "<br>"))
    .join(
      `<div style="margin:16px 0">${ratingLinks
        .map(({ rating, url }) =>
          `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border-radius:6px;background:#c7f36b;color:#171a11;text-decoration:none;font-weight:600">${rating} ★</a>`,
        )
        .join("")}</div>`,
    );
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Unable to configure Supabase admin for review email.", error);
    return Response.json({ error: "Email sending is unavailable right now." }, { status: 503 });
  }

  const { data: reservedCredits, error: reserveError } = await admin.rpc(
    "reserve_review_email_credit",
    { p_request_id: reviewRequest.id },
  );
  if (reserveError) {
    if (
      reserveError.code === "P0001" &&
      reserveError.message === "No review-request credits remain."
    ) {
      return Response.json(
        { error: "You have no credits available. Activate or top up a plan to continue." },
        { status: 402 },
      );
    }
    if (reserveError.code === "P0001") {
      return Response.json({ error: reserveError.message }, { status: 409 });
    }
    console.error("Unable to reserve a credit for review email.", reserveError);
    return Response.json({ error: "We couldn't prepare this email for delivery." }, { status: 500 });
  }
  if (typeof reservedCredits !== "number" || !Number.isInteger(reservedCredits)) {
    console.error("Email credit reservation returned an invalid balance.", reservedCredits);
    return Response.json(
      { error: "The email wasn't sent because its credit reservation couldn't be confirmed." },
      { status: 500 },
    );
  }

  try {
    await sendEmail({
      userId,
      businessName,
      to: reviewRequest.customer_email,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${html}</div>`,
    });
  } catch (error) {
    console.error("Email provider failed while sending a review email.", error);
    const { error: refundError } = await admin.rpc("finalize_review_email_dispatch", {
      p_request_id: reviewRequest.id,
      p_sent: false,
    });
    if (refundError) {
      console.error("Unable to refund credit after review email delivery failed.", refundError);
      return Response.json(
        { error: "The email wasn't sent, and we couldn't confirm the credit refund. Please contact support." },
        { status: 500 },
      );
    }
    return Response.json({ error: "We couldn't send the email. Please try again." }, { status: 502 });
  }

  const { data: creditsRemaining, error: finalizeError } = await admin.rpc(
    "finalize_review_email_dispatch",
    { p_request_id: reviewRequest.id, p_sent: true },
  );

  if (finalizeError || typeof creditsRemaining !== "number" || !Number.isInteger(creditsRemaining)) {
    console.error("Email sent, but its delivery status could not be confirmed.", finalizeError ?? creditsRemaining);
    return Response.json(
      { error: "The email was sent, but we couldn't confirm its status or credit balance. Please contact support." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, status: "sent", creditsRemaining });
}

function renderTemplate(template: string, customerName: string, businessName: string) {
  return template
    .replaceAll("{Customer_Name}", customerName)
    .replaceAll("{Business_Name}", businessName);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
