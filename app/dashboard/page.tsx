"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const reviews = [
  {
    id: "sofia",
    name: "Sofia R.",
    initial: "S",
    source: "Google",
    time: "12 min ago",
    rating: 5,
    context: "Clinic visit",
    review: "Dr. Rivera took time to explain my treatment plan. I felt listened to from the moment I walked in.",
    reply: "Thank you for sharing this, Sofia. We're glad Dr. Rivera and the team helped you feel comfortable and informed. We appreciate you trusting us with your care.",
  },
  {
    id: "marcus",
    name: "Marcus T.",
    initial: "M",
    source: "Yelp",
    time: "38 min ago",
    rating: 4,
    context: "New patient",
    review: "Friendly staff and an easy booking process. I waited a little longer than expected, but the care was excellent.",
    reply: "Thanks for the thoughtful feedback, Marcus. We're happy you had a positive experience with our team, and we're sorry for the longer wait. We'll keep working to make every visit run smoothly.",
  },
  {
    id: "elena",
    name: "Elena W.",
    initial: "E",
    source: "Facebook",
    time: "1 hr ago",
    rating: 5,
    context: "Follow-up visit",
    review: "The follow-up was quick and everything was explained clearly. The front desk team is lovely, too.",
    reply: "Thank you, Elena. It's great to hear your follow-up felt clear and easy. We'll pass your kind words along to our front desk team.",
  },
];

const metrics = [
  { label: "Total reviews", value: "1,284", detail: "+12.6% from last month", tone: "text-[#c7f36b]", mark: "↗" },
  { label: "Average rating", value: "4.9", detail: "Across all locations", tone: "text-[#edbd65]", mark: "★★★★★" },
  { label: "Pending replies", value: "6", detail: "3 need attention today", tone: "text-[#ee826e]", mark: "●" },
  { label: "Sent requests", value: "142", detail: "86 SMS · 56 QR this month", tone: "text-[#7fb8be]", mark: "↗" },
];

const activityBars = [34, 48, 41, 66, 58, 76, 62, 86, 72, 94, 79, 100];

export default function DashboardPage() {
  const [businessName, setBusinessName] = useState("Northstar Health");
  const [industry, setIndustry] = useState("Clinic");
  const [reviewLink, setReviewLink] = useState("https://g.page/r/northstar-health/review");
  const [qrValue, setQrValue] = useState("https://g.page/r/northstar-health/review");
  const [generatorMessage, setGeneratorMessage] = useState("");
  const [copiedReply, setCopiedReply] = useState("");

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setGeneratorMessage(message);
    } catch {
      setGeneratorMessage("Clipboard access is unavailable. Select and copy the link manually.");
    }
  }

  async function copyReply(id: string, reply: string) {
    try {
      await navigator.clipboard.writeText(reply);
      setCopiedReply(id);
    } catch {
      setCopiedReply("unavailable");
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
      <div className="mx-auto max-w-[1320px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end" id="overview">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#929188]">Tuesday, September 26</p>
                <h1 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.05em] sm:text-[32px]">Good morning, Maya</h1>
                <p className="mt-2 text-[12px] text-[#929188]">Here is how your customer reputation is doing.</p>
              </div>
              <a className="inline-flex h-10 w-fit items-center gap-2 rounded-[5px] bg-[#c7f36b] px-4 text-[11px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e]" href="#qr-generator">Create a review request <span aria-hidden="true">↗</span></a>
            </section>

            <section aria-label="Review metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
              {metrics.map((metric) => (
                <article className="min-w-0 rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5" id={metric.label === "Sent requests" ? "request-metrics" : undefined} key={metric.label}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-medium text-[#a5a49a] sm:text-[11px]">{metric.label}</p><span aria-hidden="true" className={`shrink-0 text-[10px] ${metric.tone}`}>{metric.mark}</span></div>
                  <p className="mt-4 text-[26px] font-medium leading-none tracking-[-0.055em] text-[#f3f2e9] sm:text-[30px]">{metric.value}{metric.label === "Average rating" && <span className="ml-1 text-[12px] text-[#8d8d83]">/ 5</span>}</p>
                  <p className={`mt-3 truncate text-[9px] sm:text-[10px] ${metric.label === "Pending replies" ? "text-[#ee9b8b]" : "text-[#85857c]"}`}>{metric.detail}</p>
                </article>
              ))}
            </section>

            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.8fr)]">
              <section aria-labelledby="reviews-heading" className="overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]" id="reviews">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-5">
                  <div><h2 className="text-[13px] font-medium text-[#f0efe7]" id="reviews-heading">Recent reviews</h2><p className="mt-1 text-[10px] text-[#85857c]">New feedback across your locations</p></div>
                  <a className="text-[10px] font-medium text-[#c7f36b] hover:text-[#e0ffa3]" href="#reviews">View all <span aria-hidden="true">→</span></a>
                </div>
                <div className="divide-y divide-white/[0.07]">
                  {reviews.map((review) => (
                    <article className="p-4 sm:p-5" key={review.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d5b9a1]/15 text-[10px] font-semibold text-[#ddc5af]">{review.initial}</span>
                          <div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#e7e6dd]">{review.name}<span className="ml-2 font-normal text-[#77786e]">{review.context}</span></p><p className="mt-1 text-[9px] text-[#85857c]">{review.source} <span className="mx-1">·</span> {review.time}</p></div>
                        </div>
                        <span aria-label={`${review.rating} out of 5 stars`} className="shrink-0 text-[10px] tracking-[0.08em] text-[#edbd65]">{"★".repeat(review.rating)}<span className="text-[#51524a]">{"★".repeat(5 - review.rating)}</span></span>
                      </div>
                      <p className="mt-3 text-[11px] leading-5 text-[#b9b8ae]">{review.review}</p>
                      <div className="mt-3 rounded-xl border border-white/70 bg-white/50 p-3 text-slate-800 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-700">AI reply suggestion</p><span className="text-[9px] text-slate-600">Review before posting</span></div>
                        <p className="mt-2 text-[10px] leading-[1.65] text-slate-800">{review.reply}</p>
                        <button className="mt-2.5 inline-flex items-center gap-1.5 text-[9px] font-semibold text-violet-700 transition-colors hover:text-violet-900" onClick={() => void copyReply(review.id, review.reply)} type="button">{copiedReply === review.id ? "Copied reply" : "Copy reply"}<span aria-hidden="true">↗</span></button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section aria-labelledby="performance-heading" className="rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="flex items-start justify-between"><div><h2 className="text-[13px] font-medium text-[#f0efe7]" id="performance-heading">Response performance</h2><p className="mt-1 text-[10px] text-[#85857c]">Last 12 weeks</p></div><span className="rounded-[3px] border border-white/[0.09] px-2 py-1 text-[9px] text-[#929188]">All locations</span></div>
                <div className="mt-5 grid grid-cols-2 gap-4 border-b border-white/[0.08] pb-5">
                  <div><p className="text-[24px] font-medium tracking-[-0.05em] text-[#c7f36b]">96<span className="text-[13px]">%</span></p><p className="mt-1 text-[9px] text-[#85857c]">Reply rate</p></div>
                  <div><p className="text-[24px] font-medium tracking-[-0.05em] text-[#f3f2e9]">2.4<span className="ml-1 text-[11px] text-[#aaa99f]">hrs</span></p><p className="mt-1 text-[9px] text-[#85857c]">Avg. response time</p></div>
                </div>
                <div aria-label="Weekly review activity chart" className="mt-5 flex h-[116px] items-end gap-1.5 border-b border-l border-white/[0.1] px-2">
                  {activityBars.map((height, index) => <span className="flex-1 rounded-t-[3px] bg-gradient-to-t from-violet-500/35 via-violet-500/65 to-indigo-400/90 shadow-[0_0_12px_rgba(139,92,246,0.16)]" key={index} style={{ height: `${height}%` }} />)}
                </div>
                <div className="mt-2 flex justify-between pl-2 text-[8px] text-[#77786e]"><span>Week 1</span><span>Week 12</span></div>
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4"><span className="text-[10px] text-[#a5a49a]">Reviews needing attention</span><span className="text-[11px] font-medium text-[#edbd65]">6 <span className="text-[#77786e]">open</span></span></div>
              </section>
            </div>

            <section aria-labelledby="qr-heading" className="mt-5 overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]" id="qr-generator">
              <div className="border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <p className="section-kicker"><span>GET MORE FEEDBACK</span></p>
                <h2 className="mt-2 text-[16px] font-medium text-[#f0efe7]" id="qr-heading">Review link &amp; QR code</h2>
                <p className="mt-1 text-[11px] leading-5 text-[#85857c]">Make it easy for customers to share feedback after every visit.</p>
              </div>
              <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setQrValue(reviewLink.trim()); setGeneratorMessage("QR code updated. Your link is ready to share."); }}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-[10px] font-medium text-[#b9b8ae]">Business name
                      <input className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setBusinessName(event.target.value)} placeholder="Your business" value={businessName} />
                    </label>
                    <label className="block text-[10px] font-medium text-[#b9b8ae]">Business type
                      <select className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none focus:border-[#c7f36b]/60" onChange={(event) => setIndustry(event.target.value)} value={industry}>
                        <option>Clinic</option><option>Salon</option><option>Gym</option><option>Restaurant</option><option>Dental</option><option>Auto service</option><option>Other local business</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-[10px] font-medium text-[#b9b8ae]">Review link
                    <input className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setReviewLink(event.target.value)} placeholder="https://..." required type="url" value={reviewLink} />
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e]" type="submit">Generate QR code <span aria-hidden="true">↗</span></button>
                    <button className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-white/[0.12] px-4 text-[10px] font-medium text-[#d9d8cf] transition-colors hover:border-white/25 hover:bg-white/[0.03]" onClick={() => void copyText(qrValue, "Review link copied to clipboard.")} type="button">Copy review link</button>
                  </div>
                  <p aria-live="polite" className="min-h-4 text-[10px] leading-5 text-[#c7f36b]" role="status">{generatorMessage}</p>
                </form>
                <div className="flex flex-col items-center justify-center border-t border-white/[0.08] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <div className="flex size-[176px] items-center justify-center rounded-[5px] bg-white p-2" id="review-qr">
                    <QRCodeSVG bgColor="#ffffff" fgColor="#10110f" level="M" size={160} value={qrValue} />
                  </div>
                  <p className="mt-3 max-w-[200px] truncate text-[10px] font-medium text-[#d9d8cf]">{businessName || "Your business"} · {industry}</p>
                  <button className="mt-3 text-[10px] font-medium text-[#c7f36b] transition-colors hover:text-[#e0ffa3]" onClick={downloadQr} type="button">Download QR as SVG <span aria-hidden="true">↓</span></button>
                  <p className="mt-2 text-center text-[9px] leading-4 text-[#77786e]">Display at checkout, reception, or on receipts.</p>
                </div>
              </div>
            </section>

            <footer className="flex flex-col gap-2 py-6 text-[9px] text-[#686960] sm:flex-row sm:items-center sm:justify-between">
              <p>TableSignal · Local reputation, made manageable.</p>
              <p>Sample workspace data · <a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
            </footer>
          </div>
  );
}
