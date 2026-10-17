"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemLicenseKey } from "./actions";

type PlanEntitlement = {
  plan_tier: string | null;
  monthly_credit_limit: number | null;
  credits_remaining: number | null;
};

const creditPacks = [
  { credits: 500, price: 9, label: "Quick top-up", checkoutUrl: process.env.NEXT_PUBLIC_PAYONEER_500_CREDITS_URL },
  { credits: 1500, price: 24, label: "Most popular", checkoutUrl: process.env.NEXT_PUBLIC_PAYONEER_1500_CREDITS_URL },
  { credits: 5000, price: 69, label: "Best value", checkoutUrl: process.env.NEXT_PUBLIC_PAYONEER_5000_CREDITS_URL },
];

const tiers = [
  { name: "Starter", price: "$19", credits: "500", locations: "1 location", features: ["500 monthly credits", "AI review replies", "Review request tools"] },
  { name: "Plus", price: "$49", credits: "2,000", locations: "3 locations", features: ["2,000 monthly credits", "AI review replies", "Review request tools"] },
  { name: "Unlimited", price: "$99", credits: "10,000", locations: "10 locations", features: ["10,000 monthly credits", "AI review replies", "Priority support"] },
];

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

  const monthlyCreditLimit = entitlement?.monthly_credit_limit ?? 0;
  const creditsRemaining = entitlement?.credits_remaining ?? 0;
  const creditsUsed = Math.max(monthlyCreditLimit - creditsRemaining, 0);
  const currentTier = tiers.find((tier) => tier.name === entitlement?.plan_tier);
  const usagePercent = monthlyCreditLimit > 0
    ? Math.min((creditsUsed / monthlyCreditLimit) * 100, 100)
    : 0;

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
      <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#929188]">Account billing</p>
                <h1 className="mt-2 text-[28px] font-medium leading-tight sm:text-[32px]">Plan &amp; credits</h1>
                <p className="mt-2 text-[12px] text-[#929188]">Manage your AppSumo license and monthly usage.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-[#c7f36b]/20 bg-[#c7f36b]/[0.06] px-3 py-2 text-[10px] text-[#dff7b2]"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#c7f36b]" /> Account active</span>
            </section>

            <section aria-labelledby="tier-status-heading" className="mb-5 overflow-hidden rounded-[6px] border border-[#c7f36b]/20 bg-[#171914]">
              <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#c7f36b]">Current plan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5"><h2 className="text-[19px] font-medium" id="tier-status-heading">{entitlement?.plan_tier ?? "No active plan"}</h2>{entitlement && <span className="rounded-[3px] border border-[#c7f36b]/25 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#c7f36b]">Lifetime</span>}</div>
                  <p className="mt-1 text-[10px] text-[#85857c]">{currentTier?.locations ?? "No locations"} <span className="mx-1 text-[#55564f]">·</span> Renews never</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                  <div><p className="text-[9px] text-[#85857c]">Credits used</p><p className="mt-1 text-[15px] font-medium">{creditsUsed.toLocaleString()} <span className="text-[10px] font-normal text-[#85857c]">/ {monthlyCreditLimit.toLocaleString()}</span></p></div>
                  <div><p className="text-[9px] text-[#85857c]">Available</p><p className="mt-1 text-[15px] font-medium text-[#c7f36b]">{creditsRemaining.toLocaleString()} <span className="text-[10px] font-normal text-[#85857c]">credits</span></p></div>
                  <div className="col-span-2 sm:col-span-1"><p className="text-[9px] text-[#85857c]">Monthly allowance</p><p className="mt-1 text-[12px] font-medium">{monthlyCreditLimit.toLocaleString()} credits</p></div>
                </div>
              </div>
              <div className="border-t border-white/[0.07] px-4 py-3 sm:px-5">
                <div className="mb-2 flex justify-between text-[9px] text-[#85857c]"><span>Monthly credit usage</span><span>{Math.round(usagePercent)}%</span></div>
                <div aria-label={`${Math.round(usagePercent)} percent of monthly credits used`} aria-valuemax={monthlyCreditLimit} aria-valuemin={0} aria-valuenow={creditsUsed} className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar"><div className="h-full rounded-full bg-[#c7f36b] transition-[width]" style={{ width: `${usagePercent}%` }} /></div>
              </div>
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <section aria-labelledby="redeem-heading" className="rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="mb-5 border-b border-white/[0.08] pb-4">
                  <p className="section-kicker"><span>APPSUMO</span></p>
                  <h2 className="mt-2 text-[14px] font-medium" id="redeem-heading">Redeem a license key</h2>
                  <p className="mt-1 text-[10px] leading-5 text-[#85857c]">Add a new AppSumo code to apply its lifetime tier to your account.</p>
                </div>
                <form className="space-y-4" onSubmit={submitLicenseKey}>
                  <label className="block text-[10px] font-medium text-[#b9b8ae]" htmlFor="license-key">License key
                    <input autoComplete="off" className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 font-mono text-[11px] uppercase text-[#eeede4] outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-[#686960] focus:border-[#c7f36b]/60" id="license-key" maxLength={64} onChange={(event) => { setLicenseKey(event.target.value); setRedemptionMessage(""); setIsKeyValid(false); }} placeholder="XXXX-XXXX-XXXX" value={licenseKey} />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-wait disabled:opacity-60" disabled={isRedeeming} type="submit">{isRedeeming ? "Redeeming key..." : "Validate key"} {!isRedeeming && <span aria-hidden="true">→</span>}</button>
                    <p aria-live="polite" className={`min-h-4 text-[10px] ${redemptionMessage ? isKeyValid ? "text-[#edbd65]" : "text-[#ee9b8b]" : "text-[#77786e]"}`} role="status">{redemptionMessage}</p>
                  </div>
                </form>
                <p className="mt-5 border-t border-white/[0.08] pt-4 text-[9px] leading-4 text-[#77786e]">To redeem a key or get help with an AppSumo purchase, <a className="text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com">contact support</a>.</p>
              </section>

              <section aria-labelledby="topup-heading" className="rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div><p className="section-kicker"><span>ONE-TIME PURCHASE</span></p><h2 className="mt-2 text-[14px] font-medium" id="topup-heading">Buy extra credits</h2></div>
                  <p className="text-[9px] text-[#85857c]">Credits never expire</p>
                </div>
                <div className="space-y-2.5">
                  {creditPacks.map((pack) => (
                    <article className={`flex flex-wrap items-center justify-between gap-3 rounded-[5px] border p-3 ${pack.label === "Most popular" ? "credit-pack-featured border-[#c7f36b]/25 bg-[#c7f36b]/[0.035]" : "border-white/[0.08] bg-[#131410]"}`} key={pack.credits}>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="credit-pack-title text-[12px] font-medium">{pack.credits.toLocaleString()} credits</p>{pack.label === "Most popular" && <span className="credit-pack-badge text-[8px] font-semibold uppercase tracking-[0.08em]">{pack.label}</span>}</div><p className="credit-pack-subtext mt-1 text-[9px]">{pack.label === "Most popular" ? "$0.016" : pack.label === "Best value" ? "$0.014" : "$0.018"} per credit</p></div>
                      <div className="ml-auto flex items-center gap-3"><span className="text-[13px] font-medium">${pack.price}</span>{pack.checkoutUrl ? <a className={`inline-flex h-9 items-center gap-2 rounded-[4px] border px-3 text-[9px] font-semibold transition-colors ${pack.label === "Most popular" ? "credit-pack-checkout" : "border-[#c7f36b]/35 text-[#c7f36b] hover:bg-[#c7f36b]/10"}`} href={pack.checkoutUrl} rel="noreferrer" target="_blank">Checkout <span aria-hidden="true">↗</span></a> : <button aria-label={`Payoneer checkout for ${pack.credits} credits is not configured`} className={`inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-[4px] border px-3 text-[9px] font-medium ${pack.label === "Most popular" ? "credit-pack-checkout" : "border-white/[0.1] text-[#77786e]"}`} disabled type="button">Checkout unavailable</button>}</div>
                    </article>
                  ))}
                </div>
                <p className="mt-3 text-[9px] leading-4 text-[#77786e]">Checkout links are provided by Payoneer. Contact support if your purchase is not reflected.</p>
              </section>
            </div>

            <section aria-labelledby="tiers-heading" className="mt-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="section-kicker"><span>MORE ROOM TO GROW</span></p><h2 className="mt-2 text-[16px] font-medium" id="tiers-heading">Compare tiers</h2></div>
                <a className="text-[10px] font-medium text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com?subject=Plan%20upgrade">Talk to us about upgrading <span aria-hidden="true">↗</span></a>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {tiers.map((tier) => {
                  const isCurrent = tier.name === entitlement?.plan_tier;
                  return (
                    <article className={`rounded-[6px] border p-4 sm:p-5 ${isCurrent ? "border-[#c7f36b]/35 bg-[#171914]" : "border-white/[0.09] bg-[#171814]"}`} key={tier.name}>
                      <div className="flex items-start justify-between gap-2"><h3 className="text-[13px] font-medium">{tier.name}</h3>{isCurrent && <span className="rounded-[3px] bg-[#c7f36b]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#c7f36b]">Current</span>}</div>
                      <p className="mt-3 text-[23px] font-medium">{tier.price}<span className="ml-1 text-[9px] font-normal text-[#85857c]">/ month</span></p>
                      <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-[10px] text-[#b9b8ae]">
                        <p><span className="font-medium text-[#f3f2e9]">{tier.credits}</span> credits / month</p>
                        <p>{tier.locations}</p>
                        {tier.features.slice(1).map((feature) => <p className="flex items-center gap-2" key={feature}><span aria-hidden="true" className="text-[#c7f36b]">✓</span>{feature}</p>)}
                      </div>
                      {isCurrent ? <p className="mt-5 text-[9px] text-[#85857c]">Included with your AppSumo license</p> : <a className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border border-white/[0.12] text-[9px] font-medium text-[#deddd3] transition-colors hover:border-[#c7f36b]/40 hover:text-[#c7f36b]" href={`mailto:hello@tablesignal.com?subject=${encodeURIComponent(`Upgrade to ${tier.name}`)}`}>Explore {tier.name} <span aria-hidden="true">→</span></a>}
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
