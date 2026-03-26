import Link from 'next/link';
import {
  Target, BrainCircuit, ShieldCheck,
  Sparkles, Layers, MousePointer2, Users, Clock, Brain,
} from 'lucide-react';
import ScrollyHero from '@/components/marketing/ScrollyHero';

export default function Home() {
  return (
    <div className="flex flex-col bg-[#060610] text-white">

      {/* ── SCROLLYTELLING HERO (0–500vh sticky canvas) ── */}
      <ScrollyHero />

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <section className="py-20 border-y border-white/6 bg-[#0a0a1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Issues found', value: '852k+', icon: Target },
              { label: 'AI users created', value: '42k+', icon: Users },
              { label: 'Testing hours saved', value: '125k', icon: Clock },
              { label: 'Accuracy rate', value: '99.4%', icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="space-y-3 group">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-white/90">{stat.value}</p>
                  <p className="text-sm text-white/40">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="px-6 py-32 bg-[#060610]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <div className="max-w-xl space-y-4">
              <h2
                className="text-5xl md:text-6xl font-bold tracking-tight leading-tight"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, #a5b4fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Built for teams<br />who care about UX.
              </h2>
            </div>
            <p className="max-w-sm text-lg text-white/45 border-l-2 border-indigo-500/40 pl-6">
              &ldquo;We replaced manual testing with Specter. It&apos;s like having 1,000 users testing your site 24/7.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Target}
              title="Spot where users get stuck"
              description="AI users browse just like real people — noticing confusing layouts, unclear buttons, and broken flows before you go live."
              accent="#6366f1"
            />
            <FeatureCard
              icon={Sparkles}
              title="Powered by advanced AI"
              description="Built on top of the latest AI models to create realistic, thoughtful user behavior that mirrors your actual audience."
              accent="#10b981"
            />
            <FeatureCard
              icon={Layers}
              title="Runs anywhere"
              description="Test on your own machine or scale to thousands of AI users in our cloud. No infrastructure setup needed — just a URL."
              accent="#f59e0b"
            />
          </div>
        </div>
      </section>

      {/* ── SEE THEM THINK ────────────────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/8 bg-[#0d0d20] p-12 md:p-24 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-xs font-medium text-indigo-400">
                <MousePointer2 className="h-3.5 w-3.5" />
                Watch AI users in action
              </div>
              <h2
                className="text-5xl md:text-6xl font-bold tracking-tight leading-tight"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, #a5b4fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                See exactly what<br />they&apos;re thinking.
              </h2>
              <div className="space-y-5">
                {[
                  'Read real-time thoughts from AI users as they browse',
                  'See how emotions shift while they navigate your site',
                  'Pinpoint exactly where people get confused or give up',
                  'Download clear, actionable reports',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-5 w-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    </div>
                    <span className="text-lg text-white/55">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thought card */}
            <div className="rounded-2xl border border-white/10 bg-white/4 p-8 space-y-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">Skeptical Founder</p>
                    <p className="text-xs text-emerald-500 font-medium">Step 4 of 12</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-red-500/12 border border-red-500/25 text-xs font-medium text-red-400">
                  Frustrated
                </span>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/4 border border-white/8 text-sm text-white/55 leading-relaxed">
                  &ldquo;I&apos;ve been looking for the pricing page for 45 seconds. There&apos;s too much text and I just want to know if this fits my budget. If I don&apos;t find it in the next 2 clicks, I&apos;m leaving.&rdquo;
                </div>
                <div className="flex items-center gap-3 pl-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs text-white/28">AI user&apos;s thoughts</span>
                </div>
              </div>

              {/* Mini thought chain */}
              <div className="space-y-2">
                {[
                  { icon: Brain, label: 'Noticed missing CTA', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                  { icon: MousePointer2, label: 'Clicked nav — wrong page', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                ].map((t, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t.bg}`}>
                    <t.icon className={`h-3.5 w-3.5 ${t.color} shrink-0`} />
                    <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div
          className="mx-auto max-w-4xl rounded-3xl p-16 md:p-24 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.08) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10 space-y-8">
            <h2
              className="text-5xl md:text-6xl font-bold tracking-tight leading-tight"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Start testing smarter today.
            </h2>
            <p className="max-w-xl mx-auto text-lg text-white/50 leading-relaxed">
              Run your first test in under 5 minutes. Just paste a URL — no setup needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.35)',
                }}
              >
                Start for free
              </Link>
              <Link
                href="/pricing"
                className="text-white/45 text-sm font-medium hover:text-white/75 transition-all"
              >
                Compare plans →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="relative p-8 rounded-2xl border border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5 transition-all duration-300 group">
      <div className="space-y-5">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center border"
          style={{
            background: `${accent}18`,
            borderColor: `${accent}30`,
            color: accent,
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white/88">{title}</h3>
          <p className="text-base text-white/45 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
