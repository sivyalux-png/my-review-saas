"use client";

import { useState, type FormEvent } from "react";

const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15";
const labelClassName = "block text-[11px] font-medium text-zinc-300";

export default function SignupOnboarding() {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  function handleManualSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "Account creation is not connected yet. Sign in with an account that has been added in Supabase Auth.",
    );
  }

  function handleGoogleLicenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "Google sign-in and AppSumo license activation are not connected. No account or license was created.",
    );
  }

  return (
    <>
      <button
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 px-5 text-[13px] font-semibold text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        onClick={() => setIsLicenseModalOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.1 7.14-10.13 7.14-17.56Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.89l-7.62-5.91c-2.11 1.42-4.81 2.27-8.29 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] text-zinc-500">Or continue with email</span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form className="space-y-4" onSubmit={handleManualSignup}>
        <div>
          <label className={labelClassName} htmlFor="signup-name">Full Name</label>
          <input
            autoComplete="name"
            className={inputClassName}
            id="signup-name"
            name="name"
            placeholder="Alex Morgan"
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
            name="licenseCode"
            placeholder="e.g. TABLE-LTD-9872"
            required
          />
        </div>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-zinc-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          type="submit"
        >
          Create Account &amp; Activate Lifetime Access
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p aria-live="polite" className="mt-4 min-h-5 text-[11px] leading-5 text-amber-200" role="status">
        {message}
      </p>

      <p className="mt-5 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[10px] leading-5 text-amber-100/80" role="note">
        Preview flow: authentication and AppSumo license activation are not connected yet. Do not enter real account credentials or license codes.
      </p>

      {isLicenseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsLicenseModalOpen(false);
          }}
        >
          <section
            aria-labelledby="license-modal-heading"
            aria-modal="true"
            className="relative my-auto w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl shadow-black/50 sm:p-8"
            role="dialog"
          >
            <button
              aria-label="Close license activation dialog"
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-400"
              onClick={() => setIsLicenseModalOpen(false)}
              type="button"
            >
              ×
            </button>
            <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-xl text-emerald-300" aria-hidden="true">
              ✦
            </div>
            <h2 className="pr-7 text-xl font-semibold tracking-tight text-zinc-50" id="license-modal-heading">
              Activate Your AppSumo License
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-zinc-400">
              Enter your AppSumo purchase code to unlock your Lifetime Access tier.
            </p>
            <form className="mt-6" onSubmit={handleGoogleLicenseSubmit}>
              <label className={labelClassName} htmlFor="google-license-code">AppSumo License Key</label>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                className={inputClassName}
                id="google-license-code"
                name="licenseCode"
                placeholder="e.g. TABLE-LTD-9872"
                required
              />
              <button
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-indigo-500 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                type="submit"
              >
                Activate &amp; Go to Dashboard
              </button>
              <p aria-live="polite" className="mt-3 text-[11px] leading-5 text-amber-200" role="status">
                {message}
              </p>
            </form>
            <p className="mt-4 text-[10px] leading-5 text-zinc-500">
              Preview only. Google sign-in and license activation are not connected yet.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
