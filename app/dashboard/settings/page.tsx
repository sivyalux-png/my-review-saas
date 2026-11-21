import { redirect } from "next/navigation";
import { getActiveBusiness, getUserBusinesses } from "../../../lib/businesses";
import { normalizeAppSumoTier } from "../../../lib/entitlements";
import { createClient } from "../../../lib/supabase/server";
import LocationForm from "../businesses/location-form";
import SettingsClient, { type ReviewSettings } from "./settings-client";

function getLocationLimit(tier: string | null) {
  const normalizedTier = normalizeAppSumoTier(tier);
  if (normalizedTier === "Tier 3") return null;
  if (normalizedTier === "Tier 2") return 5;
  return 1;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    throw claimsError;
  }

  const userId = claimsData?.claims.sub;
  if (typeof userId !== "string") {
    redirect("/login");
  }

  const [business, businesses, { data: profile, error: profileError }] = await Promise.all([
    getActiveBusiness(supabase, userId),
    getUserBusinesses(supabase, userId),
    supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw profileError;
  }
  const locationLimit = getLocationLimit(profile?.plan_tier ?? null);

  const initialSettings: Partial<ReviewSettings> = {
    businessName: business.business_name,
    businessCategory: business.business_category ?? "",
    businessLogoUrl: business.business_logo_url ?? "",
    googleReviewLink: business.google_review_link ?? "",
    privateFeedbackUrl: business.private_feedback_url ?? "",
    emailSubject: business.email_subject ?? undefined,
    emailBody: business.email_body ?? undefined,
    smartReviewGating: business.smart_review_gating,
    autoFollowUpEnabled: business.auto_follow_up_enabled,
  };
  let siteOrigin = "";
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    try {
      siteOrigin = new URL(configuredSiteUrl).origin;
    } catch (error) {
      console.error("NEXT_PUBLIC_SITE_URL is invalid for review poster links.", error);
    }
  }
  return (
    <>
      <section
        aria-labelledby="locations-heading"
        className="mx-auto mt-7 max-w-[1380px] px-5 sm:px-8 lg:px-10"
        id="businesses-and-locations"
      >
        <div className="rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
            Workspace
          </p>
          <h2 className="mt-2 text-base font-medium text-zinc-100" id="locations-heading">
            Businesses &amp; locations
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Each location has its own business details and review settings. Switch locations from the dashboard header.
          </p>
          <ul className="mt-4 divide-y divide-zinc-800">
            {businesses.map((item) => (
              <li
                className={`py-3 text-sm ${item.id === business.id ? "font-medium text-emerald-200" : "text-zinc-200"}`}
                key={item.id}
              >
                {item.business_name}
                {item.id === business.id && (
                  <span className="ml-2 text-[10px] font-normal text-zinc-500">Active location</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-zinc-500">
            {businesses.length} {businesses.length === 1 ? "location" : "locations"}
            {locationLimit === null ? " · Unlimited on Tier 3" : ` · ${locationLimit} maximum on your plan`}
          </p>
          <LocationForm canAdd={locationLimit === null || businesses.length < locationLimit} />
        </div>
      </section>
      <SettingsClient
        businessId={business.id}
        initialSettings={initialSettings}
        planTier={profile?.plan_tier ?? null}
        siteOrigin={siteOrigin}
      />
    </>
  );
}
