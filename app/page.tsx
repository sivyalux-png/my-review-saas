export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#10110f] text-[#f3f2e9]">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label="TableSignal home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">table<span className="text-[#c7f36b]">signal</span></span>
        </a>
        <nav className="hidden items-center gap-6 text-[13px] text-[#aaa99f] lg:flex" aria-label="Main navigation">
          <a className="transition-colors hover:text-white" href="#platform">Platform</a>
          <a className="transition-colors hover:text-white" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-white" href="#stories">Stories</a>
          <a className="transition-colors hover:text-white" href="#pricing">Pricing</a>
        </nav>
        <a href="/signup" className="inline-flex h-10 items-center gap-2 rounded-[5px] border border-[#c7f36b]/40 px-4 text-[12px] font-semibold text-[#c7f36b] transition-colors hover:bg-[#c7f36b]/10">
          Redeem Code <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section id="top" className="hero-grid relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="relative z-10 max-w-[560px] animate-rise">
          <div className="mb-7 inline-flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7f36b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c7f36b] shadow-[0_0_12px_#c7f36b]" />
            Reputation automation for local businesses
          </div>
          <h1 className="max-w-[660px] text-[clamp(3.25rem,7vw,6.2rem)] font-medium leading-[0.96] tracking-[-0.065em] text-[#f3f2e9]">
            Local reviews,<br />routed in <span className="font-serif italic text-[#c7f36b]">one click.</span>
          </h1>
          <p className="mt-7 max-w-[445px] text-[15px] leading-7 text-[#aaa99f] sm:text-[16px]">
            Manage every location from one place and make it effortless for customers to leave a Google review with smart, one-click review routing.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#pricing" className="inline-flex h-12 items-center justify-center gap-3 rounded-[5px] bg-[#c7f36b] px-5 text-[13px] font-semibold text-[#171a11] transition-transform hover:-translate-y-0.5 hover:bg-[#d8ff8e]">
              Get Lifetime Access <span aria-hidden="true">↓</span>
            </a>
            <a href="/signup" className="inline-flex h-12 items-center justify-center gap-2 px-4 text-[13px] font-medium text-[#d8d7ce] transition-colors hover:text-[#c7f36b]">
              Redeem AppSumo Code <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 rounded-[4px] border border-[#c7f36b]/20 bg-[#c7f36b]/[0.06] px-3 py-2 text-[10px] font-medium text-[#dff7b2]">
            <span aria-hidden="true" className="text-[#c7f36b]">✓</span>
            Official AppSumo Partner Deal - 60-Day Money Back Guarantee
          </p>
          <div className="mt-10 flex items-center gap-3 text-[11px] text-[#8d8d83]">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="avatar avatar-one">M</span><span className="avatar avatar-two">J</span><span className="avatar avatar-three">A</span>
            </div>
            <span><strong className="font-semibold text-[#deddd3]">2,400+</strong> teams serving better experiences</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] animate-rise-delayed lg:ml-auto">
          <div className="dashboard-glow absolute -inset-10 -z-10" />
          <div className="overflow-hidden rounded-[8px] border border-white/[0.11] bg-[#191a17] shadow-[0_32px_100px_rgba(0,0,0,0.5)]">
            <div className="flex h-[52px] items-center justify-between border-b border-white/[0.08] px-4 sm:px-5">
              <div className="flex items-center gap-2.5"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /><span /><span /></span><span className="text-[11px] font-semibold text-[#e6e5dc]">Northstar Health · Midtown</span><span className="hidden rounded-[3px] border border-white/10 px-1.5 py-0.5 text-[9px] text-[#929188] sm:inline">LOCATION 01</span></div>
              <div className="flex items-center gap-2 text-[10px] text-[#a5a49a]"><span className="h-1.5 w-1.5 rounded-full bg-[#c7f36b]" /> Live</div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-b border-white/[0.08]">
              <div className="px-4 py-4 sm:px-5 sm:py-5"><p className="text-[9px] uppercase tracking-[0.13em] text-[#929188]">Average rating</p><div className="mt-2 flex items-baseline gap-2"><span className="text-[26px] font-medium tracking-[-0.06em] text-[#f3f2e9]">4.9</span><span className="text-[11px] text-[#c7f36b]">★ ★ ★ ★ ★</span></div></div>
              <div className="px-4 py-4 sm:px-5 sm:py-5"><p className="text-[9px] uppercase tracking-[0.13em] text-[#929188]">Reviews this month</p><div className="mt-2 flex items-baseline gap-2"><span className="text-[26px] font-medium tracking-[-0.06em] text-[#f3f2e9]">186</span><span className="text-[10px] text-[#c7f36b]">↑ 18%</span></div></div>
              <div className="px-4 py-4 sm:px-5 sm:py-5"><p className="text-[9px] uppercase tracking-[0.13em] text-[#929188]">Reply rate</p><div className="mt-2 flex items-baseline gap-2"><span className="text-[26px] font-medium tracking-[-0.06em] text-[#f3f2e9]">98<span className="text-[16px]">%</span></span><span className="hidden text-[10px] text-[#929188] sm:inline">this month</span></div></div>
            </div>
            <div className="grid lg:grid-cols-[1fr_190px]">
              <div className="border-b border-white/[0.08] p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] font-medium text-[#f0efe7]">Recent reviews</p><p className="mt-1 text-[10px] text-[#85857c]">Your customers are talking</p></div><span className="rounded-[3px] border border-white/[0.1] px-2 py-1 text-[9px] text-[#bab9af]">All channels⌄</span></div>
                <div className="space-y-2.5">
                  <article className="rounded-[5px] border border-white/[0.08] bg-[#20211d] p-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="review-source source-google">G</span><span className="text-[10px] font-medium text-[#deddd3]">Sofia R.</span><span className="text-[9px] text-[#7f8076]">· 12 min ago</span></div><span className="text-[10px] tracking-[0.08em] text-[#edbd65]">★★★★★</span></div>
                    <p className="mt-2 text-[10px] leading-[1.6] text-[#b6b5ab]">“Dr. Patel explained every step and made me feel completely at ease. The whole team was wonderful.”</p>
                    <div className="mt-2.5 flex items-center justify-between"><span className="text-[9px] text-[#85857c]">Google · Clinic visit</span><span className="rounded-[3px] bg-[#c7f36b]/10 px-2 py-1 text-[9px] font-medium text-[#c7f36b]">Reply suggested</span></div>
                  </article>
                  <article className="rounded-[5px] border border-white/[0.08] bg-[#20211d] p-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="review-source source-yelp">y</span><span className="text-[10px] font-medium text-[#deddd3]">Marcus T.</span><span className="text-[9px] text-[#7f8076]">· 38 min ago</span></div><span className="text-[10px] tracking-[0.08em] text-[#edbd65]">★★★★<span className="text-[#5c5c54]">★</span></span></div>
                    <p className="mt-2 text-[10px] leading-[1.6] text-[#b6b5ab]">“Best haircut I’ve had in years. Jamie listened to exactly what I wanted and nailed it.”</p>
                    <div className="mt-2.5 flex items-center justify-between"><span className="text-[9px] text-[#85857c]">Yelp · Salon visit</span><span className="flex items-center gap-1.5 text-[9px] text-[#a9a89e]"><span className="h-1.5 w-1.5 rounded-full bg-[#c7f36b]" /> Replied</span></div>
                  </article>
                  <div className="flex items-center justify-center gap-2 py-1 text-[9px] text-[#898980]"><span className="flex gap-0.5" aria-hidden="true"><i className="processing-dot" /><i className="processing-dot processing-dot-two" /><i className="processing-dot processing-dot-three" /></span> Listening across 4 platforms</div>
                </div>
              </div>
              <aside className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between"><p className="text-[11px] font-medium text-[#f0efe7]">Customer sentiment</p><span className="text-[9px] text-[#85857c]">30 days</span></div>
                <div className="sentiment-chart relative flex h-[93px] items-end gap-[5px] border-b border-l border-white/[0.1] px-2 pb-0">
                  <span className="chart-line chart-line-one" /><span className="chart-line chart-line-two" />
                  <i style={{ height: "38%" }} /><i style={{ height: "55%" }} /><i style={{ height: "48%" }} /><i style={{ height: "67%" }} /><i style={{ height: "57%" }} /><i style={{ height: "74%" }} /><i style={{ height: "65%" }} /><i style={{ height: "82%" }} /><i style={{ height: "77%" }} /><i style={{ height: "92%" }} /><i style={{ height: "84%" }} /><i style={{ height: "100%" }} />
                </div>
                <div className="mt-2 flex justify-between pl-2 text-[8px] text-[#797a70]"><span>Aug 01</span><span>Aug 30</span></div>
                <div className="mt-5 border-t border-white/[0.08] pt-4"><p className="text-[9px] uppercase tracking-[0.12em] text-[#85857c]">Most mentioned</p><div className="mt-2.5 flex flex-wrap gap-1.5"><span className="topic-pill">Care <b>+24</b></span><span className="topic-pill">Staff <b>+18</b></span><span className="topic-pill">Wait time <b>+12</b></span></div></div>
              </aside>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161713] px-4 py-3 sm:px-5"><div className="flex items-center gap-2 text-[9px] text-[#a5a49a]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c7f36b]/10 text-[10px] text-[#c7f36b]">✦</span> 3 new reviews are ready for your reply</div><span className="text-[9px] font-medium text-[#c7f36b]">Open inbox <span aria-hidden="true">→</span></span></div>
          </div>
          <div className="absolute -bottom-5 -left-6 hidden items-center gap-3 rounded-[6px] border border-white/10 bg-[#20211d] px-4 py-3 shadow-xl sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c7f36b]/10 text-sm text-[#c7f36b]">↗</span><span><span className="block text-[9px] text-[#95958a]">This week</span><span className="mt-0.5 block text-[11px] font-medium text-[#e9e8df]">Reputation is up <span className="text-[#c7f36b]">18%</span></span></span></div>
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#151612]" aria-label="Platform integrations and results">
        <div className="mx-auto grid w-full max-w-7xl gap-7 px-5 py-7 sm:px-8 lg:grid-cols-[1.15fr_2fr] lg:items-center lg:px-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#85857c]">One clear picture, across every location</p>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-[13px] font-semibold tracking-[-0.03em] text-[#cfcec4]"><span className="flex items-center gap-2"><b className="text-[15px] text-[#f3f2e9]">G</b> Google</span><span className="flex items-center gap-2"><b className="text-[17px] font-black text-[#ef6b55]">y</b> Yelp</span><span>Facebook</span><span>Healthgrades</span><span className="text-[11px] font-medium text-[#aaa99f]">+ more</span></div>
        </div>
      </section>

      <section id="platform" className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24 lg:px-12 lg:py-32">
        <div className="max-w-[430px]"><p className="section-kicker"><span>01</span> A better kind of listening</p><h2 className="mt-6 text-[clamp(2.6rem,5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.06em]">Keep the good.<br /><span className="text-[#c7f36b]">Catch the rest.</span></h2><p className="mt-6 text-[14px] leading-7 text-[#aaa99f]">Your customers leave feedback everywhere. Bring it into one calm, clear workspace, then put what you learn back into the experience.</p><a href="#how-it-works" className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold text-[#c7f36b] transition-colors hover:text-[#e0ffa3]">See how it works <span aria-hidden="true">→</span></a></div>
        <div className="grid gap-px self-center border border-white/[0.09] bg-white/[0.09] sm:grid-cols-2">
          <article className="min-h-[180px] bg-[#10110f] p-6 sm:p-7"><span className="feature-icon">01</span><h3 className="mt-8 text-[15px] font-medium text-[#eeede4]">Every review, together</h3><p className="mt-2 text-[12px] leading-6 text-[#929188]">Google, Yelp, Healthgrades and more, gathered into a single live inbox.</p></article>
          <article className="min-h-[180px] bg-[#10110f] p-6 sm:p-7"><span className="feature-icon feature-icon-warm">02</span><h3 className="mt-8 text-[15px] font-medium text-[#eeede4]">Replies that sound like you</h3><p className="mt-2 text-[12px] leading-6 text-[#929188]">On-brand suggestions help your team answer quickly, without losing the human touch.</p></article>
          <article className="min-h-[180px] bg-[#10110f] p-6 sm:p-7"><span className="feature-icon feature-icon-coral">03</span><h3 className="mt-8 text-[15px] font-medium text-[#eeede4]">Small signals, spotted early</h3><p className="mt-2 text-[12px] leading-6 text-[#929188]">See the themes behind your feedback before they become bigger problems.</p></article>
          <article className="min-h-[180px] bg-[#10110f] p-6 sm:p-7"><span className="feature-icon feature-icon-blue">04</span><h3 className="mt-8 text-[15px] font-medium text-[#eeede4]">Every location in view</h3><p className="mt-2 text-[12px] leading-6 text-[#929188]">Compare what is working across your business locations with one consistent view.</p></article>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/[0.08] bg-[#171814]">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><p className="section-kicker"><span>02</span> Less chasing. More time for customers.</p><h2 className="mt-5 max-w-[540px] text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.03] tracking-[-0.06em]">The right things happen <span className="font-serif italic text-[#c7f36b]">naturally.</span></h2></div><p className="max-w-[350px] text-[13px] leading-6 text-[#aaa99f]">Automation gives your team more time to focus on customers. Set it up once; stay in the loop as your reputation grows.</p></div>
          <div className="mt-12 grid border-y border-white/[0.1] sm:grid-cols-3 sm:divide-x sm:divide-white/[0.1]">
            <article className="py-7 sm:pr-8"><span className="text-[10px] font-semibold text-[#c7f36b]">01 / CONNECT</span><h3 className="mt-4 text-[16px] font-medium text-[#eeede4]">Your reviews, in one place</h3><p className="mt-2 max-w-[260px] text-[12px] leading-6 text-[#929188]">Connect your review platforms and TableSignal starts listening.</p></article>
            <article className="border-t border-white/[0.1] py-7 sm:border-t-0 sm:px-8"><span className="text-[10px] font-semibold text-[#edbd65]">02 / RESPOND</span><h3 className="mt-4 text-[16px] font-medium text-[#eeede4]">Every customer gets heard</h3><p className="mt-2 max-w-[260px] text-[12px] leading-6 text-[#929188]">Get thoughtful reply suggestions and a gentle nudge when needed.</p></article>
            <article className="border-t border-white/[0.1] py-7 sm:border-t-0 sm:pl-8"><span className="text-[10px] font-semibold text-[#ee826e]">03 / IMPROVE</span><h3 className="mt-4 text-[16px] font-medium text-[#eeede4]">Turn feedback into next steps</h3><p className="mt-2 max-w-[260px] text-[12px] leading-6 text-[#929188]">Share emerging themes with the people who shape the customer experience.</p></article>
          </div>
        </div>
      </section>

      <section id="stories" className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-24 lg:px-12 lg:py-28">
        <figure className="relative overflow-hidden rounded-[6px] border border-white/[0.1] bg-[#20211d] p-7 sm:p-10"><span className="absolute right-7 top-5 font-serif text-[100px] leading-none text-[#c7f36b]/10">“</span><div className="flex gap-1 text-[13px] text-[#edbd65]" aria-label="5 out of 5 stars">★★★★★</div><blockquote className="relative mt-6 max-w-[590px] text-[clamp(1.35rem,2.5vw,2rem)] font-medium leading-[1.35] tracking-[-0.04em] text-[#eeede4]">“We used to find out about a bad review days later. Now we see the full picture across our locations, and our managers can actually do something with it.”</blockquote><figcaption className="mt-8 flex items-center gap-3"><span className="avatar avatar-four">LC</span><span><span className="block text-[11px] font-medium text-[#e4e3da]">Lauren Chen</span><span className="mt-1 block text-[10px] text-[#929188]">Operations Director, Northstar Wellness Group</span></span></figcaption></figure>
        <div><p className="section-kicker"><span>03</span> Built for local business</p><h2 className="mt-6 text-[clamp(2.5rem,4.5vw,3.8rem)] font-medium leading-[1.03] tracking-[-0.06em]">Your customers feel the difference.</h2><p className="mt-5 text-[13px] leading-7 text-[#aaa99f]">A better reputation is not just a higher star rating. It is the details your team catches, the customer who comes back, and the thoughtful reply that turns a moment around.</p><div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/[0.1] pt-6"><div><p className="text-[30px] font-medium tracking-[-0.06em] text-[#c7f36b]">4.9<span className="ml-1 text-[13px] text-[#aaa99f]">/ 5</span></p><p className="mt-1 text-[10px] text-[#929188]">Average customer rating</p></div><div><p className="text-[30px] font-medium tracking-[-0.06em] text-[#edbd65]">3×</p><p className="mt-1 text-[10px] text-[#929188]">Faster response time</p></div></div></div>
      </section>

      <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-white/[0.08] bg-[#151612] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-kicker justify-center"><span>APPSUMO LIFETIME DEAL</span></p>
            <h2 id="pricing-heading" className="mt-5 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.03] tracking-[-0.06em]">One payment. <span className="font-serif italic text-[#c7f36b]">Yours for good.</span></h2>
            <p className="mt-4 text-[13px] leading-6 text-[#aaa99f]">Choose the lifetime plan that fits your business. No recurring subscription.</p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <article className="flex flex-col rounded-[6px] border border-white/[0.1] bg-[#10110f] p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#aaa99f]">Tier 1</p>
              <p className="mt-5 text-[42px] font-medium leading-none tracking-[-0.06em]">$69<span className="ml-2 text-[12px] font-normal tracking-normal text-[#929188]">/ lifetime</span></p>
              <p className="mt-3 text-[11px] text-[#c7f36b]">Pay Once, Own Forever</p>
              <ul className="mt-7 flex-1 space-y-3 border-t border-white/[0.09] pt-6 text-[12px] text-[#cfcec4]">
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 1 business location</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 1,000 initial email credits</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Basic star routing</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Email channel</li>
              </ul>
              <a href="/signup" className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[4px] border border-white/[0.16] text-[12px] font-semibold text-[#f3f2e9] transition-colors hover:border-[#c7f36b]/50 hover:text-[#c7f36b]">Acquire Deal <span aria-hidden="true">↗</span></a>
            </article>
            <article className="relative flex flex-col rounded-[6px] border border-[#c7f36b]/45 bg-[#191c14] p-6 sm:p-7">
              <span className="absolute right-5 top-5 rounded-[3px] bg-[#c7f36b] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#171a11]">Popular</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c7f36b]">Tier 2</p>
              <p className="mt-5 text-[42px] font-medium leading-none tracking-[-0.06em]">$99<span className="ml-2 text-[12px] font-normal tracking-normal text-[#929188]">/ lifetime</span></p>
              <p className="mt-3 text-[11px] text-[#c7f36b]">Pay Once, Own Forever</p>
              <ul className="mt-7 flex-1 space-y-3 border-t border-white/[0.09] pt-6 text-[12px] text-[#cfcec4]">
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 3 business locations</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 5,000 initial email credits</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Custom branding</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Email channel</li>
              </ul>
              <a href="/signup" className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[4px] bg-[#c7f36b] text-[12px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e]">Acquire Deal <span aria-hidden="true">↗</span></a>
            </article>
            <article className="flex flex-col rounded-[6px] border border-white/[0.1] bg-[#10110f] p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#aaa99f]">Tier 3</p>
              <p className="mt-5 text-[42px] font-medium leading-none tracking-[-0.06em]">$189<span className="ml-2 text-[12px] font-normal tracking-normal text-[#929188]">/ lifetime</span></p>
              <p className="mt-3 text-[11px] text-[#c7f36b]">Pay Once, Own Forever</p>
              <ul className="mt-7 flex-1 space-y-3 border-t border-white/[0.09] pt-6 text-[12px] text-[#cfcec4]">
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 10 business locations</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 10,000 initial email credits</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> 500 SMS / WhatsApp credits</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Email, SMS, and WhatsApp channels</li>
                <li className="flex gap-2"><span className="text-[#c7f36b]">✓</span> Priority support</li>
              </ul>
              <a href="/signup" className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[4px] border border-white/[0.16] text-[12px] font-semibold text-[#f3f2e9] transition-colors hover:border-[#c7f36b]/50 hover:text-[#c7f36b]">Acquire Deal <span aria-hidden="true">↗</span></a>
            </article>
          </div>
          <p className="mt-5 text-center text-[10px] leading-5 text-[#85857c]">Purchase your deal on AppSumo, then redeem your code with your TableSignal account.</p>
        </div>
      </section>

      <section id="appsumo-faq" aria-labelledby="faq-heading" className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <div className="text-center">
          <p className="section-kicker justify-center"><span>CODE STACKING &amp; SUPPORT</span></p>
          <h2 id="faq-heading" className="mt-5 text-[clamp(2.3rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.06em]">AppSumo deal <span className="font-serif italic text-[#c7f36b]">FAQ.</span></h2>
        </div>
        <div className="mt-10 divide-y divide-white/[0.1] border-y border-white/[0.1]">
          <details className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-[14px] font-medium text-[#eeede4] marker:content-none">How do I redeem my code?<span aria-hidden="true" className="text-lg text-[#c7f36b] transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#aaa99f]">Create your TableSignal account with the Redeem Code button, then open Plan &amp; credits. License activation is not connected yet, so <a className="text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com">contact support</a> to arrange redemption of your AppSumo code.</p>
          </details>
          <details className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-[14px] font-medium text-[#eeede4] marker:content-none">Can I upgrade tiers later?<span aria-hidden="true" className="text-lg text-[#c7f36b] transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#aaa99f]">If code stacking is available for this AppSumo campaign, purchase additional codes and redeem them on the same TableSignal account to move to a higher tier. Check the AppSumo deal terms for stacking limits or contact <a className="text-[#c7f36b] hover:text-[#e0ffa3]" href="mailto:hello@tablesignal.com">support</a> before purchasing extra codes.</p>
          </details>
          <details className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-[14px] font-medium text-[#eeede4] marker:content-none">What is the refund policy?<span aria-hidden="true" className="text-lg text-[#c7f36b] transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#aaa99f]">Your AppSumo purchase is covered by a 60-day money-back guarantee. Request a refund through AppSumo within 60 days of purchase, in accordance with their refund policy.</p>
          </details>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-5 border-t border-white/[0.08] px-5 py-7 text-[10px] text-[#85857c] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><a href="#top" className="flex items-center gap-2.5 text-[12px] font-semibold tracking-[-0.03em] text-[#d9d8cf]"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /><span /><span /></span>table<span className="-ml-2 text-[#c7f36b]">signal</span></a><p>Thoughtful replies. Stronger local businesses.</p><nav className="flex items-center gap-5" aria-label="Footer navigation"><a className="transition-colors hover:text-[#c7f36b]" href="#pricing">Lifetime deal</a><a className="transition-colors hover:text-[#c7f36b]" href="/signup">Redeem Code</a></nav><p>© 2026 TableSignal, Inc.</p></footer>
    </main>
  );
}
