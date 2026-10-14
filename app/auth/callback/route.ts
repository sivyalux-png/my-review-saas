import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import { pendingLicenseCookieName } from "../../../lib/supabase/licenses";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/signup?error=confirmation", request.url),
  );
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  function redirectTo(path: string) {
    response.headers.set("Location", new URL(path, request.url).toString());
    return response;
  }

  function clearPendingLicense() {
    response.cookies.set(pendingLicenseCookieName, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    clearPendingLicense();
    return redirectTo("/signup?error=confirmation");
  }

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("Unable to exchange signup confirmation code.", exchangeError);
    clearPendingLicense();
    return redirectTo("/signup?error=confirmation");
  }

  const pendingLicenseHash = request.cookies.get(
    pendingLicenseCookieName,
  )?.value;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !pendingLicenseHash) {
    if (userError) {
      console.error("Unable to load confirmed signup user.", userError);
    }
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Unable to sign out incomplete signup.", signOutError);
    }
    if (user) {
      const admin = createAdminClient();
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteUserError) {
        console.error("Unable to remove signup without its pending license.", deleteUserError);
      }
    }
    clearPendingLicense();
    return redirectTo("/signup?error=license");
  }

  const { error: redeemError } = await supabase.rpc("redeem_license", {
    p_key_hash: pendingLicenseHash,
  });

  if (redeemError) {
    console.error("Unable to redeem confirmed signup license.", redeemError);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Unable to sign out after license redemption failed.", signOutError);
    }

    const admin = createAdminClient();
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error("Unable to remove incomplete signup user.", deleteUserError);
    }

    clearPendingLicense();
    return redirectTo("/signup?error=license");
  }

  clearPendingLicense();
  return redirectTo("/dashboard");
}
