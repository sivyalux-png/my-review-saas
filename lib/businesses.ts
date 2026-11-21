import "server-only";

import { cookies } from "next/headers";
import type { createClient } from "./supabase/server";

const activeBusinessCookieName = "tablesignal_active_business";
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Business = {
  id: string;
  user_id: string;
  business_name: string;
  business_category: string | null;
  google_review_link: string | null;
  private_feedback_url: string | null;
  business_logo_url: string | null;
  email_subject: string | null;
  email_body: string | null;
  smart_review_gating: boolean;
  auto_follow_up_enabled: boolean;
};

export async function getUserBusinesses(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, user_id, business_name, business_category, google_review_link, private_feedback_url, business_logo_url, email_subject, email_body, smart_review_gating, auto_follow_up_enabled")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveBusiness(
  supabase: SupabaseClient,
  userId: string,
) {
  const { activeBusiness } = await getBusinessContext(supabase, userId);
  return activeBusiness;
}

export async function getBusinessContext(
  supabase: SupabaseClient,
  userId: string,
) {
  const businesses = await getUserBusinesses(supabase, userId);
  if (businesses.length === 0) {
    throw new Error("No business location is configured for this account.");
  }

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(activeBusinessCookieName)?.value;
  return {
    businesses,
    activeBusiness: businesses.find((business) => business.id === selectedId) ?? businesses[0],
  };
}

export async function setActiveBusinessCookie(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set(activeBusinessCookieName, businessId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
