import { createHmac, timingSafeEqual } from "node:crypto";
import { getEmailCreditPack } from "../../../../lib/email-credit-packs";
import { createAdminClient } from "../../../../lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
  const fields = signatureHeader.split(";").map((field) => field.split("=", 2));
  const timestamp = fields.find(([key]) => key === "ts")?.[1];
  const signatures = fields
    .filter(([key]) => key === "h1")
    .map(([, value]) => value)
    .filter((value): value is string => typeof value === "string");

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`, "utf8")
    .digest();

  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return false;
    }

    return timingSafeEqual(Buffer.from(signature, "hex"), expected);
  });
}

function getTransactionPrice(item: unknown) {
  if (!isRecord(item)) {
    return undefined;
  }

  if (typeof item.price_id === "string") {
    return item.price_id;
  }

  if (isRecord(item.price) && typeof item.price.id === "string") {
    return item.price.id;
  }

  return undefined;
}

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Paddle webhook is not configured. Set PADDLE_WEBHOOK_SECRET.");
    return Response.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  if (!signature || !isValidSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid Paddle signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(payload) || typeof payload.event_type !== "string") {
    return Response.json({ error: "Invalid Paddle event." }, { status: 400 });
  }

  if (payload.event_type !== "transaction.completed") {
    return Response.json({ received: true });
  }

  const data = payload.data;
  if (!isRecord(data) || typeof data.id !== "string" || data.status !== "completed") {
    return Response.json({ error: "Invalid completed transaction." }, { status: 400 });
  }

  const customData = data.custom_data;
  const purchaseId = isRecord(customData)
    ? customData.email_credit_purchase_id
    : undefined;
  const items = data.items;
  if (
    typeof purchaseId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId) ||
    !Array.isArray(items) ||
    items.length !== 1 ||
    !isRecord(items[0]) ||
    items[0].quantity !== 1
  ) {
    return Response.json({ error: "Invalid email credit transaction details." }, { status: 400 });
  }

  const priceId = getTransactionPrice(items[0]);
  if (!priceId || !getEmailCreditPack(priceId)) {
    return Response.json({ error: "Transaction contains an unsupported price." }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Unable to configure Paddle webhook database access.", error);
    return Response.json({ error: "Webhook fulfillment is unavailable." }, { status: 500 });
  }

  const { error: fulfillmentError } = await admin.rpc("fulfill_email_credit_purchase", {
    p_purchase_id: purchaseId,
    p_transaction_id: data.id,
    p_price_id: priceId,
  });

  if (fulfillmentError) {
    console.error("Unable to fulfill Paddle email credit transaction.", {
      transactionId: data.id,
      error: fulfillmentError,
    });
    return Response.json({ error: "Unable to fulfill transaction." }, { status: 500 });
  }

  return Response.json({ received: true });
}
