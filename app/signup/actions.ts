"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";
import { getSupabaseConfig } from "../../lib/supabase/config";
import {
  getLicenseKeyHashes,
  normalizeLicenseKey,
  pendingLicenseCookieName,
} from "../../lib/supabase/licenses";

type SignupState = {
  error?: string;
  notice?: string;
};

const licenseKeyPattern = /^[A-Z0-9][A-Z0-9-]{9,63}$/;

export async function signUp(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const fullName = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("business") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const licenseKey = normalizeLicenseKey(
    String(formData.get("licenseCode") ?? ""),
  );

  if (
    fullName.length < 1 ||
    fullName.length > 120 ||
    businessName.length < 1 ||
    businessName.length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    !licenseKeyPattern.test(licenseKey)
  ) {
    return { error: "Check your details and enter a valid license key." };
  }

  let licenseHashes: string[];
  let admin: ReturnType<typeof createAdminClient>;
  try {
    licenseHashes = getLicenseKeyHashes(licenseKey);
    admin = createAdminClient();
  } catch (error) {
    console.error("Signup license service is not configured.", error);
    return { error: "Signup is not configured correctly. Please contact support." };
  }
  const { data: license, error: licenseLookupError } = await admin
    .from("licenses")
    .select("key_hash, expires_at")
    .in("key_hash", licenseHashes)
    .eq("status", "available")
    .maybeSingle();

  if (licenseLookupError) {
    console.error("Unable to look up signup license.", licenseLookupError);
    return { error: "We couldn't verify your license right now. Please try again." };
  }

  if (
    !license ||
    (license.expires_at !== null &&
      new Date(license.expires_at).getTime() <= Date.now())
  ) {
    return { error: "This license key is invalid, expired, or already redeemed." };
  }

  const licenseHash = license.key_hash;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let callbackUrl: string;

  try {
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is not set.");
    }
    const parsedSiteUrl = new URL(siteUrl);
    if (
      parsedSiteUrl.protocol !== "https:" &&
      parsedSiteUrl.hostname !== "localhost" &&
      parsedSiteUrl.hostname !== "127.0.0.1"
    ) {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside localhost.");
    }
    callbackUrl = new URL("/auth/callback", parsedSiteUrl).toString();
  } catch (error) {
    console.error("Invalid signup site URL configuration.", error);
    return { error: "Signup is not configured correctly. Please contact support." };
  }

  const cookieStore = await cookies();
  cookieStore.delete(pendingLicenseCookieName);
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        business_name: businessName,
      },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user || data.user.identities?.length === 0) {
    return { error: "An account with this email may already exist. Try signing in." };
  }

  if (data.session) {
    const { error: redeemError } = await supabase.rpc("redeem_license", {
      p_key_hash: licenseHash,
    });

    if (redeemError) {
      console.error("Unable to redeem signup license.", redeemError);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Unable to sign out after license redemption failed.", signOutError);
      }
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(
        data.user.id,
      );
      if (deleteUserError) {
        console.error("Unable to remove signup after license redemption failed.", deleteUserError);
      }
      return {
        error: "Your account was created, but this license could not be activated. Please contact support.",
      };
    }

    redirect("/dashboard");
  }

  cookieStore.set(pendingLicenseCookieName, licenseHash, {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return {
    notice:
      "Check your email and open the confirmation link in this browser within 24 hours. Your license activates when you confirm.",
  };
}
