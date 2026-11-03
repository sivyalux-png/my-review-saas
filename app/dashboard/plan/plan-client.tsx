"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createTestCreditPackCheckout, redeemLicenseKey } from "./actions";
import { appSumoTiers, getTierEntitlement } from "../../../lib/entitlements";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url?: {
        Open?: (url: string) => void;
      };
    };
  }
}

type PlanEntitlement = {
  plan_tier: string | null;
  monthly_credit_limit: number | null;
  credits_remaining: number | null;
};

type CreditPack = {
  credits: number;
  price: number;
  label: string;
  variantId: number;
};

const emailCreditPacks: CreditPack[] = [
  { credits: 500, price: 9, label: "Quick top-up", variantId: 2307965 },
  { credits: 1500, price: 24, label: "Most popular", variantId: 2308009 },
  { credits: 5000, price: 69, label: "Best value", variantId: 2308025 },
];

const tiers = appSumoTiers.map((tier) => ({
  name: tier.name,
  price: `$${tier.price}`,
  emailCredits: tier.emailCredits.toLocaleString(),
  locations: tier.locations,
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
  const [isCheckoutPending, startCheckout] = useTransition();
  const [entitlement, setEntitlement] = useState(initialEntitlement);
  const [selectedCreditPack, setSelectedCreditPack] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  const monthlyCreditLimit = entitlement?.monthly_credit_limit ?? 0;
  const creditsRemaining = entitlement?.credits_remaining ?? 0;
  const creditsUsed = Math.max(monthlyCreditLimit - creditsRemaining, 0);
  const currentTier = getTierEntitlement(entitlement?.plan_tier);
  const usagePercent = monthlyCreditLimit > 0
    ? Math.min((creditsUsed / monthlyCreditLimit) * 100, 100)
    : 0;

  function renderCreditPacks(packs: CreditPack[], disabled = false) {
    return (
      <div className="credit-pack-list">
        {packs.map((pack) => {
          const packId = `email-${pack.credits}`;
          const isSelected = selectedCreditPack === packId;
          const isPopular = pack.label === "Most popular";

          return (
            <article
              className={`credit-pack-row ${isSelected ? "credit-pack-row-selected" : ""} ${isPopular ? "credit-pack-row-popular" : ""}`}
              key={pack.credits}
            >
              <button
                aria-pressed={isSelected}
                className="credit-pack-select"
                disabled={disabled}
                onClick={() => {
                  setSelectedCreditPack(packId);
                }}
                type="button"
              >
                <span aria-hidden="true" className="credit-pack-icon credit-pack-icon-email">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24">
                    <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5" />
                    <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                </span>
                <span className="credit-pack-copy">
                  <span className="credit-pack-title-line">
                    <span className="credit-pack-title">
                    {pack.credits.toLocaleString()} Extra Email Credits
                    </span>
                    {isPopular && <span className="credit-pack-popular-badge">Most popular</span>}
                  </span>
                  <span className="credit-pack-unit">
                    ${(pack.price / pack.credits).toLocaleString("en-US", { maximumFractionDigits: 4 })} per email credit
                  </span>
                </span>
              </button>
              <div className="credit-pack-purchase">
                <span className="credit-pack-price">${pack.price}</span>
                <button
                  aria-label={`Checkout for ${pack.credits.toLocaleString()} extra email credits`}
                  className="credit-pack-checkout lemonsqueezy-button"
                  disabled={disabled || isCheckoutPending}
                  onClick={() => {
                    setSelectedCreditPack(packId);
                    setCheckoutMessage("");
                    startCheckout(async () => {
                      try {
                        const result = await createTestCreditPackCheckout(pack.variantId);
                        if (!result.ok) {
                          setCheckoutMessage(result.message);
                          return;
                        }

                        if (window.LemonSqueezy?.Url?.Open) {
                          try {
                            window.LemonSqueezy.Url.Open(result.url);
                            setCheckoutMessage("Opening secure test checkout...");
                            return;
                          } catch (error) {
                            console.error("Unable to open Lemon Squeezy checkout overlay.", error);
                          }
                        }

                        const hostedCheckoutUrl = new URL(result.url);
                        hostedCheckoutUrl.searchParams.delete("embed");
                        window.location.assign(hostedCheckoutUrl.toString());
                      } catch (error) {
                        console.error("Unable to start Lemon Squeezy test checkout.", error);
                        setCheckoutMessage("We couldn't start checkout. Please try again.");
                      }
                    });
                  }}
                  type="button"
                >
                  Checkout <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

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
            monthly_credit_limit: result.entitlement.monthlyCreditLimit,
            credits_remaining: result.entitlement.creditsRemaining,
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
            <Script
              src="https://app.lemonsqueezy.com/js/lemon.js"
              strategy="afterInteractive"
              onReady={() => {
                window.createLemonSqueezy?.();
              }}
              onError={(error) => {
                console.error("Unable to load Lemon Squeezy checkout script.", error);
              }}
            />
            <section aria-labelledby="plan-page-heading" className="plan-hero">
              <div className="plan-hero-copy">
                <p className="plan-eyebrow">Account billing</p>
                <h1 id="plan-page-heading">Plan &amp; credits</h1>
                <p>Manage your AppSumo lifetime license and email credits.</p>
              </div>
              <div className="plan-active">
                <span aria-hidden="true" className="plan-active-indicator" />
                <span className="plan-active-copy">
                  <strong>Account active</strong>
                  <span>{entitlement?.plan_tier ?? "No active plan"} · {currentTier?.locations ?? "No locations"}</span>
                </span>
              </div>
            </section>

            <section aria-label="Plan credit summary" className="plan-overview">
              <div className="plan-stat-grid">
                <article className="plan-stat-card">
                  <div className="plan-stat-heading">
                    <p>Email credits used</p>
                    <span aria-hidden="true" className="plan-stat-icon plan-stat-icon-usage">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24">
                        <path d="M4 18.5h16M6.5 15.5a6 6 0 1 1 11 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                        <path d="m12 12 3.5-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                      </svg>
                    </span>
                  </div>
                  <p className="plan-stat-value">{creditsUsed.toLocaleString()} <span>/ {monthlyCreditLimit.toLocaleString()}</span></p>
                  <div className="plan-progress-track">
                    <div aria-label={`${Math.round(usagePercent)} percent of initial email credits used`} aria-valuemax={monthlyCreditLimit} aria-valuemin={0} aria-valuenow={creditsUsed} className="plan-progress-value" role="progressbar" style={{ width: `${usagePercent}%` }} />
                  </div>
                  <p className="plan-stat-footnote">{Math.round(usagePercent)}% of initial email credits used</p>
                </article>

                <article className="plan-stat-card plan-stat-card-available">
                  <div className="plan-stat-heading">
                    <p>Email credits available</p>
                    <span aria-hidden="true" className="plan-stat-icon plan-stat-icon-email">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24">
                        <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5" />
                        <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                      </svg>
                    </span>
                  </div>
                  <p className="plan-stat-value">{creditsRemaining.toLocaleString()}</p>
                  <p className="plan-stat-footnote">Credits remaining in your plan</p>
                </article>

              </div>

              <div className="plan-details-grid">
                <section aria-labelledby="redeem-heading" className="plan-detail-panel">
                  <div className="plan-detail-heading">
                    <span aria-hidden="true" className="plan-detail-icon">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24">
                        <path d="M7 4.5h7l4 4v11H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
                        <path d="M14 4.5v4h4m-8 4h4m-4 3h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                      </svg>
                    </span>
                    <div>
                      <p className="plan-eyebrow">AppSumo</p>
                      <h2 id="redeem-heading">Redeem a license key</h2>
                    </div>
                  </div>
                  <form className="plan-license-form" onSubmit={submitLicenseKey}>
                    <label htmlFor="license-key">License key
                      <input autoComplete="off" className="mt-2 h-11 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 font-mono text-[11px] uppercase text-[#eeede4] outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-[#686960] focus:border-[#c7f36b]/60" id="license-key" maxLength={64} onChange={(event) => { setLicenseKey(event.target.value); setRedemptionMessage(""); setIsKeyValid(false); }} placeholder="XXXX-XXXX-XXXX" value={licenseKey} />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-wait disabled:opacity-60" disabled={isRedeeming} type="submit">{isRedeeming ? "Redeeming key..." : "Validate key"} {!isRedeeming && <span aria-hidden="true">→</span>}</button>
                      <p aria-live="polite" className={`min-h-4 text-[10px] ${redemptionMessage ? isKeyValid ? "text-[#edbd65]" : "text-[#ee9b8b]" : "text-[#77786e]"}`} role="status">{redemptionMessage}</p>
                    </div>
                  </form>
                  <p className="plan-detail-footnote">To redeem a key or get help with an AppSumo purchase, <a className="text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com">contact support</a>.</p>
                </section>

                <section aria-labelledby="usage-heading" className="plan-detail-panel">
                  <div className="plan-detail-heading">
                    <span aria-hidden="true" className="plan-detail-icon plan-detail-icon-usage">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24">
                        <rect height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" width="18" x="3" y="4.5" />
                        <path d="M3.5 9h17M8 9v10m8-10v10" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="plan-eyebrow">Your account</p>
                      <h2 id="usage-heading">Table usage</h2>
                    </div>
                  </div>
                  <div className="plan-usage-table" role="table" aria-label="Email credit usage">
                    <div className="plan-usage-row plan-usage-header" role="row">
                      <span role="columnheader">Email</span><span role="columnheader">Used</span><span role="columnheader">Available</span>
                    </div>
                    <div className="plan-usage-row" role="row">
                      <span role="cell">Review emails</span><span role="cell">{creditsUsed.toLocaleString()} / {monthlyCreditLimit.toLocaleString()}</span><strong role="cell">{creditsRemaining.toLocaleString()}</strong>
                    </div>
                  </div>
                  <p className="plan-detail-footnote">{entitlement?.plan_tier ?? "No active plan"} · {currentTier?.locations ?? "No locations"} · Lifetime license</p>
                </section>
              </div>
            </section>

            <section aria-labelledby="topup-heading" className="credit-store">
              <header className="credit-store-banner">
                <span aria-hidden="true" className="credit-store-banner-icon">
                  <svg className="size-7" fill="none" viewBox="0 0 24 24">
                    <rect height="15" rx="3" stroke="currentColor" strokeWidth="1.7" width="19" x="2.5" y="4.5" />
                    <path d="m4 6.5 8 6.25 8-6.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                </span>
                <div className="credit-store-banner-copy">
                  <p className="credit-store-eyebrow">Buy extra credits</p>
                  <h2 id="topup-heading">Buy extra credits</h2>
                  <p>Add more credits to keep your email review requests going.</p>
                </div>
                <span className="credit-store-expiry">
                  <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                    <path d="M12 3.5 19 6v5.2c0 4.3-2.9 7.5-7 9.3-4.1-1.8-7-5-7-9.3V6l7-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
                    <path d="m9 11.5 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                  </svg>
                  Credits never expire
                </span>
              </header>

              <div className="credit-store-columns">
                <section aria-labelledby="email-credit-packs-heading" className="credit-store-panel credit-store-email">
                  <div className="credit-store-panel-heading">
                    <div>
                      <span className="credit-store-mini-label"><span aria-hidden="true">ϟ</span> One-time purchase</span>
                      <h3 id="email-credit-packs-heading">Extra Email Credits</h3>
                    </div>
                    <span className="credit-store-best-value"><span aria-hidden="true">✦</span> Best value for outreach</span>
                  </div>
                  {renderCreditPacks(emailCreditPacks)}
                  <p aria-live="polite" className={`credit-store-status ${checkoutMessage ? "credit-store-status-active" : ""}`} role="status">
                    <span aria-hidden="true">ⓘ</span>
                    {checkoutMessage || "Test mode is enabled. No real payments will be processed."}
                  </p>
                </section>

              </div>
            </section>

            <section aria-labelledby="tiers-heading" className="plan-tiers">
              <header className="plan-tiers-banner">
                <h2 id="tiers-heading">Compare Tiers</h2>
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
                  const isCurrent = tier.name === entitlement?.plan_tier;
                  return (
                    <article className={`plan-tier-card ${isCurrent ? "plan-tier-card-current" : ""} ${tier.name === "Tier 3" ? "plan-tier-card-premium" : ""}`} key={tier.name}>
                      <div className="plan-tier-title">
                        <h3>{tier.name}</h3>
                        {isCurrent && <span className="plan-tier-current">Current</span>}
                      </div>
                      <p className="plan-tier-price">{tier.price}<span>/ lifetime</span></p>
                      <div className="plan-tier-features">
                        <p><strong>{tier.emailCredits}</strong> email credits{tier.name === "Tier 1" ? ", single immediate grant" : ""}</p>
                        <p>{tier.locations}</p>
                        <p>Email review requests</p>
                      </div>
                      {isCurrent ? (
                        <p className="plan-tier-included">Included with your AppSumo license</p>
                      ) : (
                        <a className="plan-tier-explore" href={`mailto:hello@tablesignal.com?subject=${encodeURIComponent(`Upgrade to ${tier.name}`)}`}>
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
              <p>Sample billing data · <a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
            </footer>
          </div>
  );
}
