import { EventName, NodeRuntime, Webhooks } from "@paddle/paddle-node-sdk";
import { NextResponse } from "next/server";
import { getEmailCreditPack } from "../../../../lib/email-credit-packs";
import { createAdminClient } from "../../../../lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

export const runtime = "nodejs";

NodeRuntime.initialize();

const paddleWebhooks = new Webhooks();

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Paddle signature." }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error("Unable to read Paddle webhook request body.", error);
    return NextResponse.json({ error: "Unable to read webhook request." }, { status: 400 });
  }

  let event;
  try {
    event = await paddleWebhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid Paddle webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.eventType !== EventName.TransactionCompleted) {
    return NextResponse.json({ received: true });
  }

  const transaction = event.data;
  const purchaseId = transaction.customData?.email_credit_purchase_id;
  const items = transaction.items;
  if (
    transaction.status !== "completed" ||
    typeof purchaseId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId) ||
    items.length !== 1 ||
    items[0].quantity !== 1
  ) {
    return NextResponse.json(
      { error: "Invalid email credit transaction details." },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Unable to parse verified Paddle transaction payload.", error);
    return NextResponse.json({ error: "Invalid Paddle event." }, { status: 400 });
  }

  const rawData = isRecord(payload) ? payload.data : undefined;
  const rawItems = isRecord(rawData) && Array.isArray(rawData.items) ? rawData.items : [];
  const priceId = getTransactionPrice(rawItems[0]) ?? items[0].price?.id;
  if (!priceId || !getEmailCreditPack(priceId)) {
    return NextResponse.json(
      { error: "Transaction contains an unsupported price." },
      { status: 400 },
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Unable to configure Paddle webhook database access.", error);
    return NextResponse.json(
      { error: "Webhook fulfillment is unavailable." },
      { status: 500 },
    );
  }

  try {
    const { error: fulfillmentError } = await admin.rpc("fulfill_email_credit_purchase", {
      p_purchase_id: purchaseId,
      p_transaction_id: transaction.id,
      p_price_id: priceId,
    });

    if (fulfillmentError) {
      console.error("Unable to fulfill Paddle email credit transaction.", {
        transactionId: transaction.id,
        error: fulfillmentError,
      });
      return NextResponse.json({ error: "Unable to fulfill transaction." }, { status: 500 });
    }
  } catch (error) {
    console.error("Paddle email credit fulfillment request failed.", {
      transactionId: transaction.id,
      error,
    });
    return NextResponse.json({ error: "Unable to fulfill transaction." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
