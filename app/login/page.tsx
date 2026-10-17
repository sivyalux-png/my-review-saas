import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "../ui/auth-form";

export const metadata: Metadata = {
  title: "Log in | TableSignal",
  description: "Log in to your TableSignal local business review workspace.",
};

export default function LoginPage() {
  return (
    <main className="hero-grid relative min-h-screen overflow-hidden bg-[#10110f] text-[#f3f2e9]">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link aria-label="TableSignal home" className="flex items-center gap-3" href="/">
          <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">table<span className="text-[#c7f36b]">signal</span></span>
        </Link>
        <span className="text-[11px] text-[#85857c]">For local business teams</span>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-7xl items-center gap-14 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-20 lg:px-12 lg:py-14">
        <aside className="hidden max-w-[560px] lg:block">
          <p className="section-kicker"><span>YOUR REPUTATION, IN VIEW</span></p>
          <h1 className="mt-7 text-[clamp(3rem,5.5vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.065em]">Every review,<br />within reach.</h1>
          <p className="mt-6 max-w-[450px] text-[15px] leading-7 text-[#aaa99f]">One calm workspace for customer feedback, thoughtful replies, and the local businesses that make a neighborhood.</p>
          <div className="mt-8 flex flex-wrap gap-2" aria-label="Industries served">
            <span className="topic-pill">Clinics</span><span className="topic-pill">Salons</span><span className="topic-pill">Fitness</span><span className="topic-pill">Restaurants</span><span className="topic-pill">Auto</span><span className="topic-pill">Dental</span>
          </div>
          <div className="mt-12 flex items-center gap-4 border-t border-white/[0.1] pt-6">
            <span className="text-[27px] font-medium tracking-[-0.06em] text-[#c7f36b]">2,400+</span>
            <span className="max-w-[150px] text-[11px] leading-5 text-[#929188]">local teams building trust, one reply at a time</span>
          </div>
        </aside>

        <section aria-labelledby="login-heading" className="login-glass-panel mx-auto w-full max-w-[420px]">
          <p className="section-kicker"><span>WELCOME BACK</span></p>
          <h2 className="mt-4 text-[32px] font-medium leading-tight tracking-[-0.05em]" id="login-heading">Sign in to TableSignal</h2>
          <p className="mt-2 mb-8 text-[13px] leading-6 text-[#929188]">Pick up where your team left off.</p>
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}