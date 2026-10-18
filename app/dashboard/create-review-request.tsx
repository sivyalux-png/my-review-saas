"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createReviewRequest } from "./requests/actions";

type CreateReviewRequestProps = {
  creditsRemaining: number;
  onCreditsChanged: (creditsRemaining: number) => void;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

const inputClass =
  "mt-2 h-11 w-full rounded-[5px] border border-white/[0.12] bg-[#10110f] px-3.5 text-[12px] text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10";
const textareaClass =
  "mt-2 min-h-28 w-full resize-y rounded-[5px] border border-white/[0.12] bg-[#10110f] px-3.5 py-3 text-[12px] leading-5 text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10";

export default function CreateReviewRequest({
  creditsRemaining,
  onCreditsChanged,
}: CreateReviewRequestProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const result = await createReviewRequest(customerName, contact, notes, "");
      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      onCreditsChanged(result.creditsRemaining);
      setCustomerName("");
      setContact("");
      setNotes("");
      setIsOpen(false);
      setToast({
        id: Date.now(),
        message: `Review request created for ${customerName.trim()}. 1 credit used.`,
        type: "success",
      });
      router.refresh();
    } catch (error) {
      console.error("Unable to create a review request.", error);
      setFormError("We couldn't create the request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="inline-flex h-10 w-fit items-center gap-2 rounded-[5px] bg-[#c7f36b] px-4 text-[11px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7f36b]"
        onClick={() => {
          setFormError("");
          setIsOpen(true);
        }}
        type="button"
      >
        Create a review request <span aria-hidden="true">↗</span>
      </button>

      <dialog
        aria-labelledby="create-request-heading"
        aria-describedby="create-request-description"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[8px] border border-white/[0.12] bg-[#171814] p-0 text-[#f3f2e9] shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onCancel={(event) => {
          event.preventDefault();
          if (!isSubmitting) setIsOpen(false);
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-5 border-b border-white/[0.08] pb-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#c7f36b]">Customer outreach</p>
              <h2 className="mt-2 text-[20px] font-medium tracking-[-0.035em]" id="create-request-heading">Create a review request</h2>
              <p className="mt-2 text-[11px] leading-5 text-[#929188]" id="create-request-description">Add a customer to your review queue. Creating a request uses 1 available credit.</p>
            </div>
            <button
              aria-label="Close dialog"
              className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-lg text-[#929188] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-[#c7f36b]"
              disabled={isSubmitting}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <form className="space-y-4" onSubmit={submitRequest}>
            <label className="block text-[10px] font-medium text-[#b9b8ae]" htmlFor="request-customer-name">
              Customer name
              <input
                autoComplete="name"
                className={inputClass}
                id="request-customer-name"
                maxLength={120}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="e.g. Jamie Rivera"
                required
                value={customerName}
              />
            </label>

            <label className="block text-[10px] font-medium text-[#b9b8ae]" htmlFor="request-customer-contact">
              Phone number or email
              <input
                autoComplete="email"
                className={inputClass}
                id="request-customer-contact"
                maxLength={254}
                onChange={(event) => setContact(event.target.value)}
                placeholder="jamie@example.com or (555) 012-3456"
                required
                type="text"
                value={contact}
              />
            </label>

            <label className="block text-[10px] font-medium text-[#b9b8ae]" htmlFor="request-notes">
              Notes <span className="font-normal text-[#77786f]">(optional)</span>
              <textarea
                className={textareaClass}
                id="request-notes"
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any context for this request…"
                value={notes}
              />
            </label>

            <div className="flex items-center justify-between gap-3 rounded-[5px] border border-white/[0.08] bg-[#10110f] px-3.5 py-3">
              <span className="text-[10px] text-[#929188]">Available credits</span>
              <span className="text-[11px] font-medium text-[#c7f36b]">{creditsRemaining.toLocaleString()}</span>
            </div>

            {creditsRemaining < 1 && (
              <p className="rounded-[5px] border border-[#edbd65]/20 bg-[#edbd65]/[0.06] px-3.5 py-3 text-[10px] leading-5 text-[#edbd65]">
                You have no credits available. Activate or top up a plan before creating a request.
              </p>
            )}

            {formError && (
              <p aria-live="polite" className="rounded-[5px] border border-[#ee9b8b]/20 bg-[#ee9b8b]/[0.06] px-3.5 py-3 text-[10px] leading-5 text-[#ee9b8b]" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-[5px] border border-white/[0.12] px-4 text-[10px] font-medium text-[#c4c3b9] transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[5px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || creditsRemaining < 1}
                type="submit"
              >
                {isSubmitting ? "Creating request…" : "Create request"}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {toast && (
        <div
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-5 right-5 z-50 flex max-w-[calc(100%-2.5rem)] items-center gap-3 rounded-[6px] border px-4 py-3 text-[11px] shadow-xl ${
            toast.type === "success"
              ? "border-[#c7f36b]/25 bg-[#171814] text-[#dff7b2]"
              : "border-[#ee9b8b]/25 bg-[#171814] text-[#ee9b8b]"
          }`}
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true">{toast.type === "success" ? "✓" : "!"}</span>
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            className="ml-1 text-base text-[#929188] hover:text-white"
            onClick={() => setToast(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
