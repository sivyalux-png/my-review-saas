import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    .select("id, customer_name, contact, status")
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
  if (reviewRequest.status !== "queued") {
    return Response.json({ error: "This review request has already been sent or completed." }, { status: 409 });
  }
  if (!emailPattern.test(reviewRequest.contact)) {
    return Response.json({ error: "This review request does not contain a valid email address." }, { status: 400 });
  }

  const [settingsResult, profileResult] = await Promise.all([
    supabase
      .from("settings")
      .select("business_name, email_subject, email_body")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("business_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (settingsResult.error || profileResult.error) {
    console.error("Unable to load review email settings.", settingsResult.error ?? profileResult.error);
    return Response.json({ error: "We couldn't load your email settings." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const configuredFrom = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !configuredFrom || !siteUrl) {
    console.error("Review email is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and NEXT_PUBLIC_SITE_URL.");
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

  const businessName =
    settingsResult.data?.business_name?.trim() ||
    profileResult.data?.business_name?.trim() ||
    "Your business";
  const from = formatSender(businessName, configuredFrom);
  if (!from) {
    console.error("RESEND_FROM_EMAIL must be a valid address on a verified Resend sending domain.");
    return Response.json({ error: "Email sending is not configured correctly." }, { status: 503 });
  }
  const subjectTemplate = settingsResult.data?.email_subject?.trim() || defaultEmailSubject;
  const bodyTemplate = settingsResult.data?.email_body?.trim() || defaultEmailBody;
  const subject = renderTemplate(subjectTemplate, reviewRequest.customer_name, businessName)
    .replace(/[\r\n]+/g, " ")
    .trim();
  const body = renderTemplate(bodyTemplate, reviewRequest.customer_name, businessName);
  const ratingLinks = [1, 2, 3, 4, 5].map((rating) => {
    const path = rating >= 4
      ? `/r/${reviewRequest.id}/google?rating=${rating}`
      : `/r/${reviewRequest.id}?rating=${rating}`;
    return { rating, url: new URL(path, siteOrigin).toString() };
  });
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

  let resendResponse: Response;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [reviewRequest.contact],
        subject,
        text,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${html}</div>`,
      }),
    });
  } catch (error) {
    console.error("Resend request failed while sending a review email.", error);
    return Response.json({ error: "We couldn't send the email. Please try again." }, { status: 502 });
  }

  if (!resendResponse.ok) {
    console.error("Resend rejected a review email.", resendResponse.status);
    return Response.json({ error: "We couldn't send the email. Please check your email configuration." }, { status: 502 });
  }

  const { data: updatedRequest, error: updateError } = await admin
    .from("review_requests")
    .update({ status: "sent" })
    .eq("id", reviewRequest.id)
    .eq("user_id", userId)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (updateError || !updatedRequest) {
    console.error("Email sent, but the review request status could not be updated.", updateError);
    return Response.json(
      { error: "The email was sent, but we couldn't update the request status. Please contact support." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, status: "sent" });
}

function renderTemplate(template: string, customerName: string, businessName: string) {
  return template
    .replaceAll("{Customer_Name}", customerName)
    .replaceAll("{Business_Name}", businessName);
}

function formatSender(businessName: string, configuredFrom: string) {
  if (/[\r\n]/.test(configuredFrom)) {
    return null;
  }

  const match = /^(?:[^<>]*<([^<>]+)>|([^<>]+))$/.exec(configuredFrom.trim());
  const address = (match?.[1] ?? match?.[2] ?? "").trim();
  if (!emailPattern.test(address)) {
    return null;
  }

  const displayName = businessName.replace(/[\r\n]+/g, " ").trim() || "Your business";
  const escapedName = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escapedName}" <${address}>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
