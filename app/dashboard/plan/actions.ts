"use server";

import { getLicenseKeyHashes, normalizeLicenseKey } from "../../../lib/supabase/licenses";
import { createClient } from "../../../lib/supabase/server";

const licenseKeyPattern = /^[A-Z0-9][A-Z0-9-]{9,63}$/;
const invalidLicenseMessage =
  "License key is invalid, expired, or already redeemed.";

const emailCreditVariantIds = new Set([2307965, 2308009, 2308025]);

export async function createTestCreditPackCheckout(variantId: number) {
  if (!emailCreditVariantIds.has(variantId)) {
    return {
      ok: false as const,
      message: "That email credit package is not available.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure the authenticated checkout client.", error);
    return {
      ok: false as const,
      message: "Checkout is unavailable. Please try again later.",
    };
  }

  const { data: claimsData, error: userError } = await supabase.auth.getClaims();
  if (userError) {
    console.error("Unable to verify user for checkout.", userError);
    return {
      ok: false as const,
      message: "We couldn't verify your account. Please sign in again.",
    };
  }

  if (typeof claimsData?.claims.sub !== "string") {
    return {
      ok: false as const,
      message: "Please sign in again before starting checkout.",
    };
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!apiKey || !storeId) {
    console.error("Lemon Squeezy test checkout is missing server configuration.");
    return {
      ok: false as const,
      message: "Test checkout is not configured. Please contact support.",
    };
  }

  let response: Response;
  try {
    response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            test_mode: true,
            checkout_options: { embed: true },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: String(variantId) } },
          },
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Unable to create Lemon Squeezy test checkout.", error);
    return {
      ok: false as const,
      message: "We couldn't reach Lemon Squeezy. Please try again.",
    };
  }

  if (!response.ok) {
    console.error("Lemon Squeezy rejected test checkout creation.", {
      status: response.status,
      statusText: response.statusText,
    });
    return {
      ok: false as const,
      message: `Lemon Squeezy couldn't create the test checkout (HTTP ${response.status}). Verify the store and variant are available in test mode.`,
    };
  }

  let checkoutUrl: unknown;
  try {
    const checkout = (await response.json()) as {
      data?: { attributes?: { url?: unknown } };
    };
    checkoutUrl = checkout.data?.attributes?.url;
  } catch (error) {
    console.error("Lemon Squeezy returned an invalid checkout response.", error);
    return {
      ok: false as const,
      message: "Lemon Squeezy returned an invalid checkout. Please try again.",
    };
  }

  if (typeof checkoutUrl !== "string") {
    console.error("Lemon Squeezy checkout response did not include a URL.");
    return {
      ok: false as const,
      message: "Lemon Squeezy returned an invalid checkout. Please try again.",
    };
  }

  let parsedCheckoutUrl: URL;
  try {
    parsedCheckoutUrl = new URL(checkoutUrl);
  } catch (error) {
    console.error("Lemon Squeezy returned an invalid checkout URL.", error);
    return {
      ok: false as const,
      message: "Lemon Squeezy returned an invalid checkout. Please try again.",
    };
  }

  if (
    parsedCheckoutUrl.protocol !== "https:" ||
    !parsedCheckoutUrl.hostname.endsWith(".lemonsqueezy.com")
  ) {
    console.error("Lemon Squeezy returned a checkout URL on an unexpected domain.");
    return {
      ok: false as const,
      message: "Lemon Squeezy returned an invalid checkout. Please try again.",
    };
  }

  return { ok: true as const, url: checkoutUrl };
}

export async function redeemLicenseKey(licenseKey: string) {
  const normalizedKey = normalizeLicenseKey(licenseKey);
  if (!licenseKeyPattern.test(normalizedKey)) {
    return {
      ok: false as const,
      message: "Enter a license key with at least 10 letters, numbers, or hyphens.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Unable to configure the authenticated license client.", error);
    return {
      ok: false as const,
      message: "License redemption is unavailable. Please try again later.",
    };
  }

  const { data: claimsData, error: userError } = await supabase.auth.getClaims();

  if (userError) {
    console.error("Unable to verify user for license redemption.", userError);
    return {
      ok: false as const,
      message: "We couldn't verify your account. Please sign in again.",
    };
  }

  const userId = claimsData?.claims.sub;
  if (typeof userId !== "string") {
    return {
      ok: false as const,
      message: "Please sign in again before redeeming a license.",
    };
  }

  let keyHashes: string[];
  try {
    keyHashes = getLicenseKeyHashes(normalizedKey);
  } catch (error) {
    console.error("License redemption hashing is not configured.", error);
    return {
      ok: false as const,
      message: "License redemption is not configured. Please contact support.",
    };
  }

  let redeemedTier: string | null = null;
  for (const keyHash of keyHashes) {
    const { data, error } = await supabase.rpc("redeem_license", {
      p_key_hash: keyHash,
    });

    if (!error) {
      if (typeof data !== "string") {
        console.error("License redemption returned no tier.");
        return {
          ok: false as const,
          message:
            "We couldn't confirm your updated plan. Refresh the page or contact support.",
        };
      }
      redeemedTier = data;
      break;
    }

    if (error.code === "P0001" && error.message === invalidLicenseMessage) {
      continue;
    }

    console.error("Unable to redeem license.", error);
    return {
      ok: false as const,
      message:
        error.code === "22023"
          ? "This license tier is not configured. Please contact support."
          : "We couldn't redeem your license right now. Please try again or contact support.",
    };
  }

  if (!redeemedTier) {
    return {
      ok: false as const,
      message: invalidLicenseMessage,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_tier, monthly_credit_limit, credits_remaining")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    if (profileError) {
      console.error("License redeemed but updated entitlements could not be loaded.", profileError);
    } else {
      console.error("License redeemed but the user profile was not found.");
    }
    return {
      ok: false as const,
      message:
        "Your license was redeemed, but we couldn't load the updated balance. Refresh the page; contact support if it still doesn't appear.",
    };
  }

  if (
    profile.plan_tier === null ||
    profile.monthly_credit_limit === null ||
    profile.credits_remaining === null
  ) {
    console.error("License redeemed but the profile has incomplete entitlement data.");
    return {
      ok: false as const,
      message:
        "Your license was redeemed, but your plan details are incomplete. Please contact support.",
    };
  }

  return {
    ok: true as const,
    message: `License redeemed. Your ${profile.plan_tier} plan is now active.`,
    entitlement: {
      planTier: profile.plan_tier,
      monthlyCreditLimit: profile.monthly_credit_limit,
      creditsRemaining: profile.credits_remaining,
    },
  };
}
