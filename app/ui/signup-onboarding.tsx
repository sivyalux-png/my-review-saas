"use client";

import { useActionState } from "react";
import { signUp } from "../signup/actions";

const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15";
const labelClassName = "block text-[11px] font-medium text-zinc-300";

export default function SignupOnboarding({
  initialError,
}: {
  initialError?: string;
}) {
  const [state, formAction, isPending] = useActionState(signUp, {
    error: initialError,
  });

  return (
    <>
      <form action={formAction} className="space-y-4">
        <div>
          <label className={labelClassName} htmlFor="signup-name">Full Name</label>
          <input
            autoComplete="name"
            className={inputClassName}
            id="signup-name"
            maxLength={120}
            name="name"
            placeholder="Alex Morgan"
            required
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="signup-business">Business Name</label>
          <input
            autoComplete="organization"
            className={inputClassName}
            id="signup-business"
            maxLength={160}
            name="business"
            placeholder="Northstar Health"
            required
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="signup-email">Work Email</label>
          <input
            autoComplete="email"
            className={inputClassName}
            id="signup-email"
            name="email"
            placeholder="you@business.com"
            required
            type="email"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="signup-password">Password</label>
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="signup-password"
            minLength={8}
            maxLength={72}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="signup-license-code">AppSumo License Code</label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            className={inputClassName}
            id="signup-license-code"
            maxLength={64}
            name="licenseCode"
            placeholder="e.g. TABLE-LTD-9872"
            required
          />
        </div>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-zinc-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Creating your account..." : "Create Account & Activate Lifetime Access"}
          {!isPending && <span aria-hidden="true">↗</span>}
        </button>
      </form>

      <p
        aria-live="polite"
        className={`mt-4 min-h-5 text-[11px] leading-5 ${state.error ? "text-rose-300" : "text-emerald-200"}`}
        role="status"
      >
        {state.error ?? state.notice ?? ""}
      </p>

      <p className="mt-5 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[10px] leading-5 text-amber-100/80" role="note">
        Use an AppSumo key that has been added to this project’s licenses table. Google sign-in is not connected yet.
      </p>
    </>
  );
}
