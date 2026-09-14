import Link from "next/link";
import { ArrowRight, CalendarDays, ChartColumn, Check, Layers, ListOrdered, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { PlatformBadge } from "@/components/platform-badge";
import { APP_NAME } from "@/lib/brand";
import { getUser } from "@/lib/session";
import { PLATFORM_IDS, PLATFORMS } from "@/lib/platforms/meta";

export default async function Landing() {
  const user = await getUser();

  return (
    <div className="overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/app" className="btn-primary">
                Open dashboard <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn hidden text-ink-2 hover:text-ink sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="rule-dots absolute inset-x-0 top-0 h-[520px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pt-16 pb-24 md:pt-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow animate-rise flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-signal" /> One composer · Five networks
            </p>
            <h1 className="animate-rise mt-5 font-display text-[clamp(3rem,7.5vw,5.8rem)] leading-[0.92] tracking-[-0.02em] [animation-delay:80ms]">
              Write it once.
              <br />
              <em className="text-signal">Land</em> everywhere.
            </h1>
            <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-ink-2 [animation-delay:160ms]">
              {APP_NAME} publishes your post to X, LinkedIn, Instagram, Facebook and Threads at the same time. It trims
              each version to fit, schedules it on a calendar, and drafts a week of content from a single topic.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
              <Link href={user ? "/app/compose" : "/signup"} className="btn-signal px-6 py-3 text-base">
                Start posting free <ArrowRight className="size-4" />
              </Link>
              <a href="#how" className="btn-ghost px-6 py-3 text-base">
                See how it works
              </a>
            </div>
            <p className="animate-rise mt-4 font-mono text-xs text-muted [animation-delay:300ms]">
              No card required · Free plan forever · Upgrade when you outgrow it
            </p>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Platform strip */}
      <section className="border-y border-line bg-paper-2/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-6">
          <p className="eyebrow">Publishes natively to</p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {PLATFORM_IDS.map((id) => (
              <li key={id} className="flex items-center gap-2.5 text-sm font-medium text-ink-2">
                <PlatformBadge platform={id} size={24} />
                {PLATFORMS[id].name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-5xl leading-none tracking-tight">
            From idea to five feeds in <em>under a minute.</em>
          </h2>
        </div>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {[
            ["01", "Connect your accounts", "Sign in with each network through its official OAuth flow. We never see your passwords, and your tokens are stored encrypted."],
            ["02", "Compose once", "Write a single post, or let AI draft platform-tuned variations. Check live previews and adjust any network's version on its own."],
            ["03", "Publish or schedule", "Post now, pick a time, or drop it into your queue. Each network publishes on its own, so one error never blocks the others."],
          ].map(([n, t, d]) => (
            <li key={n} className="bg-card p-8">
              <span className="font-mono text-sm text-signal">{n}</span>
              <h3 className="mt-6 text-xl font-semibold">{t}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features bento */}
      <section id="features" className="scroll-mt-20 bg-ink py-24 text-paper">
        <div className="mx-auto max-w-6xl px-5">
          <p className="eyebrow !text-paper/50">Everything in one desk</p>
          <h2 className="mt-3 max-w-3xl font-display text-5xl leading-none tracking-tight">
            A small tool that does the <em className="text-signal">whole job.</em>
          </h2>

          <div className="mt-14 grid gap-4 md:grid-cols-6">
            <Feature
              className="md:col-span-4"
              icon={<Layers className="size-5" />}
              title="Per-platform previews"
              body="See how your post looks as a tweet, a LinkedIn update, or an Instagram caption before it goes live. Character counters warn you before any network truncates your post."
            >
              <div className="mt-6 flex gap-2">
                {PLATFORM_IDS.map((id) => (
                  <div key={id} className="flex-1 rounded-lg border border-paper/10 bg-paper/5 p-2">
                    <PlatformBadge platform={id} size={18} />
                    <div className="mt-2 h-1.5 w-4/5 rounded bg-paper/20" />
                    <div className="mt-1 h-1.5 w-3/5 rounded bg-paper/10" />
                    <p className="mt-2 font-mono text-[10px] text-paper/40">{PLATFORMS[id].charLimit}</p>
                  </div>
                ))}
              </div>
            </Feature>
            <Feature
              className="md:col-span-2"
              icon={<Sparkles className="size-5" />}
              title="A week of content, from a topic"
              body="Type “launching our spring menu” and get seven varied posts: tips, stories, questions and a soft pitch. Save them as drafts or schedule them."
            />
            <Feature
              className="md:col-span-2"
              icon={<CalendarDays className="size-5" />}
              title="Calendar"
              body="See every scheduled and published post by month. Reschedule in two clicks."
            />
            <Feature
              className="md:col-span-2"
              icon={<ListOrdered className="size-5" />}
              title="Smart queue"
              body="Set your weekly posting times once. New posts slot into the next open time on their own."
            />
            <Feature
              className="md:col-span-2"
              icon={<ChartColumn className="size-5" />}
              title="Engagement analytics"
              body="Reach, likes, comments and shares are pulled from each network and shown side by side."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 font-display text-5xl leading-none tracking-tight">Simple, like the product.</h2>
          <p className="mt-4 text-ink-2">Start free. Upgrade when posting becomes a habit.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
          <PriceCard
            name="Starter"
            price="$0"
            blurb="For trying it out and occasional posting."
            features={["3 connected accounts", "15 posts per month", "10 AI generations per month", "Calendar, queue & previews", "Basic analytics"]}
            cta={<Link href="/signup" className="btn-ghost w-full py-3">Create free account</Link>}
          />
          <PriceCard
            featured
            name="Pro"
            price="$19"
            blurb="For creators and small teams posting every week."
            features={["Everything in Starter", "Unlimited connected accounts", "Unlimited posts & scheduling", "300 AI generations per month"]}
            cta={<Link href={user ? "/app/billing" : "/signup?plan=pro"} className="btn-signal w-full py-3">Go Pro</Link>}
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 md:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 font-display text-5xl leading-none tracking-tight">Good questions.</h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {[
              ["Which networks are supported?", "X, LinkedIn (personal profiles), Instagram (Business and Creator accounts), Facebook Pages, and Threads."],
              ["Do you store my social media passwords?", "No. You connect through each network's official OAuth screen. We store only the access tokens those networks issue, encrypted at rest, and you can disconnect at any time."],
              ["Why does Instagram need an image?", "Instagram's publishing API doesn't accept text-only posts, so any post that includes Instagram needs at least one image."],
              ["What happens if one network fails?", "Each network publishes on its own. If X is down, your LinkedIn and Threads posts still go out, and you can retry the failed one with a click."],
              ["Can I cancel anytime?", "Yes. Manage or cancel your subscription from the billing page. You keep Pro until the end of the period you've paid for."],
            ].map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {q}
                  <span className="font-mono text-signal transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-prose leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-signal px-8 py-16 text-white md:px-16">
          <div className="absolute -top-24 -right-24 size-80 rounded-full border-[40px] border-white/10" />
          <div className="absolute -right-4 -bottom-32 size-72 rounded-full border-[28px] border-white/10" />
          <h2 className="relative max-w-2xl font-display text-5xl leading-[0.95] md:text-6xl">
            Stop copy-pasting the same post five times.
          </h2>
          <Link href={user ? "/app/compose" : "/signup"} className="btn relative mt-8 bg-white px-6 py-3 text-base text-ink hover:bg-paper">
            Get started free <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
          <Logo />
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/data-deletion" className="hover:text-ink">Data deletion</Link>
          </nav>
          <p className="font-mono text-xs">© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </footer>
    </div>
  );
}

function HeroVisual() {
  const cards: { id: (typeof PLATFORM_IDS)[number]; text: string; rot: string; pos: string; delay: string }[] = [
    { id: "x", text: "We just shipped dark mode 🌙 Took 3 weeks, 1 very long thread, and zero regrets.", rot: "rotate-[-4deg]", pos: "left-0 top-6", delay: "[animation-delay:500ms]" },
    { id: "linkedin", text: "We just shipped dark mode. Here's the unglamorous part nobody talks about: auditing 214 hard-coded colors…", rot: "rotate-[3deg]", pos: "right-0 top-24", delay: "[animation-delay:650ms]" },
    { id: "threads", text: "dark mode is live. go look at it at 2am like we did", rot: "rotate-[-2deg]", pos: "left-10 bottom-4", delay: "[animation-delay:800ms]" },
  ];
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[520px]" aria-hidden>
      {/* composer */}
      <div className="animate-rise absolute top-0 left-1/2 z-20 w-[88%] -translate-x-1/2 rounded-2xl border border-line bg-card p-4 shadow-lift [animation-delay:250ms]">
        <div className="flex items-center justify-between">
          <p className="eyebrow">New post</p>
          <div className="flex -space-x-1.5">
            {PLATFORM_IDS.map((id) => (
              <PlatformBadge key={id} platform={id} size={20} className="ring-2 ring-card" />
            ))}
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-snug">
          We just shipped dark mode 🌙<span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-blink bg-ink" />
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-2">
            <Sparkles className="size-3 text-signal" /> 3 variations
          </span>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">Tue 9:00 AM</span>
        </div>
      </div>
      {/* fanned previews */}
      <div className="absolute inset-x-0 top-40 bottom-0">
        {cards.map((c) => (
          <div key={c.id} className={`absolute ${c.pos} w-[64%]`}>
            <div className={`animate-fan ${c.delay}`}>
              <div className={`${c.rot} rounded-xl border border-line bg-card p-3.5 shadow-card`}>
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={c.id} size={22} />
                  <span className="text-xs font-semibold">Acme Studio</span>
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-moss">
                    <Check className="size-3" /> posted
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-ink-2">{c.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Feature({
  title,
  body,
  icon,
  className,
  children,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-paper/10 bg-paper/[0.04] p-7 transition hover:bg-paper/[0.07] ${className ?? ""}`}>
      <span className="grid size-10 place-items-center rounded-full bg-signal text-white">{icon}</span>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-2 leading-relaxed text-paper/65">{body}</p>
      {children}
    </div>
  );
}

function PriceCard({
  name,
  price,
  blurb,
  features,
  cta,
  featured,
}: {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div className={`card relative flex flex-col p-8 ${featured ? "border-ink shadow-lift" : ""}`}>
      {featured && (
        <span className="absolute -top-3 right-6 rounded-full bg-signal px-3 py-1 font-mono text-[10px] tracking-widest text-white uppercase">
          Most popular
        </span>
      )}
      <p className="eyebrow">{name}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-6xl">{price}</span>
        <span className="text-muted">/month</span>
      </p>
      <p className="mt-2 text-ink-2">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-moss" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
