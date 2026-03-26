import Link from 'next/link';
import {
  ArrowRight, Target, BrainCircuit,
  ShieldCheck, Globe, Sparkles, Layers, MousePointer2, Activity,
  Users, Clock, Brain, User, History, Meh
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-white overflow-hidden">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-32 text-center bg-gradient-to-b from-slate-50 to-white">

        <div className="relative z-10 space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium text-slate-500">Now available: run tests locally or in the cloud</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-slate-900 leading-[1.05]">
            Find UX issues<br />
            <span className="text-indigo-600">before launch.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-slate-500 leading-relaxed">
            Specter sends AI-powered users to browse your website, click around, and tell you exactly where they get confused — before real customers do.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* ── SESSION MOCKUP ─────────────────────────────────────────────── */}
        <div className="relative mt-20 w-full max-w-6xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-700 delay-300">
          <div className="aspect-[16/10] flex flex-col">

            {/* Browser Bar */}
            <div className="h-11 border-b border-slate-100 bg-slate-50 flex items-center px-5 gap-3 shrink-0">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="h-6 w-72 rounded-md bg-white border border-slate-200 flex items-center px-3 gap-2">
                <Globe className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span className="text-[9px] text-slate-400 font-mono truncate">specter.app · Session Active</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[8px] font-semibold text-emerald-600">
                  <Activity className="h-2 w-2" />
                  Live
                </span>
                <span className="text-[8px] font-medium text-slate-400">Skeptical Founder · Step 4</span>
              </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">

              {/* Left: Website being tested */}
              <div className="flex-[2] relative border-r border-slate-100 overflow-hidden bg-white">
                {/* Fake nav */}
                <div className="h-9 border-b border-slate-100 bg-white flex items-center px-5 gap-5">
                  <div className="h-3.5 w-16 rounded bg-slate-200" />
                  <div className="flex gap-3 ml-auto items-center">
                    <div className="h-2 w-10 rounded bg-slate-100" />
                    <div className="h-2 w-10 rounded bg-slate-100" />
                    <div className="h-2 w-10 rounded bg-slate-100" />
                    <div className="h-6 w-16 rounded-lg bg-indigo-100 border border-indigo-200" />
                  </div>
                </div>
                {/* Hero area */}
                <div className="p-6 space-y-3">
                  <div className="h-2 w-24 rounded bg-indigo-100" />
                  <div className="h-5 w-56 rounded-lg bg-slate-200" />
                  <div className="h-5 w-40 rounded-lg bg-slate-150" />
                  <div className="h-2 w-64 rounded bg-slate-100" />
                  <div className="h-2 w-48 rounded bg-slate-100" />
                  <div className="flex gap-2.5 mt-3">
                    <div className="h-8 w-24 rounded-xl bg-indigo-600" />
                    <div className="h-8 w-20 rounded-xl bg-slate-100 border border-slate-200" />
                  </div>
                </div>
                {/* Pricing cards */}
                <div className="px-6 flex gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`flex-1 rounded-2xl p-3 border space-y-2 ${i === 1 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="h-2 w-12 rounded bg-slate-300" />
                      <div className="h-4 w-16 rounded bg-slate-200" />
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded bg-slate-100" />
                        <div className="h-1.5 w-4/5 rounded bg-slate-100" />
                        <div className="h-1.5 w-3/5 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI thought bubble */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <Brain className="h-2.5 w-2.5 text-indigo-500" />
                        </div>
                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-500">AI User&apos;s Thoughts</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        <Meh className="h-2.5 w-2.5 text-slate-500" />
                        <span className="text-[7px] font-medium text-slate-500">Neutral</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-700 leading-relaxed">
                      &ldquo;Pricing page loaded but I can&apos;t tell what&apos;s included in each plan at a glance. The comparison is buried further down...&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Persona + History */}
              <div className="w-[36%] flex flex-col overflow-hidden bg-slate-50">

                {/* Persona Bio */}
                <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold text-slate-800 truncate">Skeptical Founder</p>
                      <p className="text-[7px] text-slate-400">AI user profile</p>
                    </div>
                  </div>

                  <div className="pl-2 border-l-2 border-indigo-200">
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      &ldquo;Find the best pricing plan — check if there&apos;s a free tier before committing.&rdquo;
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[7px] font-medium text-slate-400 uppercase tracking-wide">Tech Savviness</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-indigo-500" />
                      </div>
                      <span className="text-[7px] text-slate-600 font-medium">High</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-[7px] text-slate-400">Age</p>
                      <p className="text-[9px] text-slate-700 font-semibold">30–45</p>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="text-center">
                      <p className="text-[7px] text-slate-400">Location</p>
                      <p className="text-[9px] text-slate-700 font-semibold">US / SF</p>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="text-center">
                      <p className="text-[7px] text-slate-400">Step</p>
                      <p className="text-[9px] text-indigo-600 font-semibold">4 / 15</p>
                    </div>
                  </div>
                </div>

                {/* Session History Header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 shrink-0">
                  <History className="h-3 w-3 text-slate-400" />
                  <span className="text-[7px] font-medium text-slate-400 uppercase tracking-wide">Session History</span>
                </div>

                {/* Steps */}
                <div className="flex-1 overflow-hidden p-3 space-y-3">
                  {[
                    { step: 1, type: 'system', label: 'started', emotion: null, note: 'Session started for Skeptical Founder.' },
                    { step: 2, type: 'click', label: 'click', emotion: 'curiosity', note: 'Clicked "Pricing" in the navigation bar.' },
                    { step: 3, type: 'scroll', label: 'scroll', emotion: 'neutral', note: 'Scrolling to compare plan features.' },
                    { step: 4, type: 'click', label: 'click', emotion: 'confusion', note: 'Tried clicking plan card — no clear button visible.', active: true },
                  ].map((item) => (
                    <div key={item.step} className="relative pl-4 border-l border-slate-200">
                      <div className={`absolute left-[-4px] top-1.5 h-2 w-2 rounded-full ${item.type === 'system' ? 'bg-slate-300' :
                          item.emotion === 'confusion' ? 'bg-amber-400' :
                            'bg-indigo-400'
                        }`} />
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7px] font-medium text-slate-400">Step {item.step}</span>
                        <span className={`text-[6px] px-1 py-0.5 rounded font-semibold uppercase ${item.type === 'system'
                            ? 'bg-slate-100 text-slate-400'
                            : item.emotion === 'confusion'
                              ? 'bg-amber-50 border border-amber-200 text-amber-600'
                              : 'bg-indigo-50 border border-indigo-200 text-indigo-500'
                          }`}>
                          {item.label}
                        </span>
                        {item.emotion && (
                          <span className="ml-auto text-[6px] text-slate-400">{item.emotion}</span>
                        )}
                      </div>
                      <p className="text-[8px] text-slate-500 leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="py-20 border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Issues found", value: "852k+", icon: Target },
              { label: "AI users created", value: "42k+", icon: Users },
              { label: "Testing hours saved", value: "125k", icon: Clock },
              { label: "Accuracy rate", value: "99.4%", icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="space-y-3 group">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-32 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <div className="max-w-xl space-y-4">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                Built for teams<br />who care about UX.
              </h2>
            </div>
            <p className="max-w-sm text-lg text-slate-500 border-l-2 border-indigo-200 pl-6">
              &ldquo;We replaced manual testing with Specter. It&apos;s like having 1,000 users testing your site 24/7.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Target}
              title="Spot where users get stuck"
              description="AI users browse just like real people — noticing confusing layouts, unclear buttons, and broken flows before you go live."
              color="indigo"
            />
            <FeatureCard
              icon={Sparkles}
              title="Powered by advanced AI"
              description="Built on top of the latest AI models to create realistic, thoughtful user behavior that mirrors your actual audience."
              color="emerald"
            />
            <FeatureCard
              icon={Layers}
              title="Runs anywhere"
              description="Test on your own machine or scale to thousands of AI users in our cloud. No infrastructure setup needed — just a URL."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* ── SEE THEM THINK ────────────────────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-slate-50 p-12 md:p-24 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-600">
                <MousePointer2 className="h-3.5 w-3.5" />
                Watch AI users in action
              </div>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                See exactly what<br />they&apos;re thinking.
              </h2>
              <div className="space-y-5">
                {[
                  "Read real-time thoughts from AI users as they browse",
                  "See how emotions shift while they navigate your site",
                  "Pinpoint exactly where people get confused or give up",
                  "Download clear, actionable reports"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    </div>
                    <span className="text-lg text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Skeptical Founder</p>
                    <p className="text-xs text-emerald-600 font-medium">Step 4 of 12</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-600">Frustrated</span>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed">
                  &ldquo;I&apos;ve been looking for the pricing page for 45 seconds. There&apos;s too much text and I just want to know if this fits my budget. If I don&apos;t find it in the next 2 clicks, I&apos;m leaving.&rdquo;
                </div>
                <div className="flex items-center gap-3 pl-1">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs text-slate-400">AI user&apos;s thoughts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-indigo-600 p-16 md:p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent)]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
              Start testing smarter today.
            </h2>
            <p className="max-w-xl mx-auto text-lg text-white/75 leading-relaxed">
              Run your first test in under 5 minutes. Just paste a URL — no setup needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl bg-white px-8 py-4 text-sm font-semibold text-indigo-600 hover:bg-slate-100 transition-all shadow-lg active:scale-95"
              >
                Start for free
              </Link>
              <Link
                href="/pricing"
                className="text-white/75 text-sm font-medium hover:text-white transition-all"
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

function FeatureCard({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: 'indigo' | 'emerald' | 'amber' }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-500 hover:border-indigo-300',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-500 hover:border-emerald-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-500 hover:border-amber-300',
  };

  const [bg, border, text, hoverBorder] = colors[color].split(' ');

  return (
    <div className={`relative p-8 rounded-2xl border border-slate-200 bg-white group ${hoverBorder} hover:border-opacity-100 transition-all duration-300 hover:shadow-md`}>
      <div className="space-y-5">
        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${bg} ${border} ${text}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="text-base text-slate-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
