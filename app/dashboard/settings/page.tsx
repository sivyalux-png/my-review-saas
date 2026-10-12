"use client";

import { Fragment, useState } from "react";

const messageLimit = 320;
const starRatingWidgetToken = "{Star_Rating_Widget}";

function renderTemplate(template: string, customerName: string, businessName: string) {
  return template
    .replaceAll("{Customer_Name}", customerName || "Customer Name")
    .replaceAll("{Business_Name}", businessName || "Your Business");
}

function addRatingParameter(url: string, rating: number) {
  try {
    const parsedUrl = new URL(url, "https://tablesignal.invalid");
    parsedUrl.searchParams.set("rating", String(rating));
    return url.startsWith("/") ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` : parsedUrl.toString();
  } catch {
    return url;
  }
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label className="mb-2 block text-[11px] font-medium text-zinc-300" htmlFor={htmlFor}>{children}</label>;
}

function TokenButton({ onClick, token }: { onClick: () => void; token: string }) {
  return <button className="rounded-[4px] border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-indigo-300 transition-colors hover:border-indigo-400/50 hover:bg-indigo-400/10" onClick={onClick} type="button">{token}</button>;
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("Northstar Health");
  const [googleReviewLink, setGoogleReviewLink] = useState("https://g.page/r/northstar-health/review");
  const [privateFeedbackUrl, setPrivateFeedbackUrl] = useState("/feedback/private");
  const [emailSubject, setEmailSubject] = useState("A quick favor, {Customer_Name}?");
  const [emailBody, setEmailBody] = useState(`Hi {Customer_Name},\n\nThanks for choosing {Business_Name}. If you have a moment, would you share how your visit went? Your feedback helps our team and other people in the community.\n\n${starRatingWidgetToken}\n\nThank you,\nThe {Business_Name} team`);
  const [messageBody, setMessageBody] = useState("Hi {Customer_Name}! Thanks for visiting {Business_Name}. Would you share a quick review? {Google_Review_Link}");
  const [saveMessage, setSaveMessage] = useState("");

  const renderedSubject = renderTemplate(emailSubject, "Jordan Lee", businessName);
  const renderedMessage = renderTemplate(messageBody, "Jordan", businessName).replaceAll("{Google_Review_Link}", googleReviewLink || "Your Google review link");
  const hasRatingWidget = emailBody.includes(starRatingWidgetToken);

  function appendTag(field: "subject" | "email" | "message", tag: string) {
    const append = (value: string) => `${value}${value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : ""}${tag}`;
    if (field === "subject") setEmailSubject((value) => append(value));
    if (field === "email") setEmailBody((value) => append(value));
    if (field === "message") setMessageBody((value) => append(value));
    setSaveMessage("");
  }

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("Changes saved for this page session. They are not synced to an account yet.");
  }

  function toggleRatingWidget() {
    setEmailBody((current) => current.includes(starRatingWidgetToken)
      ? current.replace(starRatingWidgetToken, "").replace(/\n{3,}/g, "\n\n").trimEnd()
      : `${current.trimEnd()}\n\n${starRatingWidgetToken}`);
    setSaveMessage("");
  }

  const inputClass = "h-10 w-full rounded-[5px] border border-zinc-800 bg-[#09090b] px-3 text-[11px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10";
  const textareaClass = "w-full resize-y rounded-[5px] border border-zinc-800 bg-[#09090b] px-3 py-3 text-[11px] leading-[1.7] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10";

  return (
      <div className="mx-auto max-w-[1380px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <form onSubmit={saveSettings}>
              <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300">Workspace preferences</p>
                  <h1 className="mt-2 text-[28px] font-medium leading-tight sm:text-[32px]">Settings &amp; templates</h1>
                  <p className="mt-2 text-[12px] text-zinc-400">Shape how every review request sounds and looks.</p>
                </div>
                <button className="inline-flex h-10 w-fit items-center gap-2 rounded-[5px] bg-emerald-400 px-4 text-[11px] font-semibold text-[#07110c] transition-colors hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/50" type="submit">Save changes <span aria-hidden="true">&#8599;</span></button>
              </section>

              {saveMessage && <div aria-live="polite" className="mb-5 flex items-start gap-2 rounded-[5px] border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-[11px] leading-5 text-emerald-200" role="alert"><span aria-hidden="true" className="font-semibold">&#10003;</span><span>{saveMessage}</span></div>}

              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
                <div className="space-y-5">
                  <section aria-labelledby="business-heading" className="rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="mb-5 border-b border-zinc-800 pb-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">01 / Business identity</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="business-heading">Business profile &amp; Google link</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Used to personalize requests and direct customers to your review page.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><FieldLabel htmlFor="business-name">Business name</FieldLabel><input autoComplete="organization" className={inputClass} id="business-name" onChange={(event) => { setBusinessName(event.target.value); setSaveMessage(""); }} value={businessName} /></div>
                      <div><FieldLabel htmlFor="google-link">Google Business Profile review URL</FieldLabel><input className={inputClass} id="google-link" onChange={(event) => { setGoogleReviewLink(event.target.value); setSaveMessage(""); }} placeholder="https://g.page/r/.../review" type="url" value={googleReviewLink} /></div>
                      <div className="sm:col-span-2"><FieldLabel htmlFor="private-feedback-link">Private feedback form URL</FieldLabel><input className={inputClass} id="private-feedback-link" onChange={(event) => { setPrivateFeedbackUrl(event.target.value); setSaveMessage(""); }} placeholder="https://... or /feedback/private" value={privateFeedbackUrl} /><p className="mt-1.5 text-[9px] leading-4 text-zinc-600">Stars 1–3 send customers here for private follow-up.</p></div>
                    </div>
                  </section>

                  <section aria-labelledby="email-heading" className="rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="mb-5 border-b border-zinc-800 pb-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-indigo-300">02 / Email channel</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="email-heading">Email review request</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Write a personal note that invites a customer to share feedback.</p>
                    </div>
                    <div className="space-y-4">
                      <div><FieldLabel htmlFor="email-subject">Email subject</FieldLabel><input className={inputClass} id="email-subject" onChange={(event) => { setEmailSubject(event.target.value); setSaveMessage(""); }} value={emailSubject} /></div>
                      <div><div className="mb-2 flex items-center justify-between gap-2"><FieldLabel htmlFor="email-body">Email body</FieldLabel><span className="text-[9px] text-zinc-600">Dynamic tags</span></div><textarea className={`${textareaClass} min-h-[190px]`} id="email-body" onChange={(event) => { setEmailBody(event.target.value); setSaveMessage(""); }} value={emailBody} /></div>
                      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[9px] text-zinc-500">Insert into email:</span><TokenButton onClick={() => appendTag("email", "{Customer_Name}")} token="{Customer_Name}" /><TokenButton onClick={() => appendTag("email", "{Business_Name}")} token="{Business_Name}" /><TokenButton onClick={() => appendTag("email", "{Google_Review_Link}")} token="{Google_Review_Link}" /></div>
                      <div className="rounded-[5px] border border-indigo-400/20 bg-indigo-400/[0.045] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-medium text-indigo-100">1-Click Star Rating Widget</p><p className="mt-1 text-[9px] text-zinc-500">{hasRatingWidget ? "Included in this email template." : "Add five rating links to the email body."}</p></div><button className={`inline-flex h-8 items-center rounded-[4px] border px-3 text-[9px] font-medium transition-colors ${hasRatingWidget ? "border-zinc-700 text-zinc-300 hover:border-rose-400/40 hover:text-rose-300" : "border-indigo-300/30 text-indigo-200 hover:bg-indigo-300/10"}`} onClick={toggleRatingWidget} type="button">{hasRatingWidget ? "Remove widget" : "Insert widget"}</button></div>
                        <p className="mt-2 text-[9px] leading-4 text-zinc-400">Customers clicking stars 4 or 5 go directly to your Google Business Profile review form. Stars 1–3 open your private feedback form to catch concerns internally.</p>
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="message-heading" className="rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5">
                    <div className="mb-5 border-b border-zinc-800 pb-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-indigo-300">03 / Mobile channel</p>
                      <h2 className="mt-2 text-[14px] font-medium" id="message-heading">SMS &amp; WhatsApp message</h2>
                      <p className="mt-1 text-[10px] leading-5 text-zinc-500">Keep it brief, friendly, and easy to read on a phone.</p>
                    </div>
                    <FieldLabel htmlFor="message-body">Message text</FieldLabel>
                    <textarea className={`${textareaClass} min-h-[112px]`} id="message-body" maxLength={messageLimit} onChange={(event) => { setMessageBody(event.target.value); setSaveMessage(""); }} value={messageBody} />
                    <div className="mt-2 flex items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><TokenButton onClick={() => appendTag("message", "{Customer_Name}")} token="{Customer_Name}" /><TokenButton onClick={() => appendTag("message", "{Business_Name}")} token="{Business_Name}" /><TokenButton onClick={() => appendTag("message", "{Google_Review_Link}")} token="{Google_Review_Link}" /></div><span className={`shrink-0 text-[9px] tabular-nums ${messageBody.length >= messageLimit ? "text-rose-400" : messageBody.length > 280 ? "text-amber-300" : "text-zinc-500"}`}>{messageBody.length} / {messageLimit}</span></div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"><div aria-hidden="true" className={`h-full rounded-full transition-[width] ${messageBody.length > 280 ? "bg-amber-300" : "bg-indigo-400"}`} style={{ width: `${(messageBody.length / messageLimit) * 100}%` }} /></div>
                    <p className="mt-2 text-[9px] text-zinc-600">320 character limit for this shared SMS / WhatsApp template.</p>
                  </section>

                </div>

                <aside aria-labelledby="preview-heading" className="xl:sticky xl:top-5">
                  <section className="overflow-hidden rounded-[6px] border border-zinc-800 bg-[#101013]">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5">
                      <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Live preview</p><h2 className="mt-1.5 text-[13px] font-medium" id="preview-heading">Customer view</h2></div>
                      <span className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Updating</span>
                    </div>

                    <div className="border-b border-zinc-800 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Email inbox</p><span className="rounded-[3px] bg-indigo-400/10 px-2 py-1 text-[8px] text-indigo-200">New message</span></div>
                      <div className="overflow-hidden rounded-[6px] border border-zinc-800 bg-[#0b0b0e]">
                        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5"><span className="flex size-6 items-center justify-center rounded-full bg-indigo-400/15 text-[8px] font-semibold text-indigo-200">{(businessName.trim()[0] || "B").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-medium text-zinc-200">{businessName || "Your Business"}</p><p className="text-[8px] text-zinc-500">to Jordan Lee <span className="mx-1">&bull;</span> now</p></div><span className="text-[8px] text-zinc-600">&#9734;</span></div>
                        <div className="px-3 py-3 sm:px-4"><h3 className="break-words text-[11px] font-semibold leading-5 text-zinc-100">{renderedSubject || "Your email subject"}</h3><div className="mt-3 whitespace-pre-wrap break-words text-[9px] leading-[1.8] text-zinc-300">{emailBody.split(starRatingWidgetToken).map((segment, index, segments) => <Fragment key={index}>{renderTemplate(segment, "Jordan Lee", businessName).replaceAll("{Google_Review_Link}", googleReviewLink || "Your Google review link")}{index < segments.length - 1 && <div className="my-3 rounded-[5px] border border-zinc-700 bg-[#111115] p-2.5"><p className="mb-2 text-[8px] font-medium text-zinc-400">How was your experience?</p><div className="grid grid-cols-5 gap-1">{[1, 2, 3, 4, 5].map((rating) => { const isGoogleReview = rating >= 4; const destination = isGoogleReview ? googleReviewLink : addRatingParameter(privateFeedbackUrl, rating); const description = isGoogleReview ? "Google Business Profile review form" : "private feedback form"; return <a aria-label={`${rating}-star rating, opens the ${description}`} className="inline-flex min-h-8 items-center justify-center gap-0.5 rounded-[4px] border border-zinc-700 bg-zinc-900 text-[9px] font-medium text-zinc-200 transition-colors hover:border-amber-300/50 hover:bg-amber-300/10 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/40" href={destination} key={rating} rel="noreferrer" target="_blank"><span aria-hidden="true" className="text-amber-300">&#9733;</span>{rating}</a>; })}</div></div>}</Fragment>)}</div><p className="mt-3 text-[8px] text-zinc-600">Sent by {businessName || "Your Business"}</p></div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">SMS / WhatsApp</p><span className="text-[8px] text-zinc-600">Mobile preview</span></div>
                      <div className="mx-auto w-full max-w-[270px] rounded-[25px] border border-zinc-700 bg-[#08080a] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                        <div className="overflow-hidden rounded-[19px] border border-zinc-800 bg-[#111115]">
                          <div className="flex items-center justify-between px-4 pb-2 pt-3 text-[8px] font-medium text-zinc-300"><span>9:41</span><span aria-hidden="true">LTE &nbsp; &#9646;&#9646;&#9646; &nbsp; &#9632;</span></div>
                          <div className="border-b border-zinc-800 px-3 pb-3 pt-1 text-center"><p className="text-[8px] text-zinc-500">Message</p><p className="mt-1 text-[10px] font-semibold text-zinc-100">{businessName || "Your Business"}</p></div>
                          <div className="flex min-h-[168px] flex-col justify-end gap-3 px-2.5 py-3">
                            <p className="self-center rounded-full bg-zinc-800/80 px-2.5 py-1 text-[7px] text-zinc-500">Today 9:41 AM</p>
                            <div className="max-w-[88%] self-start rounded-[12px] rounded-bl-[4px] bg-zinc-800 px-3 py-2 text-[9px] leading-[1.6] text-zinc-100">{renderedMessage || "Your customer message will appear here."}</div>
                          </div>
                          <div className="flex items-center gap-2 border-t border-zinc-800 px-2.5 py-2.5"><span className="flex size-5 items-center justify-center rounded-full border border-zinc-700 text-[10px] text-zinc-500">+</span><span className="min-w-0 flex-1 truncate rounded-full border border-zinc-800 bg-[#0b0b0e] px-3 py-1.5 text-[8px] text-zinc-600">Text message</span><span className="text-[8px] text-emerald-400">Send</span></div>
                          <div className="mx-auto mb-1.5 mt-1 h-1 w-16 rounded-full bg-zinc-600" />
                        </div>
                      </div>
                      <p className="mx-auto mt-3 max-w-[270px] text-center text-[8px] leading-4 text-zinc-600">Preview uses Jordan Lee and the current business profile. Tags resolve when a request is sent.</p>
                    </div>
                  </section>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[8px] text-zinc-600"><span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" /> Email</span><span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-indigo-400" /> SMS / WhatsApp</span><span>All changes preview instantly</span></div>
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
