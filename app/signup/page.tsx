import type { Metadata } from "next";
import Link from "next/link";
import SignupOnboarding from "../ui/signup-onboarding";

export const metadata: Metadata = {
  title: "Create an account | TableSignal",
  description: "Create a TableSignal workspace for your local business and bring every review into one place.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError =
    error === "license"
      ? "We couldn't activate that license. Check the key or contact support."
      : error === "confirmation"
        ? "The confirmation link is invalid or expired. Please request a new link or contact support."
        : undefined;

  return (
    <main className="hero-grid relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link aria-label="TableSignal home" className="flex items-center gap-3" href="/">
          <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">table<span className="text-[#c7f36b]">signal</span></span>
        </Link>
        <span className="text-[11px] text-zinc-500">For local business teams</span>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_440px] lg:gap-20 lg:px-12 lg:py-14">
        <aside className="hidden max-w-[560px] lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">APPSUMO LIFETIME DEAL</p>
          <h1 className="mt-7 text-[clamp(3rem,5.5vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.065em]">Your reviews,<br />within reach <span className="font-serif italic text-indigo-300">forever.</span></h1>
          <p className="mt-6 max-w-[450px] text-[15px] leading-7 text-zinc-400">One calm workspace for customer feedback, thoughtful replies, and every local business location. Activate your deal and make every review count.</p>
          <div className="mt-8 flex flex-wrap gap-2" aria-label="Lifetime deal benefits">
            <span className="rounded-full border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300">Pay once, own forever</span>
            <span className="rounded-full border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300">Smart Google routing</span>
            <span className="rounded-full border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300">Built for local teams</span>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">A little less inbox chasing</p>
            <p className="mt-2 max-w-[370px] text-[13px] leading-6 text-zinc-300">More time for the people who walk through your door.</p>
          </div>
        </aside>

        <section aria-labelledby="signup-heading" className="mx-auto w-full max-w-[440px] rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">GET STARTED</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.05em]" id="signup-heading">Create your account</h2>
          <p className="mt-2 mb-6 text-[12px] leading-6 text-zinc-400">Choose how you’d like to get started and activate your AppSumo lifetime deal.</p>
          <SignupOnboarding initialError={initialError} />
          <p className="mt-5 text-center text-[11px] text-zinc-500">
            Already have an account?{" "}
            <Link className="font-medium text-indigo-300 transition-colors hover:text-indigo-200" href="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}