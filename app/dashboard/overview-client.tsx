"use client";

import { useState } from "react";
import { Activity, CircleDollarSign, Layers3, Mail, Send, Star, ThumbsUp } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import CreateReviewRequest from "./create-review-request";

type OverviewClientProps = {
  fullName: string | null;
  businessName: string | null;
  planTier: string | null;
  monthlyCreditLimit: number | null;
  creditsRemaining: number | null;
  googleReviewLink: string | null;
  analytics: {
    totalSent: number;
    requestChangePercent: number;
    conversionRate: number | null;
    averageRating: number | null;
    positiveReviews: number;
    negativeReviews: number;
    totalReviews: number;
    trendDays: { label: string; requests: number; reviews: number }[];
    recentReviews: { customerName: string; rating: number; feedback: string | null; reviewedAt: string }[];
  };
};

export default function OverviewClient({
  fullName,
  businessName: savedBusinessName,
  planTier,
  monthlyCreditLimit: savedMonthlyCreditLimit,
  creditsRemaining: savedCreditsRemaining,
  googleReviewLink,
  analytics,
}: OverviewClientProps) {
  const [businessName, setBusinessName] = useState(savedBusinessName ?? "");
  const [industry, setIndustry] = useState("Other local business");
  const [reviewLink, setReviewLink] = useState(googleReviewLink ?? "");
  const [qrValue, setQrValue] = useState(googleReviewLink ?? "");
  const [generatorMessage, setGeneratorMessage] = useState("");
  const monthlyCreditLimit = savedMonthlyCreditLimit ?? 0;
  const [creditsRemaining, setCreditsRemaining] = useState(savedCreditsRemaining ?? 0);
  const creditsUsed = Math.max(monthlyCreditLimit - creditsRemaining, 0);
  const greetingName = fullName?.trim().split(/\s+/)[0] || "there";
  const ratedReviews = analytics.positiveReviews + analytics.negativeReviews;
  const positivePercent = ratedReviews
    ? (analytics.positiveReviews / ratedReviews) * 100
    : 0;
  const negativePercent = ratedReviews ? 100 - positivePercent : 0;
  const maxTrendCount = Math.max(
    1,
    ...analytics.trendDays.flatMap((day) => [day.requests, day.reviews]),
  );
  const metrics = [
    {
      label: "Total Requests Sent",
      value: analytics.totalSent.toLocaleString(),
      detail: `${analytics.requestChangePercent > 0 ? "+" : ""}${analytics.requestChangePercent}% vs. last month`,
      icon: <Send aria-hidden="true" size={16} />,
      theme: "requests",
    },
    {
      label: "Conversion Rate",
      value: analytics.conversionRate === null ? "—" : `${analytics.conversionRate.toFixed(1)}%`,
      detail: `${analytics.totalReviews.toLocaleString()} reviews from sent requests`,
      icon: <Activity aria-hidden="true" size={16} />,
      theme: "usage",
    },
    {
      label: "Average Rating",
      value: analytics.averageRating === null ? "—" : `${analytics.averageRating.toFixed(1)} / 5.0`,
      detail: `${analytics.totalReviews.toLocaleString()} submitted reviews`,
      icon: <Star aria-hidden="true" size={16} />,
      theme: "plan",
    },
    {
      label: "Positive / Negative",
      value: `${analytics.positiveReviews} / ${analytics.negativeReviews}`,
      detail: "Positive (4–5★) / Negative (1–3★)",
      icon: <ThumbsUp aria-hidden="true" size={16} />,
      theme: "reviews",
    },
  ];

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setGeneratorMessage(message);
    } catch {
      setGeneratorMessage("Clipboard access is unavailable. Select and copy the link manually.");
    }
  }

  function downloadQr() {
    const svg = document.getElementById("review-qr")?.querySelector("svg");
    if (!svg) return;

    const source = new XMLSerializer().serializeToString(svg);
    const file = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const fileUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    const safeName = businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "local-business";
    anchor.href = fileUrl;
    anchor.download = `${safeName}-review-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(fileUrl);
    setGeneratorMessage("Your QR code was downloaded as an SVG.");
  }

  return (
      <div className="overview-page mx-auto max-w-[1320px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
        <section className="overview-heading mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end" id="overview">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#929188]">Workspace overview</p>
                <h1 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.05em] sm:text-[32px]">Welcome, {greetingName}</h1>
                <p className="mt-2 text-[12px] text-[#929188]">Your plan, available email credits, and review activity at a glance.</p>
              </div>
              <CreateReviewRequest
                creditsRemaining={creditsRemaining}
                onCreditsChanged={setCreditsRemaining}
              />
            </section>

            <section aria-label="Review performance summary" className="overview-metrics grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
              {metrics.map((metric) => (
                <article className={`overview-metric overview-metric-${metric.theme} min-w-0 rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5`} id={metric.label === "Total Requests Sent" ? "request-metrics" : undefined} key={metric.label}>
                  <div className="overview-metric-heading flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-medium text-[#526276] sm:text-[11px]">{metric.label}</p>
                    <span aria-hidden="true" className="overview-metric-icon flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/80 text-[13px]">{metric.icon}</span>
                  </div>
                  <p className="overview-metric-value mt-4 truncate font-semibold leading-tight text-[26px] sm:text-[30px]">{metric.value}</p>
                  <p className="mt-3 min-h-9 text-[9px] leading-5 text-[#526276]">{metric.detail}</p>
                </article>
              ))}
            </section>

            <section aria-label="Account plan and credits" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Available Credits", value: creditsRemaining.toLocaleString(), detail: `of ${monthlyCreditLimit.toLocaleString()} email credits` },
                { label: "Used Credits", value: creditsUsed.toLocaleString(), detail: "Email credits used" },
                { label: "Current Plan", value: planTier ?? "No plan", detail: planTier ? "Active license" : "Redeem a license to activate" },
              ].map((item) => (
                <article className="rounded-[6px] border border-white/[0.09] bg-[#171814] px-4 py-3" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-medium text-[#526276]">{item.label}</p>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#172033]">{item.label === "Available Credits" ? <Mail aria-hidden="true" size={14} /> : item.label === "Used Credits" ? <CircleDollarSign aria-hidden="true" size={14} /> : <Layers3 aria-hidden="true" size={14} />}{item.value}</span>
                  </div>
                  <p className="mt-1 text-[9px] text-[#526276]">{item.detail}</p>
                </article>
              ))}
            </section>

            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.8fr)]">
              <section aria-labelledby="performance-heading" className="overview-panel rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 id="performance-heading">Review activity</h2><p className="mt-1 text-[10px] text-[#85857c]">Requests sent and reviews submitted · last 7 days</p></div>
                  <span className="rounded-full border border-slate-300/70 bg-white/50 px-3 py-1 text-[9px] font-medium text-slate-700">{analytics.totalReviews} reviews</span>
                </div>
                <div aria-label="Bar chart of review requests and submitted reviews over the last seven days" className="mt-5">
                  <div className="flex h-40 items-end justify-around gap-2 border-b border-slate-300/50 px-1">
                    {analytics.trendDays.map((day) => (
                      <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={day.label}>
                        <div className="flex h-[calc(100%-25px)] w-full max-w-12 items-end justify-center gap-1">
                          <span aria-label={`${day.requests} requests`} className="w-2.5 rounded-t bg-sky-400" style={{ height: `${Math.max(day.requests ? (day.requests / maxTrendCount) * 100 : 0, day.requests ? 5 : 0)}%` }} />
                          <span aria-label={`${day.reviews} reviews`} className="w-2.5 rounded-t bg-emerald-500" style={{ height: `${Math.max(day.reviews ? (day.reviews / maxTrendCount) * 100 : 0, day.reviews ? 5 : 0)}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-500">{day.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-[9px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-sky-400" />Requests sent</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-500" />Reviews submitted</span>
                  </div>
                </div>
              </section>

              <section aria-labelledby="sentiment-heading" className="overview-panel rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <h2 id="sentiment-heading">Review sentiment</h2>
                <p className="mt-1 text-[10px] text-[#85857c]">Ratings from submitted reviews</p>
                <div aria-label={`${analytics.positiveReviews} positive reviews and ${analytics.negativeReviews} negative reviews`} className="mt-6">
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
                    <span className="bg-emerald-500 transition-[width]" style={{ width: `${positivePercent}%` }} />
                    <span className="bg-rose-400 transition-[width]" style={{ width: `${negativePercent}%` }} />
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex items-center gap-2 text-slate-600"><span className="size-2.5 rounded-full bg-emerald-500" />Positive · 4–5 stars</span>
                      <strong className="text-slate-800">{analytics.positiveReviews} <span className="font-normal text-slate-500">({positivePercent.toFixed(0)}%)</span></strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex items-center gap-2 text-slate-600"><span className="size-2.5 rounded-full bg-rose-400" />Negative · 1–3 stars</span>
                      <strong className="text-slate-800">{analytics.negativeReviews} <span className="font-normal text-slate-500">({negativePercent.toFixed(0)}%)</span></strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section aria-labelledby="reviews-heading" className="overview-panel mt-5 overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]" id="reviews">
              <div className="overview-panel-header flex items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <div><h2 id="reviews-heading">Recent reviews</h2><p className="mt-1 text-[10px] text-[#85857c]">Latest ratings recorded for your workspace</p></div>
                <span className="rounded-full border border-slate-300/70 bg-white/50 px-3 py-1 text-[9px] font-medium text-slate-700">{analytics.totalReviews} recorded</span>
              </div>
              {analytics.recentReviews.length ? (
                <ul className="divide-y divide-slate-200/60 px-4 sm:px-5">
                  {analytics.recentReviews.map((review, index) => (
                    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4" key={`${review.reviewedAt}-${index}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#deddd3]">{review.customerName}</p>
                        <span className="mt-1 inline-block text-sm tracking-wide text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        {review.feedback && <p className="mt-1 break-words text-[11px] leading-5 text-[#aaa99f]">{review.feedback}</p>}
                      </div>
                      <time className="shrink-0 text-[10px] text-slate-500" dateTime={review.reviewedAt}>{new Date(review.reviewedAt).toLocaleDateString()}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overview-empty flex min-h-32 flex-col items-center justify-center px-6 py-7 text-center">
                  <p className="text-sm font-semibold text-slate-800">No reviews recorded yet</p>
                  <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">Review ratings will appear here when customers submit feedback.</p>
                </div>
              )}
            </section>

            <section aria-labelledby="qr-heading" className="overview-qr mt-5 overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]" id="qr-generator">
              <div className="overview-qr-header border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <p className="section-kicker"><span>GET MORE FEEDBACK</span></p>
                <h2 className="mt-2 text-[16px] font-medium text-[#f0efe7]" id="qr-heading">Review link &amp; QR code</h2>
                <p className="mt-1 text-[11px] leading-5 text-[#85857c]">Make it easy for customers to share feedback after every visit.</p>
              </div>
              <div className="overview-qr-body grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_184px] lg:gap-7">
                <form className="overview-qr-form space-y-4" onSubmit={(event) => { event.preventDefault(); setQrValue(reviewLink.trim()); setGeneratorMessage("QR code updated. Your link is ready to share."); }}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="overview-qr-field block text-[10px] font-medium text-[#b9b8ae]">Business name
                      <input className="overview-qr-input mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setBusinessName(event.target.value)} placeholder="Your business" value={businessName} />
                    </label>
                    <label className="overview-qr-field block text-[10px] font-medium text-[#b9b8ae]">Business type
                      <select className="overview-qr-input mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none focus:border-[#c7f36b]/60" onChange={(event) => setIndustry(event.target.value)} value={industry}>
                        <option>Clinic</option><option>Salon</option><option>Gym</option><option>Restaurant</option><option>Dental</option><option>Auto service</option><option>Other local business</option>
                      </select>
                    </label>
                  </div>
                  <label className="overview-qr-field block text-[10px] font-medium text-[#b9b8ae]">Review link
                    <input className="overview-qr-input mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setReviewLink(event.target.value)} placeholder="https://..." required type="url" value={reviewLink} />
                  </label>
                  <div className="overview-qr-actions flex flex-wrap gap-2 pt-1">
                    <button className="overview-qr-primary inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e]" type="submit">Generate QR code <span aria-hidden="true">↗</span></button>
                    <button className="overview-qr-secondary inline-flex h-10 items-center gap-2 rounded-[4px] border border-white/[0.12] px-4 text-[10px] font-medium text-[#d9d8cf] transition-colors hover:border-white/25 hover:bg-white/[0.03]" onClick={() => void copyText(qrValue, "Review link copied to clipboard.")} type="button">Copy review link</button>
                  </div>
                  <p aria-live="polite" className="overview-qr-status min-h-4 text-[10px] leading-5 text-[#c7f36b]" role="status">{generatorMessage}</p>
                </form>
                <div className="overview-qr-preview flex flex-col items-center justify-center border-t border-white/[0.08] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <div className="overview-qr-code flex size-[160px] items-center justify-center rounded-[5px] bg-white p-2" id="review-qr">
                    <QRCodeSVG bgColor="#ffffff" fgColor="#10110f" level="M" size={144} value={qrValue} />
                  </div>
                  <p className="overview-qr-caption mt-3 max-w-[180px] truncate text-[10px] font-medium text-[#d9d8cf]">{businessName || "Your business"} · {industry}</p>
                  <button className="overview-qr-download mt-3 text-[10px] font-medium text-[#c7f36b] transition-colors hover:text-[#e0ffa3]" onClick={downloadQr} type="button">Download QR as SVG <span aria-hidden="true">↓</span></button>
                </div>
              </div>
            </section>

            <footer className="flex flex-col gap-2 py-6 text-[9px] text-[#686960] sm:flex-row sm:items-center sm:justify-between">
              <p>TableSignal · Local reputation, made manageable.</p>
              <p><a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
            </footer>
          </div>
  );
}
