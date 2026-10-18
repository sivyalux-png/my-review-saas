"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitPublicReview } from "./actions";

export type PublicReviewRequest = {
  id: string;
  customerName: string;
  businessName: string;
  logoUrl: string | null;
  googleReviewUrl: string | null;
  status: string;
  rating: number | null;
};

function safeLogoUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeGoogleReviewUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isGoogleDomain =
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "g.page" ||
      hostname === "maps.app.goo.gl";
    return url.protocol === "https:" && isGoogleDomain ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function PublicReviewPage({
  request,
  initialRating,
  initialSubmitted,
  initialError,
}: {
  request: PublicReviewRequest;
  initialRating: number | null;
  initialSubmitted: boolean;
  initialError: string;
}) {
  const alreadyCompleted = request.status === "completed";
  const [rating, setRating] = useState<number | null>(initialRating ?? request.rating);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitted, setIsSubmitted] = useState(alreadyCompleted || initialSubmitted);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(safeGoogleReviewUrl(request.googleReviewUrl));
  const logoUrl = safeLogoUrl(request.logoUrl);
  const hasLowRating = rating !== null && rating <= 3;
  const isHighRating = rating !== null && rating >= 4;

  async function saveRating(selectedRating: number, comments: string) {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await submitPublicReview(request.id, selectedRating, comments);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setGoogleReviewUrl(result.googleReviewUrl);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Unable to submit public review response.", error);
      setErrorMessage("We couldn't submit your feedback right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === null || rating > 3) return;
    void saveRating(rating, feedback);
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
          Private customer feedback
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center pb-16 pt-8 sm:pb-24">
        <div className="mb-5 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${request.businessName} logo`} className="mx-auto mb-4 size-16 rounded-full border border-white/[0.1] bg-white object-contain p-1.5" referrerPolicy="no-referrer" src={logoUrl} />
          ) : (
            <span aria-hidden="true" className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-[#c7f36b]/25 bg-[#c7f36b]/[0.08] text-xl font-semibold text-[#c7f36b]">
              {request.businessName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7f36b]">How was your experience?</p>
          <h1 className="mt-3 break-words text-[26px] font-medium leading-tight tracking-[-0.045em] sm:text-[32px]">{request.businessName}</h1>
          <p className="mt-2 text-[12px] text-[#929188]">Hi {request.customerName}, we&apos;d love to hear what you think.</p>
        </div>

        <div className="overflow-hidden rounded-[9px] border border-white/[0.1] bg-[#171814]/95 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
          {isSubmitted ? (
            <div aria-live="polite" className="px-6 py-14 text-center sm:px-10 sm:py-16" role="status">
              <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#c7f36b]/25 bg-[#c7f36b]/[0.08] text-[20px] text-[#c7f36b]">✓</span>
              <h2 className="mt-6 text-[22px] font-medium tracking-[-0.035em]">
                {rating !== null && rating <= 3 ? "Thank you for helping us improve." : "Thank you for your feedback!"}
              </h2>
              <p className="mx-auto mt-3 max-w-[380px] text-[12px] leading-6 text-[#aaa99f]">
                {rating !== null && rating <= 3
                  ? `Your private feedback has been shared with ${request.businessName}.`
                  : "We appreciate you taking a moment to share your experience."}
              </p>
              {rating !== null && rating >= 4 && googleReviewUrl && (
                <a
                  className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-[5px] bg-[#c7f36b] px-5 text-[11px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e]"
                  href={googleReviewUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Leave a Google review <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          ) : (
            <div className="p-6 sm:p-9">
              <h2 className="text-center text-[17px] font-medium tracking-[-0.025em]">Rate your experience</h2>
              <p className="mt-2 text-center text-[11px] leading-5 text-[#929188]">Your honest feedback helps {request.businessName} serve you better.</p>

              <div aria-label="Choose a rating from 1 to 5 stars" className="mt-7 flex justify-center gap-1.5 sm:gap-3" role="group">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                    aria-pressed={rating === star}
                    className={`flex size-12 items-center justify-center rounded-[6px] text-[32px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7f36b] sm:size-14 sm:text-[38px] ${rating !== null && star <= rating ? "text-[#edbd65]" : "text-white/[0.22] hover:text-[#edbd65]/70"}`}
                    disabled={isSubmitting}
                    key={star}
                    onClick={() => {
                      setRating(star);
                      setErrorMessage("");
                      if (star >= 4) void saveRating(star, "");
                    }}
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
              <p aria-live="polite" className="mt-3 min-h-5 text-center text-[10px] text-[#aaa99f]">
                {isSubmitting
                  ? "Saving your rating…"
                  : isHighRating
                    ? "Thanks! We’re saving your rating…"
                    : hasLowRating
                      ? "We’re sorry your experience wasn’t great. Tell us how we can improve."
                      : "Tap a star to rate your experience."}
              </p>

              {hasLowRating && (
                <form className="mt-5 space-y-4 border-t border-white/[0.08] pt-5" onSubmit={submitFeedback}>
                  <label className="block text-[11px] font-medium text-[#deddd3]" htmlFor="private-review-feedback">
                    What could we have done better?
                    <textarea
                      autoFocus
                      className="mt-2 min-h-32 w-full resize-y rounded-[6px] border border-white/[0.12] bg-[#10110f] px-3.5 py-3 text-[12px] leading-6 text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10"
                      id="private-review-feedback"
                      maxLength={2000}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Share what happened so the team can make things right…"
                      required
                      value={feedback}
                    />
                  </label>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-[#c7f36b] px-5 text-[11px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-wait disabled:opacity-60"
                    disabled={isSubmitting || !feedback.trim()}
                    type="submit"
                  >
                    {isSubmitting ? "Sending private feedback…" : "Send private feedback"}
                  </button>
                </form>
              )}

              {errorMessage && (
                <p aria-live="assertive" className="mt-4 rounded-[5px] border border-[#ee9b8b]/20 bg-[#ee9b8b]/[0.06] px-3.5 py-3 text-[10px] leading-5 text-[#ee9b8b]" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[10px] leading-5 text-[#77786f]">
          Your rating is shared with {request.businessName}. Written feedback stays private with the business.
        </p>
      </section>
    </main>
  );
}
