"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemLicenseKey } from "./actions";
import { appSumoTiers, getTierEntitlement } from "../../../lib/entitlements";

type PlanEntitlement = {
  plan_tier: string | null;
};

const tiers = appSumoTiers.map(({ name, price, locations }) => ({
  name,
  price: `$${price}`,
  features: [
    "Unlimited emails via your own Resend/SMTP",
    locations,
    "Smart Review Gating",
    name === "Tier 1"
      ? "Basic QR code · TableSignal branding · no auto follow-up"
      : name === "Tier 2"
        ? "Custom-branded QR · white-label · one day-3 follow-up"
        : "Custom-branded QR · full white-label · day-3 and day-7 follow-ups",
  ],
}));

export default function PlanPage({
  initialEntitlement,
}: {
  initialEntitlement: PlanEntitlement | null;
}) {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState("");
  const [redemptionMessage, setRedemptionMessage] = useState("");
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [isRedeeming, startRedeeming] = useTransition();
  const [entitlement, setEntitlement] = useState(initialEntitlement);
  const currentTier = getTierEntitlement(entitlement?.plan_tier);

  function submitLicenseKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedKey = licenseKey.trim();
    const validFormat = /^[A-Z0-9][A-Z0-9-]{9,63}$/i.test(normalizedKey);
    if (!validFormat) {
      setIsKeyValid(false);
      setRedemptionMessage("Enter a license key with at least 10 letters, numbers, or hyphens.");
      return;
    }

    setRedemptionMessage("");
    startRedeeming(async () => {
      try {
        const result = await redeemLicenseKey(normalizedKey);
        setIsKeyValid(result.ok);
        setRedemptionMessage(result.message);

        if (result.ok) {
          setEntitlement({
            plan_tier: result.entitlement.planTier,
          });
          setLicenseKey("");
          router.refresh();
        }
      } catch (error) {
        console.error("Unable to complete license redemption.", error);
        setIsKeyValid(false);
        setRedemptionMessage("We couldn't redeem your license right now. Please try again or contact support.");
      }
    });
  }

  return (
    <div className="plan-page mx-auto max-w-[1180px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
      <section aria-labelledby="plan-page-heading" className="plan-hero">
        <div className="plan-hero-copy">
          <p className="plan-eyebrow">Account plan</p>
          <h1 id="plan-page-heading">Plan &amp; AppSumo license</h1>
          <p>Manage your lifetime license, tier, and BYOS email setup.</p>
        </div>
        <div className="plan-active">
          <span aria-hidden="true" className="plan-active-indicator" />
          <span className="plan-active-copy">
            <strong>{entitlement?.plan_tier ?? "No active plan"}</strong>
            <span>{currentTier?.locations ?? "Redeem a license to activate your plan"}</span>
          </span>
        </div>
      </section>

      <section aria-labelledby="redeem-heading" className="plan-detail-panel mt-6">
        <div className="plan-detail-heading">
          <span aria-hidden="true" className="plan-detail-icon">
            <svg className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="M7 4.5h7l4 4v11H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
              <path d="M14 4.5v4h4m-8 4h4m-4 3h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </span>
          <div>
            <p className="plan-eyebrow">AppSumo license</p>
            <h2 id="redeem-heading">{entitlement?.plan_tier ? "Activate another license key" : "Redeem your license key"}</h2>
          </div>
        </div>
        <form className="plan-license-form" onSubmit={submitLicenseKey}>
          <label htmlFor="license-key">
            License key
            <input
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 font-mono text-[11px] uppercase text-[#eeede4] outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-[#686960] focus:border-[#c7f36b]/60"
              id="license-key"
              maxLength={64}
              onChange={(event) => {
                setLicenseKey(event.target.value);
                setRedemptionMessage("");
                setIsKeyValid(false);
              }}
              placeholder="XXXX-XXXX-XXXX"
              value={licenseKey}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-wait disabled:opacity-60"
              disabled={isRedeeming}
              type="submit"
            >
              {isRedeeming ? "Redeeming key..." : "Activate license"}
              {!isRedeeming && <span aria-hidden="true">→</span>}
            </button>
            <p
              aria-live="polite"
              className={`min-h-4 text-[10px] ${redemptionMessage ? isKeyValid ? "text-[#edbd65]" : "text-[#ee9b8b]" : "text-[#77786e]"}`}
              role="status"
            >
              {redemptionMessage}
            </p>
          </div>
        </form>
        <p className="plan-detail-footnote">
          Need help with an AppSumo purchase?{" "}
          <a className="text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com">
            Contact support
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="tiers-heading" className="plan-tiers mt-8">
        <header className="plan-tiers-banner">
          <div>
            <h2 id="tiers-heading">AppSumo lifetime tiers</h2>
            <p className="mt-1 text-[10px] text-[#929188]">Connect your own Resend or SMTP account for unlimited email sending.</p>
          </div>
          <a href="mailto:hello@tablesignal.com?subject=Plan%20upgrade">
            Talk to us about upgrading
            <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9.7 9a2.35 2.35 0 1 1 3.85 1.8c-.9.72-1.55 1.1-1.55 2.45M12 16.5v.05" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
            </svg>
          </a>
        </header>
        <div className="plan-tier-grid">
          {tiers.map((tier) => {
            const isCurrent = currentTier?.name === tier.name;
            return (
              <article
                className={`plan-tier-card ${isCurrent ? "plan-tier-card-current" : ""} ${tier.name === "Tier 3" ? "plan-tier-card-premium" : ""}`}
                key={tier.name}
              >
                <div className="plan-tier-title">
                  <h3>{tier.name}</h3>
                  {isCurrent && <span className="plan-tier-current">Current</span>}
                </div>
                <p className="plan-tier-price">{tier.price}<span>/ lifetime</span></p>
                <div className="plan-tier-features">
                  {tier.features.map((feature) => <p key={feature}>{feature}</p>)}
                </div>
                {isCurrent ? (
                  <p className="plan-tier-included">Included with your AppSumo license</p>
                ) : (
                  <a
                    className="plan-tier-explore"
                    href={`mailto:hello@tablesignal.com?subject=${encodeURIComponent(`Upgrade to ${tier.name}`)}`}
                  >
                    Explore {tier.name} <span aria-hidden="true">→</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-col gap-2 py-6 text-[9px] text-[#686960] sm:flex-row sm:items-center sm:justify-between">
        <p>TableSignal · Local reputation, made manageable.</p>
        <p><a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
      </footer>
    </div>
  );
}
