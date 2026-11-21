import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { sendEmail } from "../../../../lib/email-provider";

export const runtime = "nodejs";

type FollowUp = {
  request_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  business_name: string;
};

type CreditSource = "system" | "paid" | null;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function reserveSystemCredit(userId: string): Promise<CreditSource> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("system_email_credits_remaining, credits_remaining")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("The email account profile is unavailable.");

  if (profile.system_email_credits_remaining > 0) {
    const { data: reserved, error: reserveError } = await admin
      .from("profiles")
      .update({ system_email_credits_remaining: profile.system_email_credits_remaining - 1 })
      .eq("id", userId)
      .eq("system_email_credits_remaining", profile.system_email_credits_remaining)
      .select("id")
      .maybeSingle();
    if (reserveError) throw reserveError;
    if (reserved) return "system";
  }

  if ((profile.credits_remaining ?? 0) > 0) {
    const { data: reserved, error: reserveError } = await admin
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("id", userId)
      .eq("credits_remaining", profile.credits_remaining)
      .select("id")
      .maybeSingle();
    if (reserveError) throw reserveError;
    if (reserved) return "paid";
  }
  return null;
}

async function refundCredit(userId: string, source: Exclude<CreditSource, null>) {
  const admin = createAdminClient();
  if (source === "system") {
    const { error } = await admin.rpc("restore_system_email_credit", { p_user_id: userId });
    if (error) throw error;
    return;
  }
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("The email account profile is unavailable.");
  const { error } = await admin
    .from("profiles")
    .update({ credits_remaining: (profile.credits_remaining ?? 0) + 1 })
    .eq("id", userId);
  if (error) throw error;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("Review follow-up delivery is missing NEXT_PUBLIC_SITE_URL.");
    return Response.json({ error: "Follow-up delivery is not configured." }, { status: 503 });
  }

  let origin: string;
  try {
    const site = new URL(siteUrl);
    if (site.protocol !== "https:" && site.hostname !== "localhost") {
      throw new Error("The site URL must use HTTPS.");
    }
    origin = site.origin;
  } catch (error) {
    console.error("NEXT_PUBLIC_SITE_URL is invalid for follow-up emails.", error);
    return Response.json({ error: "Follow-up delivery is not configured correctly." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_due_review_followups", { p_limit: 50 });
  if (error) {
    console.error("Unable to claim due review follow-ups.", error);
    return Response.json({ error: "Follow-up delivery is temporarily unavailable." }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as FollowUp[]) {
    let creditSource: CreditSource = null;
    let emailDelivered = false;
    try {
      const { data: provider, error: providerError } = await admin
        .from("email_provider_credentials")
        .select("user_id")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (providerError) throw providerError;
      if (!provider) {
        creditSource = await reserveSystemCredit(row.user_id);
        if (!creditSource) {
          throw new Error("No system email credits remain for this reminder.");
        }
      }

      const reviewUrl = new URL(`/r/${row.request_id}`, origin).toString();
      await sendEmail({
        userId: row.user_id,
        businessName: row.business_name,
        to: row.customer_email,
        subject: `A gentle reminder from ${row.business_name}`,
        text: `Hi ${row.customer_name},\n\nIf you have a moment, please share your experience with ${row.business_name}:\n${reviewUrl}\n\nThank you.`,
        html: `<p>Hi ${escapeHtml(row.customer_name)},</p><p>If you have a moment, please share your experience with ${escapeHtml(row.business_name)}:</p><p><a href="${escapeHtml(reviewUrl)}">Share your experience</a></p><p>Thank you.</p>`,
      });
      emailDelivered = true;

      const { error: finishError } = await admin.rpc("finish_review_followup", {
        p_request_id: row.request_id,
        p_sent: true,
      });
      if (finishError) throw finishError;
      sent += 1;
    } catch (error) {
      console.error("Unable to send a scheduled review follow-up.", error);
      if (emailDelivered) {
        console.error("The follow-up email was delivered, but its database status could not be confirmed.");
        failed += 1;
        continue;
      }
      if (creditSource) {
        try {
          await refundCredit(row.user_id, creditSource);
        } catch (refundError) {
          console.error("Unable to refund a failed review follow-up.", refundError);
        }
      }
      const { error: finishError } = await admin.rpc("finish_review_followup", {
        p_request_id: row.request_id,
        p_sent: false,
      });
      if (finishError) {
        console.error("Unable to mark a failed review follow-up.", finishError);
      }
      failed += 1;
    }
  }

  return Response.json({ processed: sent + failed, sent, failed });
}
