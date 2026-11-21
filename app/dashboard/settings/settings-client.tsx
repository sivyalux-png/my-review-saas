"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { normalizeAppSumoTier } from "../../../lib/entitlements";
import { saveReviewSettings } from "./actions";

const businessTypes = [
  "Clinic",
  "Salon",
  "Gym",
  "Restaurant",
  "Dental",
  "Auto service",
  "Retail",
  "Other local business",
] as const;
const starRatingWidgetToken = "{Star_Rating_Widget}";

function renderTemplate(template: string, customerName: string, businessName: string) {
  return template
    .replaceAll("{Customer_Name}", customerName || "Customer Name")
    .replaceAll("{Business_Name}", businessName || "Your Business");
}

function publicReviewUrl(requestId: string, rating: number) {
  return `/review/${requestId}?rating=${rating}`;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label className="settings-label mb-2 block text-[11px] font-medium text-zinc-300" htmlFor={htmlFor}>{children}</label>;
}

function TokenButton({ onClick, token, disabled = false }: { onClick: () => void; token: string; disabled?: boolean }) {
  return <button className="settings-token rounded-[4px] border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-indigo-300 transition-colors hover:border-indigo-400/50 hover:bg-indigo-400/10 disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onClick} type="button">{token}</button>;
}

export type ReviewSettings = {
  businessName: string;
  businessCategory: string;
  businessLogoUrl: string;
  googleReviewLink: string;
  privateFeedbackUrl: string;
  emailSubject: string;
  emailBody: string;
  smartReviewGating: boolean;
  autoFollowUpEnabled: boolean;
};

const defaultSettings: Omit<ReviewSettings, "googleReviewLink"> = {
  businessName: "",
  businessCategory: "",
  businessLogoUrl: "",
  privateFeedbackUrl: "",
  emailSubject: "A quick favor, {Customer_Name}?",
  emailBody: `Hi {Customer_Name},\n\nThanks for choosing {Business_Name}. If you have a moment, would you share how your visit went? Your feedback helps our team and other people in the community.\n\n${starRatingWidgetToken}\n\nThank you,\nThe {Business_Name} team`,
  smartReviewGating: true,
  autoFollowUpEnabled: false,
};

export default function SettingsClient({
  businessId,
  initialSettings,
  planTier,
  siteOrigin,
}: {
  businessId: string;
  initialSettings: Partial<ReviewSettings>;
  planTier: string | null;
  siteOrigin: string;
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(initialSettings.businessName ?? defaultSettings.businessName);
  const [businessCategory, setBusinessCategory] = useState(
    initialSettings.businessCategory || "Other local business",
  );
  const [businessLogoUrl, setBusinessLogoUrl] = useState(initialSettings.businessLogoUrl ?? "");
  const [googleReviewLink, setGoogleReviewLink] = useState(initialSettings.googleReviewLink ?? "");
  const [privateFeedbackUrl, setPrivateFeedbackUrl] = useState(initialSettings.privateFeedbackUrl ?? defaultSettings.privateFeedbackUrl);
  const [emailSubject, setEmailSubject] = useState(initialSettings.emailSubject ?? defaultSettings.emailSubject);
  const [emailBody, setEmailBody] = useState(initialSettings.emailBody ?? defaultSettings.emailBody);
  const [smartReviewGating, setSmartReviewGating] = useState(
    initialSettings.smartReviewGating ?? defaultSettings.smartReviewGating,
  );
  const [autoFollowUpEnabled, setAutoFollowUpEnabled] = useState(
    initialSettings.autoFollowUpEnabled ?? defaultSettings.autoFollowUpEnabled,
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  useEffect(() => {
    // Server refreshes replace these persisted values; synchronize their controlled inputs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusinessName(initialSettings.businessName ?? "");
    setBusinessCategory(initialSettings.businessCategory || "Other local business");
    setBusinessLogoUrl(initialSettings.businessLogoUrl ?? "");
    setGoogleReviewLink(initialSettings.googleReviewLink ?? "");
    setPrivateFeedbackUrl(initialSettings.privateFeedbackUrl ?? "");
    setEmailSubject(initialSettings.emailSubject ?? defaultSettings.emailSubject);
    setEmailBody(initialSettings.emailBody ?? defaultSettings.emailBody);
    setSmartReviewGating(initialSettings.smartReviewGating ?? true);
    setAutoFollowUpEnabled(initialSettings.autoFollowUpEnabled ?? false);
  }, [initialSettings]);
  useEffect(() => {
    if (!qrMessage) return;
    const timeout = window.setTimeout(() => setQrMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [qrMessage]);
  const requestIdForPreview = "YOUR_REQUEST_ID";
  const renderedSubject = renderTemplate(emailSubject, "Jordan Lee", businessName);
  const hasRatingWidget = emailBody.includes(starRatingWidgetToken);
  const normalizedBusinessType = businessTypes.some(
    (businessType) => businessType === businessCategory,
  );
  const normalizedTier = normalizeAppSumoTier(planTier);
  const canAutoFollowUp = normalizedTier === "Tier 2" || normalizedTier === "Tier 3";
  const canCustomBrand = canAutoFollowUp;
  const isTier3 = normalizedTier === "Tier 3";
  const posterReviewUrl = siteOrigin ? `${siteOrigin}/b/${businessId}` : "";

  function appendTag(field: "subject" | "email", tag: string) {
    const append = (value: string) => `${value}${value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : ""}${tag}`;
    if (field === "subject") setEmailSubject((value) => append(value));
    if (field === "email") setEmailBody((value) => append(value));
    setSaveMessage("");
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setSaveFailed(false);
    try {
      const result = await saveReviewSettings({
        businessName,
        businessCategory,
        businessLogoUrl,
        googleReviewLink,
        privateFeedbackUrl,
        emailSubject,
        emailBody,
        smartReviewGating,
        autoFollowUpEnabled,
      });
      if (!result.ok) {
        setSaveMessage(result.message);
        setSaveFailed(true);
        return;
      }

      setBusinessCategory(result.businessCategory || "Other local business");
      setGoogleReviewLink(result.googleReviewLink);
      setSaveMessage(result.message);
      setSaveFailed(false);
      router.refresh();
    } catch (error) {
      console.error("Unable to save review settings.", error);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "We couldn't save your settings right now. Please try again.",
      );
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleRatingWidget() {
    setEmailBody((current) => current.includes(starRatingWidgetToken)
      ? current.replace(starRatingWidgetToken, "").replace(/\n{3,}/g, "\n\n").trimEnd()
      : `${current.trimEnd()}\n\n${starRatingWidgetToken}`);
    setSaveMessage("");
  }

  async function copyReviewLink() {
    if (!googleReviewLink.trim() || !posterReviewUrl) {
      setQrMessage("Add your Google link and configure NEXT_PUBLIC_SITE_URL to copy the gated review link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(posterReviewUrl);
      setQrMessage("Link copied!");
    } catch (error) {
      console.error("Unable to copy the Google review link.", error);
      setQrMessage("Clipboard access is unavailable. Select and copy the link manually.");
    }
  }

  function downloadReviewQr() {
    const qr = document.getElementById("settings-review-qr")?.querySelector("canvas");
    if (!qr || !posterReviewUrl || !googleReviewLink.trim()) {
      setQrMessage("Save a Google review link to generate the gated review poster.");
      return;
    }

    try {
      const poster = document.createElement("canvas");
      poster.width = 1600;
      poster.height = 2200;
      const context = poster.getContext("2d");
      if (!context) throw new Error("Poster rendering is unavailable.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, poster.width, poster.height);
      context.fillStyle = "#151710";
      context.textAlign = "center";
      context.font = "600 68px Arial, sans-serif";
      context.fillText(businessName.trim() || "Your business", 800, 390, 1320);
      context.fillStyle = "#3e4632";
      context.font = "500 44px Arial, sans-serif";
      context.fillText("Scan to Leave Us a Review", 800, 505);
      const qrSize = 920;
      context.drawImage(qr, (poster.width - qrSize) / 2, 620, qrSize, qrSize);
      context.fillStyle = "#e7b648";
      context.font = "600 88px Arial, sans-serif";
      context.fillText("★ ★ ★ ★ ★", 800, 1730);
      context.fillStyle = "#59604c";
      context.font = "400 34px Arial, sans-serif";
      context.fillText("Thank you for sharing your experience", 800, 1820);
      if (!canAutoFollowUp) {
        context.fillStyle = "#8b8e82";
        context.font = "400 24px Arial, sans-serif";
        context.fillText("Powered by TableSignal", 800, 2070);
      }

      const fileUrl = poster.toDataURL("image/png");
      const anchor = document.createElement("a");
      const safeName = businessName.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "business";
      anchor.href = fileUrl;
      anchor.download = `${safeName}-review-poster.png`;
      anchor.click();
      setQrMessage("Your high-resolution review poster was downloaded.");
    } catch (error) {
      console.error("Unable to download the review QR code.", error);
      setQrMessage("We couldn't download the QR code. Please try again.");
    }
  }

  const inputClass = "settings-input h-10 w-full rounded-[5px] border border-zinc-800 bg-[#09090b] px-3 text-[11px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10";
  const textareaClass = "settings-textarea w-full resize-y rounded-[5px] border border-zinc-800 bg-[#09090b] px-3 py-3 text-[11px] leading-[1.7] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10";

  return (
      <div className="settings-page mx-auto max-w-[1380px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <form noValidate onSubmit={saveSettings}>
              <section className="settings-hero mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="settings-eyebrow">Workspace preferences</p>
                  <h1>Settings &amp; templates</h1>
                  <p>Shape how every review request sounds and looks.</p>
                </div>
                <button className="settings-save inline-flex h-10 w-fit items-center gap-2 rounded-[5px] bg-emerald-400 px-4 text-[11px] font-semibold text-[#07110c] transition-colors hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 disabled:cursor-wait disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save changes"} <span aria-hidden="true">&#8599;</span></button>
              </section>

              {saveMessage && <div aria-live="polite" className={`settings-save-message fixed bottom-5 right-5 z-50 flex w-[min(26rem,calc(100vw-2.5rem))] items-start gap-2 rounded-[12px] border px-4 py-3 text-[11px] leading-5 shadow-lg ${saveFailed ? "settings-save-error border-rose-400/25 bg-rose-400/[0.08] text-rose-200" : "settings-save-success border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200"}`} role={saveFailed ? "alert" : "status"}><span aria-hidden="true" className="font-semibold">{saveFailed ? "!" : "✓"}</span><span>{saveMessage}</span></div>}

              <div className="settings-layout grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(330px,0.92fr)]">
                <div className="settings-sections space-y-3">
                  <section aria-labelledby="business-heading" className="settings-section rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="settings-section-heading mb-4 border-b border-zinc-800 pb-3">
                      <p className="settings-section-eyebrow settings-section-teal">01 / Business identity</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="business-heading">Business profile &amp; Google link</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Used to personalize requests and direct customers to your review page.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><FieldLabel htmlFor="business-name">Business name</FieldLabel><input autoComplete="organization" className={inputClass} id="business-name" maxLength={120} onChange={(event) => { setBusinessName(event.target.value); setSaveMessage(""); }} value={businessName} /></div>
                      <div><FieldLabel htmlFor="business-category">Business type</FieldLabel><select className={inputClass} id="business-category" onChange={(event) => { setBusinessCategory(event.target.value); setSaveMessage(""); }} value={normalizedBusinessType ? businessCategory : businessCategory || "Other local business"}>{businessCategory && !normalizedBusinessType && <option value={businessCategory}>{businessCategory}</option>}{businessTypes.map((businessType) => <option key={businessType} value={businessType}>{businessType}</option>)}</select></div>
                      <div><FieldLabel htmlFor="google-link">Google Business Profile review URL</FieldLabel><input className={inputClass} id="google-link" onChange={(event) => { setGoogleReviewLink(event.target.value); setSaveMessage(""); }} placeholder="https://g.page/r/.../review" type="url" value={googleReviewLink} /></div>
                      {canCustomBrand && <div className="sm:col-span-2"><FieldLabel htmlFor="business-logo">Business logo URL (optional)</FieldLabel><input className={inputClass} id="business-logo" onChange={(event) => { setBusinessLogoUrl(event.target.value); setSaveMessage(""); }} placeholder="https://yourdomain.com/logo.png" type="url" value={businessLogoUrl} /><p className="mt-1.5 text-[9px] leading-4 text-zinc-600">Used on your customer-facing review page and branded QR materials.</p></div>}
                      <div className="sm:col-span-2"><FieldLabel htmlFor="private-feedback-link">Private feedback form URL</FieldLabel><input className={inputClass} id="private-feedback-link" onChange={(event) => { setPrivateFeedbackUrl(event.target.value); setSaveMessage(""); }} placeholder="https://... or /feedback/private" value={privateFeedbackUrl} /><p className="mt-1.5 text-[9px] leading-4 text-zinc-600">Stars 1–3 send customers here for private follow-up.</p></div>
                    </div>
                  </section>

                  <section aria-labelledby="gating-heading" className="settings-section rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="settings-section-heading mb-4 border-b border-zinc-800 pb-3">
                      <p className="settings-section-eyebrow settings-section-teal">SMART REVIEW FLOW</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="gating-heading">Review experience</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Choose how customers are routed after they rate their visit.</p>
                    </div>
                    <label className="flex items-start justify-between gap-5">
                      <span>
                        <span className="block text-[11px] font-medium text-zinc-200">Smart Review Gating</span>
                        <span className="mt-1 block max-w-xl text-[10px] leading-5 text-zinc-500">When enabled, 4–5 stars go to Google and 1–3 stars open a private feedback form.</span>
                      </span>
                      <input
                        aria-label="Enable Smart Review Gating"
                        checked={smartReviewGating}
                        className="mt-1 size-4 accent-emerald-400"
                        onChange={(event) => setSmartReviewGating(event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                    <label className={`mt-5 flex items-start justify-between gap-5 border-t border-zinc-800 pt-4 ${canAutoFollowUp ? "" : "opacity-60"}`}>
                      <span>
                        <span className="block text-[11px] font-medium text-zinc-200">Automatic follow-up reminder</span>
                        <span className="mt-1 block max-w-xl text-[10px] leading-5 text-zinc-500">
                          {canAutoFollowUp
                            ? isTier3
                              ? "Send polite reminders on day 3 and day 7 if the customer has not opened their review link."
                              : "Send one polite reminder 3 days later if the customer has not opened their review link."
                            : "Available on AppSumo Tier 2 and Tier 3."}
                        </span>
                      </span>
                      <input
                        aria-label="Enable automatic follow-up"
                        checked={autoFollowUpEnabled}
                        className="mt-1 size-4 accent-emerald-400"
                        disabled={!canAutoFollowUp}
                        onChange={(event) => setAutoFollowUpEnabled(event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  </section>

                  <section aria-labelledby="settings-qr-heading" className="settings-section rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="settings-section-heading mb-4 border-b border-zinc-800 pb-3">
                      <p className="settings-section-eyebrow settings-section-teal">REVIEW TOOLS</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="settings-qr-heading">Review link &amp; QR code</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">The QR code opens your Smart Review Gating page. Save changes to apply the Google destination to customer reviews.</p>
                    </div>
                    <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_176px]">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <button className="settings-save inline-flex h-10 items-center gap-2 rounded-[5px] bg-emerald-400 px-4 text-[11px] font-semibold text-[#07110c] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={!googleReviewLink.trim() || !posterReviewUrl} onClick={() => void copyReviewLink()} type="button">Copy gated review link</button>
                          <button className="inline-flex h-10 items-center gap-2 rounded-[5px] border border-zinc-700 px-4 text-[11px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={!googleReviewLink.trim() || !posterReviewUrl} onClick={downloadReviewQr} type="button">Download printable poster PNG <span aria-hidden="true">↓</span></button>
                        </div>
                        <p aria-live="polite" className="mt-3 min-h-5 text-[10px] leading-5 text-emerald-300" role="status">{qrMessage}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex size-[160px] items-center justify-center rounded-[5px] bg-white p-2" id="settings-review-qr">
                          {googleReviewLink.trim() && posterReviewUrl
                            ? <><QRCodeSVG bgColor="#ffffff" fgColor="#10110f" level="M" size={144} value={posterReviewUrl} /><div className="hidden"><QRCodeCanvas bgColor="#ffffff" fgColor="#10110f" level="H" size={800} value={posterReviewUrl} /></div></>
                            : <p className="px-4 text-center text-[10px] text-zinc-500">{!siteOrigin ? "Configure NEXT_PUBLIC_SITE_URL to generate a QR code." : "Add your review link to generate a QR code."}</p>}
                        </div>
                        <p className="mt-3 max-w-[176px] truncate text-[10px] font-medium text-zinc-300">{businessName || "Your business"} · {businessCategory || "Business"}</p>
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="email-heading" className="settings-section rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="settings-section-heading mb-4 border-b border-zinc-800 pb-3">
                      <p className="settings-section-eyebrow settings-section-blue">02 / Email channel</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="email-heading">Email review request</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Write a personal note that invites a customer to share feedback.</p>
                    </div>
                    <div className="space-y-4">
                      <div><FieldLabel htmlFor="email-subject">Email subject</FieldLabel><input className={inputClass} id="email-subject" onChange={(event) => { setEmailSubject(event.target.value); setSaveMessage(""); }} value={emailSubject} /></div>
                      <div><div className="mb-2 flex items-center justify-between gap-2"><FieldLabel htmlFor="email-body">Email body</FieldLabel><span className="text-[9px] text-zinc-600">Dynamic tags</span></div><textarea className={`${textareaClass} min-h-[190px]`} id="email-body" onChange={(event) => { setEmailBody(event.target.value); setSaveMessage(""); }} value={emailBody} /></div>
                      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[9px] text-zinc-500">Insert into email:</span><TokenButton onClick={() => appendTag("email", "{Customer_Name}")} token="{Customer_Name}" /><TokenButton onClick={() => appendTag("email", "{Business_Name}")} token="{Business_Name}" /><TokenButton onClick={() => appendTag("email", "{Google_Review_Link}")} token="{Google_Review_Link}" /><TokenButton onClick={() => appendTag("email", starRatingWidgetToken)} token={starRatingWidgetToken} /></div>
                      <div className="settings-widget-box rounded-[5px] border border-indigo-400/20 bg-indigo-400/[0.045] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-medium text-indigo-100">1-Click Star Rating Widget</p><p className="mt-1 text-[9px] text-zinc-500">{hasRatingWidget ? "Included in this email template." : "Add five rating links to the email body."}</p></div><button className={`inline-flex h-8 items-center rounded-[4px] border px-3 text-[9px] font-medium transition-colors ${hasRatingWidget ? "border-zinc-700 text-zinc-300 hover:border-rose-400/40 hover:text-rose-300" : "border-indigo-300/30 text-indigo-200 hover:bg-indigo-300/10"}`} onClick={toggleRatingWidget} type="button">{hasRatingWidget ? "Remove widget" : "Insert widget"}</button></div>
                        <p className="mt-2 text-[9px] leading-4 text-zinc-400">Stars 4–5 record the rating then redirect to your saved Google review URL. Stars 1–3 open a private feedback page linked to this review request.</p>
                      </div>
                    </div>
                  </section>

                </div>

                <aside aria-labelledby="preview-heading" className="settings-preview-aside lg:sticky lg:top-5">
                  <section className="settings-preview-card overflow-hidden rounded-[6px] border border-zinc-800 bg-[#101013]">
                    <div className="settings-preview-header flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5">
                      <div><p className="settings-preview-eyebrow">Live preview</p><h2 id="preview-heading">Customer view</h2></div>
                      <span className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Updating</span>
                    </div>

                    <div className="settings-preview-email border-b border-zinc-800 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Email inbox</p><span className="rounded-[3px] bg-indigo-400/10 px-2 py-1 text-[8px] text-indigo-200">New message</span></div>
                      <div className="settings-email-frame overflow-hidden rounded-[6px] border border-zinc-800 bg-[#0b0b0e]">
                        <div className="settings-email-head flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5"><span className="settings-email-avatar flex size-6 items-center justify-center rounded-full bg-indigo-400/15 text-[8px] font-semibold text-indigo-200">{(businessName.trim()[0] || "B").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-medium text-zinc-200">{businessName || "Your Business"}</p><p className="text-[8px] text-zinc-500">to Jordan Lee <span className="mx-1">&bull;</span> now</p></div><span className="text-[8px] text-zinc-600">&#9734;</span></div>
                        <div className="px-3 py-3 sm:px-4"><h3 className="break-words text-[11px] font-semibold leading-5 text-zinc-100">{renderedSubject || "Your email subject"}</h3><div className="mt-3 whitespace-pre-wrap break-words text-[9px] leading-[1.8] text-zinc-300">{emailBody.split(starRatingWidgetToken).map((segment, index, segments) => <Fragment key={index}>{renderTemplate(segment, "Jordan Lee", businessName).replaceAll("{Google_Review_Link}", googleReviewLink || "Your Google review link")}{index < segments.length - 1 && <div className="my-3 rounded-[5px] border border-zinc-700 bg-[#111115] p-2.5"><p className="mb-2 text-[8px] font-medium text-zinc-400">How was your experience?</p><div className="grid grid-cols-5 gap-1">{[1, 2, 3, 4, 5].map((rating) => { const destination = publicReviewUrl(requestIdForPreview, rating); const description = rating >= 4 ? "Google Business Profile review form" : "private feedback form"; return <a aria-label={`${rating}-star rating, opens the ${description}`} className="inline-flex min-h-8 items-center justify-center gap-0.5 rounded-[4px] border border-zinc-700 bg-zinc-900 text-[9px] font-medium text-zinc-200 transition-colors hover:border-amber-300/50 hover:bg-amber-300/10 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/40" href={destination} key={rating} rel="noreferrer" target="_blank"><span aria-hidden="true" className="text-amber-300">&#9733;</span>{rating}</a>; })}</div></div>}</Fragment>)}</div><p className="mt-3 text-[8px] text-zinc-600">Sent by {businessName || "Your Business"}</p></div>
                      </div>
                    </div>

                  </section>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[8px] text-zinc-600"><span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" /> Email</span><span>All changes preview instantly</span><span>Preview uses a request ID placeholder.</span></div>
                </aside>
              </div>

              <footer className="flex flex-col gap-2 py-6 text-[9px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                <p>TableSignal &middot; Local reputation, made manageable.</p>
                <p>Template previews use sample customer details.</p>
              </footer>
              </form>
          </div>
  );
}
