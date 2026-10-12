"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type FeedbackFormProps = {
  businessName: string;
  initialContact: string;
  initialContactType: "email" | "tel" | "text";
  rating: number | null;
};

export default function FeedbackForm({
  businessName,
  initialContact,
  initialContactType,
  rating,
}: FeedbackFormProps) {
  const [contact, setContact] = useState(initialContact);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 650);
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#10110f] px-5 text-[#f3f2e9] sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_at_top,rgba(199,243,107,0.09),transparent_66%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between py-6">
        <Link aria-label="TableSignal home" className="flex items-center gap-2.5" href="/">
          <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
          <span className="text-[16px] font-semibold tracking-[-0.04em]">table<span className="text-[#c7f36b]">signal</span></span>
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#aaa99f]">
          <svg aria-hidden="true" className="size-3.5 text-[#c7f36b]" fill="none" viewBox="0 0 16 16">
            <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v7h-9z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
          Private follow-up
        </span>
      </header>

      <section aria-labelledby="feedback-heading" className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center pb-16 pt-8 sm:pb-24">
        <div className="mb-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7f36b]">A note to {businessName}</p>
          <h1 className="mt-3 break-words text-[26px] font-medium leading-tight tracking-[-0.045em] sm:text-[32px]">{businessName}</h1>
        </div>

        <div className="overflow-hidden rounded-[9px] border border-white/[0.1] bg-[#171814]/95 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
          {!isSubmitted ? (
            <div className="p-6 sm:p-9">
              <div className="mb-7 border-b border-white/[0.08] pb-6">
                <div aria-label={rating ? `${rating} out of 5 stars` : "Private feedback"} className="mb-5 flex items-center gap-1" role="img">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span className={`text-[22px] leading-none ${rating && star <= rating ? "text-[#edbd65]" : "text-white/[0.16]"}`} key={star}>★</span>
                  ))}
                  {rating && <span className="ml-2 text-[11px] font-medium text-[#aaa99f]">{rating} out of 5</span>}
                </div>
                <p className="text-[21px] font-medium leading-[1.3] tracking-[-0.035em] text-[#f3f2e9] sm:text-[24px]" id="feedback-heading">
                  We&apos;re sorry we didn&apos;t meet your expectations. Help us improve!
                </p>
                <p className="mt-3 text-[12px] leading-6 text-[#929188]">
                  We value your honesty. Let us know what happened so our team can understand and make things right.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-[11px] font-medium text-[#deddd3]" htmlFor="feedback-message">What could we have done better?</label>
                  <textarea
                    autoFocus
                    className="min-h-[150px] w-full resize-y rounded-[6px] border border-white/[0.12] bg-[#10110f] px-3.5 py-3 text-[13px] leading-6 text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10"
                    id="feedback-message"
                    maxLength={2000}
                    name="message"
                    placeholder="Tell us what went wrong..."
                    required
                  />
                  <p className="mt-2 text-[10px] leading-5 text-[#77786f]">A few details can help us get to the heart of it.</p>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium text-[#deddd3]" htmlFor="feedback-contact">Email or phone <span className="font-normal text-[#77786f]">(optional)</span></label>
                  <input
                    autoComplete={initialContactType === "text" ? "off" : initialContactType}
                    className="h-11 w-full rounded-[6px] border border-white/[0.12] bg-[#10110f] px-3.5 text-[13px] text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10"
                    id="feedback-contact"
                    maxLength={254}
                    name="contact"
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="So we can follow up with you"
                    type={initialContactType}
                    value={contact}
                  />
                  <p className="mt-2 text-[10px] leading-5 text-[#77786f]">Only share this if you&apos;d like us to get back to you.</p>
                </div>

                <button
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#c7f36b] px-5 text-[12px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7f36b] disabled:cursor-wait disabled:opacity-75"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <svg aria-hidden="true" className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      Sending your feedback…
                    </>
                  ) : (
                    <>Submit private feedback <span aria-hidden="true">↗</span></>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div aria-live="polite" className="px-6 py-14 text-center sm:px-10 sm:py-16" role="status">
              <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#c7f36b]/25 bg-[#c7f36b]/[0.08] text-[20px] text-[#c7f36b]">✓</span>
              <h2 className="mt-6 text-[22px] font-medium tracking-[-0.035em] text-[#f3f2e9]">Thank you for speaking up.</h2>
              <p className="mx-auto mt-3 max-w-[380px] text-[12px] leading-6 text-[#aaa99f]">
                Thank you for your feedback. Our team has been notified and will address this immediately.
              </p>
              <p className="mt-7 text-[10px] text-[#77786f]">Your message was sent to {businessName}.</p>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[10px] leading-5 text-[#77786f]">
          Shared directly with the team at {businessName}. Not posted publicly.
        </p>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-white/[0.07] py-5 text-[9px] text-[#77786f]">
        <span>Thoughtful service starts with listening.</span>
        <span className="shrink-0">Powered by <span className="font-medium text-[#aaa99f]">TableSignal</span></span>
      </footer>
    </main>
  );
}
