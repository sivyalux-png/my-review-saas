"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

const inputClassName = "mt-2 h-12 w-full rounded-[5px] border border-white/[0.12] bg-[#171814] px-3.5 text-[13px] text-[#f3f2e9] outline-none transition-colors placeholder:text-[#6e6f65] focus:border-[#c7f36b]/70 focus:ring-2 focus:ring-[#c7f36b]/10";
const labelClassName = "block text-[11px] font-medium text-[#d9d8cf]";

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      const target = next ? new URL(next, window.location.origin) : null;
      const destination =
        target?.origin === window.location.origin
          ? `${target.pathname}${target.search}${target.hash}`
          : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {isSignup && (
          <>
            <div>
              <label className={labelClassName} htmlFor="full-name">Full name</label>
              <input className={inputClassName} autoComplete="name" id="full-name" name="name" placeholder="Alex Morgan" required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="business-name">Business name</label>
              <input className={inputClassName} autoComplete="organization" id="business-name" name="business" placeholder="Northstar Health" required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="industry">Business type</label>
              <select className={`${inputClassName} appearance-none`} defaultValue="" id="industry" name="industry" required>
                <option disabled value="">Select your industry</option>
                <option value="healthcare">Clinic or healthcare</option>
                <option value="dental">Dental</option>
                <option value="salon">Salon or spa</option>
                <option value="fitness">Gym or fitness</option>
                <option value="restaurant">Restaurant or cafe</option>
                <option value="automotive">Auto service</option>
                <option value="other">Other local business</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className={labelClassName} htmlFor="email">Work email</label>
          <input className={inputClassName} autoComplete="email" id="email" name="email" placeholder="you@business.com" required type="email" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="password">Password</label>
          <input className={inputClassName} autoComplete={isSignup ? "new-password" : "current-password"} id="password" minLength={isSignup ? 8 : undefined} name="password" placeholder={isSignup ? "At least 8 characters" : "Enter your password"} required type="password" />
        </div>
        {!isSignup && (
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="flex items-center gap-2 text-[11px] text-[#aaa99f]">
              <input className="size-4 accent-[#c7f36b]" name="remember" type="checkbox" />
              Keep me signed in
            </label>
            <a className="text-[11px] text-[#c7f36b] transition-colors hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com?subject=Password%20reset%20help">Forgot password?</a>
          </div>
        )}
        <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-[#c7f36b] px-5 text-[13px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7f36b] disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : isSignup ? "Create your account" : "Sign in"}
          <span aria-hidden="true">↗</span>
        </button>
        <p aria-live="polite" className="min-h-4 text-[11px] leading-5 text-[#edbd65]" role="status">{message}</p>
      </form>
      <p className="mt-5 text-center text-[12px] text-[#929188]">
        {isSignup ? "Already have an account?" : "New to TableSignal?"}{" "}
        <Link className="font-medium text-[#c7f36b] transition-colors hover:text-[#e0ffa3]" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}