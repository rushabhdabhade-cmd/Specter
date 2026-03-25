import Link from 'next/link';
import {
  ArrowRight, Zap, Target, BrainCircuit,
  ShieldCheck, Globe, Cpu, BarChart3,
  Sparkles, Layers, MousePointer2, Activity,
  Users, Clock, Brain, User, History, Meh
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-[#0f1117] overflow-hidden selection:bg-indigo-500/30">
      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-40 text-center">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-indigo-600 opacity-[0.15] blur-[150px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 h-[400px] w-[400px] bg-emerald-600 opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 backdrop-blur-3xl shadow-2xl">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Phase 2: Local + Cloud Hybrid Engine Live</span>
          </div>

          <h1 className="text-7xl md:text-[110px] font-black tracking-tighter text-white leading-[0.85] py-2">
            Test <span className="text-indigo-400">UX</span> before <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent italic">humans</span> see it.
          </h1>

          <p className="mx-auto max-w-3xl text-xl md:text-2xl font-medium text-slate-400 leading-relaxed italic opacity-80">
            &ldquo;Specter simulates real users that browse, click, and react to your website — so you can fix UX problems before your customers ever find them.&rdquo;
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10">
            <Link
              href="/dashboard"
              className="group relative flex items-center gap-4 rounded-2xl bg-white px-12 py-6 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)]"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

          </div>
        </div>

        {/* ── SESSION DASHBOARD MOCKUP ─────────────────────────────────── */}
        <div className="relative mt-10 w-full max-w-6xl mx-auto p-2 rounded-[48px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="rounded-[40px] overflow-hidden border border-white/5 bg-[#0a0a0a] aspect-[16/10] flex flex-col">

            {/* Session Header Bar */}
            <div className="h-11 border-b border-white/5 bg-white/[0.02] flex items-center px-5 gap-3 shrink-0">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <div className="h-6 w-72 rounded-md bg-white/5 border border-white/5 flex items-center px-3 gap-2">
                <Globe className="h-2.5 w-2.5 text-slate-600 shrink-0" />
                <span className="text-[9px] text-slate-500 font-mono truncate">specter.app · Live Session Active</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                  <Activity className="h-2 w-2" />
                  Live
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Skeptical Founder · Step 4</span>
              </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">

              {/* Left: Browser Mirror */}
              <div className="flex-[2] relative border-r border-white/5 overflow-hidden bg-[#080808]">
                {/* Fake webpage being scanned */}
                <div className="absolute inset-0">
                  {/* Fake nav */}
                  <div className="h-9 border-b border-white/5 bg-white/[0.015] flex items-center px-5 gap-5">
                    <div className="h-3.5 w-16 rounded bg-white/15" />
                    <div className="flex gap-3 ml-auto items-center">
                      <div className="h-2 w-10 rounded bg-white/5" />
                      <div className="h-2 w-10 rounded bg-white/5" />
                      <div className="h-2 w-10 rounded bg-white/5" />
                      <div className="h-6 w-16 rounded-lg bg-indigo-500/25 border border-indigo-500/20" />
                    </div>
                  </div>
                  {/* Hero area */}
                  <div className="p-6 space-y-3">
                    <div className="h-2 w-24 rounded bg-indigo-500/20" />
                    <div className="h-5 w-56 rounded-lg bg-white/12" />
                    <div className="h-5 w-40 rounded-lg bg-white/8" />
                    <div className="h-2 w-64 rounded bg-white/5" />
                    <div className="h-2 w-48 rounded bg-white/5" />
                    <div className="flex gap-2.5 mt-3">
                      <div className="h-8 w-24 rounded-xl bg-white/15 border border-white/10" />
                      <div className="h-8 w-20 rounded-xl bg-white/5 border border-white/5" />
                    </div>
                  </div>
                  {/* Pricing cards */}
                  <div className="px-6 flex gap-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`flex-1 rounded-2xl p-3 border space-y-2 ${i === 1 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                        <div className="h-2 w-12 rounded bg-white/20" />
                        <div className="h-4 w-16 rounded bg-white/15" />
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded bg-white/5" />
                          <div className="h-1.5 w-4/5 rounded bg-white/5" />
                          <div className="h-1.5 w-3/5 rounded bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI scanning line */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent animate-pulse" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                {/* Monologue bubble */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="p-3.5 rounded-[20px] bg-black/75 backdrop-blur-2xl border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <Brain className="h-2.5 w-2.5 text-indigo-400" />
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-300">Active Thought Process</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                        <Meh className="h-2.5 w-2.5 text-slate-400" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-300">Neutral</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/90 leading-relaxed font-semibold italic">
                      &ldquo;Pricing page loaded but I can&apos;t tell what&apos;s included in each plan at a glance. The feature comparison is buried below the fold...&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Persona + History */}
              <div className="w-[36%] flex flex-col overflow-hidden">

                {/* Persona Bio */}
                <div className="p-4 border-b border-white/5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-tight text-white italic truncate">Skeptical Founder</p>
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">SPECTER-A3F2</p>
                    </div>
                    <Sparkles className="h-3 w-3 text-indigo-500/30 animate-pulse shrink-0" />
                  </div>

                  <div className="pl-2 border-l-2 border-indigo-500/20">
                    <p className="text-[9px] text-indigo-100/80 leading-relaxed font-semibold italic">
                      &ldquo;Find the best pricing plan — check if there&apos;s a free tier before committing.&rdquo;
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">Tech Literacy</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                      </div>
                      <span className="text-[7px] text-white font-black uppercase tracking-widest">High</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-600">Age</p>
                      <p className="text-[9px] text-white font-bold">30–45</p>
                    </div>
                    <div className="w-px bg-white/5" />
                    <div className="text-center">
                      <p className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-600">Origin</p>
                      <p className="text-[9px] text-white font-bold">US / SF</p>
                    </div>
                    <div className="w-px bg-white/5" />
                    <div className="text-center">
                      <p className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-600">Step</p>
                      <p className="text-[9px] text-indigo-400 font-bold">4 / 15</p>
                    </div>
                  </div>
                </div>

                {/* Nav History Header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.01] shrink-0">
                  <History className="h-3 w-3 text-indigo-400" />
                  <span className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Navigation History</span>
                </div>

                {/* Steps */}
                <div className="flex-1 overflow-hidden p-3 space-y-3">
                  {[
                    { step: 1, type: 'system', label: 'session started', emotion: null, note: 'Mission started for Skeptical Founder.' },
                    { step: 2, type: 'click', label: 'click', emotion: 'curiosity', note: 'Clicked "Pricing" in the top navigation bar.' },
                    { step: 3, type: 'scroll', label: 'scroll', emotion: 'neutral', note: 'Scrolling to compare plan features and tiers.' },
                    { step: 4, type: 'click', label: 'click', emotion: 'confusion', note: 'Tried clicking plan card — no clear CTA visible.', active: true },
                  ].map((item) => (
                    <div key={item.step} className="relative pl-4 border-l border-white/5">
                      <div className={`absolute left-[-4px] top-1.5 h-2 w-2 rounded-full ${
                        item.type === 'system' ? 'bg-slate-700' :
                        item.emotion === 'confusion' ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]' :
                        'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]'
                      }`} />
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Step {item.step}</span>
                        <span className={`text-[6px] px-1 py-0.5 rounded font-bold uppercase tracking-widest ${
                          item.type === 'system'
                            ? 'bg-white/5 border border-white/10 text-slate-500'
                            : item.emotion === 'confusion'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                        }`}>
                          {item.label}
                        </span>
                        {item.emotion && (
                          <span className="ml-auto text-[6px] font-bold uppercase tracking-widest text-slate-600">{item.emotion}</span>
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

      {/* ── METRICS SECTION ──────────────────────────────────────────────── */}
      <section className="relative py-10 border-y border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Friction Points identified", value: "852k+", icon: Target },
              { label: "Personas synthesized", value: "42k+", icon: Users },
              { label: "UX Hours Saved", value: "125k", icon: Clock },
              { label: "Prediction Fidelity", value: "99.4%", icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="space-y-4 group">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-white transition-all transform group-hover:scale-110">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-5xl font-black tracking-tighter text-white">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 leading-tight px-4">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────────────────── */}
      <section className="px-6 py-10 bg-[#0f1117]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">Built for modern <br /> <span className="text-indigo-400 italic">UX teams.</span></h2>
            </div>
            <p className="max-w-sm text-lg font-medium text-slate-300 border-l-2 border-indigo-500/40 pl-8 pb-4">
              "We replaced manual QA and traditional user testing with Specter. It's like having 1,000 users testing your site 24/7."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Target}
              title="Psychological Mapping"
              description="Our engine simulates memory, attention span, and frustration levels to map every cognitive hurdle."
              color="indigo"
            />
            <FeatureCard
              icon={Sparkles}
              title="LLM Synthesis Core"
              description="Powered by Gemini and GPT-4o, creating deep behavioral reasoning and autonomous navigation."
              color="emerald"
            />
            <FeatureCard
              icon={Layers}
              title="Hybrid Cloud/Local"
              description="Run lightweight cohorts on your local device with Ollama, or scale to thousands in our private cloud."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE STEP PREVIEW ────────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl rounded-[64px] border border-white/10 bg-gradient-to-br from-[#0d0d0d] to-black p-12 md:p-32 overflow-hidden relative">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-indigo-600/5 blur-[120px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center relative z-10">
            <div className="space-y-12">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
                <MousePointer2 className="h-3 w-3" />
                Behavioral Oversight
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">Watch them <br /> <span className="italic opacity-50">reason.</span></h2>
              <div className="space-y-8">
                {[
                  "View real-time inner monologues",
                  "Track sub-second emotional shifts",
                  "Identify invisible friction points",
                  "Export high-fidelity behavioral reports"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-6 group">
                    <div className="h-6 w-6 rounded-lg border border-white/10 flex items-center justify-center transition-colors group-hover:border-indigo-500/50">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-800 transition-colors group-hover:bg-indigo-400" />
                    </div>
                    <span className="text-xl font-medium text-slate-400 transition-colors group-hover:text-white italic">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="rounded-[40px] border border-white/10 bg-[#070707] p-8 space-y-8 transform transition-transform group-hover:scale-[1.02] duration-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <BrainCircuit className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Persona: Skeptical Founder</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Running step 04/12</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">Frustrated</span>
                </div>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 font-mono text-xs text-slate-400 italic leading-relaxed">
                    &ldquo;I've been looking for the pricing page for 45 seconds now. The marketing jargon is overwhelming and I just want to know if this fits my budget. If I don't find it in the next 2 clicks, I'm bouncing.&rdquo;
                  </div>
                  <div className="flex items-center gap-3 pl-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Inner Monologue synthesized</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-[64px] bg-gradient-to-br from-indigo-600 to-indigo-900 p-16 md:p-32 text-center shadow-[0_64px_128px_-32px_rgba(79,70,229,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          <div className="absolute -bottom-48 -left-48 h-96 w-96 bg-white/5 blur-[100px] rounded-full" />

          <div className="relative z-10 space-y-12">
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">Start testing <br /> <span className="italic text-white/80">smarter today.</span></h2>
            <p className="max-w-2xl mx-auto text-xl font-medium text-white/70 leading-relaxed">
              Run your first AI user test in under 5 minutes. No integration required — just a URL.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto rounded-2xl bg-white px-12 py-6 text-base font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-2xl active:scale-95"
              >
                Launch Free Trial
              </Link>
              <Link
                href="/pricing"
                className="text-white text-sm font-black uppercase tracking-widest hover:underline underline-offset-[12px] decoration-white/20 hover:decoration-white transition-all"
              >
                Compare Plans
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
    indigo: 'from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 text-indigo-400',
    emerald: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`relative p-10 rounded-[48px] border border-slate-700/50 bg-slate-800/40 group hover:border-slate-600/70 transition-all duration-700 overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      <div className="relative z-10 space-y-8">
        <div className={`h-16 w-16 rounded-2xl bg-slate-700/50 border border-slate-600/40 flex items-center justify-center ${colors[color].split(' ').pop()} group-hover:scale-110 transition-all duration-500`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-black tracking-tight text-white group-hover:translate-x-2 transition-transform duration-500">{title}</h3>
          <p className="text-base font-medium text-slate-300 leading-relaxed group-hover:text-white transition-colors">{description}</p>
        </div>
      </div>
    </div>
  );
}
