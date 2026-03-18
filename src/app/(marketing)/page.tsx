import Link from 'next/link';
import {
  ArrowRight, Zap, Target, BrainCircuit,
  ShieldCheck, Globe, Cpu, BarChart3,
  Sparkles, Layers, MousePointer2, Activity,
  Users, Clock
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-[#050505] overflow-hidden selection:bg-indigo-500/30">
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
            &ldquo;Specter orchestrates high-fidelity synthetic users that navigate, think, and feel through your interface exactly like your customers.&rdquo;
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10">
            <Link
              href="/sign-up"
              className="group relative flex items-center gap-4 rounded-2xl bg-white px-12 py-6 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)]"
            >
              Start Synthesis
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs"
              className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all underline decoration-slate-800 underline-offset-[12px] decoration-2 hover:decoration-indigo-500"
            >
              Explore Cohorts
            </Link>
          </div>
        </div>

        {/* ── BROWSER MOCKUP ──────────────────────────────────────────────── */}
        <div className="relative mt-40 w-full max-w-6xl mx-auto p-2 rounded-[48px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="rounded-[40px] overflow-hidden border border-white/5 bg-[#0a0a0a] aspect-[16/10] flex flex-col relative">
            {/* Browser Toolbar */}
            <div className="h-14 border-b border-white/5 bg-white/[0.02] flex items-center px-8 justify-between">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
              </div>
              <div className="h-7 w-96 rounded-lg bg-white/5 border border-white/5 flex items-center px-4">
                <Globe className="h-3 w-3 text-slate-600 mr-3" />
                <div className="h-1.5 w-40 rounded bg-white/10" />
              </div>
              <div className="h-3 w-3 rounded bg-white/10" />
            </div>

            <div className="flex-1 flex items-center justify-center relative p-12 lg:p-24 overflow-hidden">
              {/* Background grid effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

              <div className="relative z-10 flex flex-col items-center space-y-12">
                <div className="flex justify-center -space-x-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-24 w-24 rounded-[32px] border-4 border-[#0a0a0a] bg-gradient-to-br from-slate-900 to-black flex items-center justify-center shadow-2xl transition-transform hover:-translate-y-4 hover:z-20 cursor-default group/p">
                      <BrainCircuit className="h-10 w-10 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-center">
                  <h3 className="text-3xl font-black tracking-tight text-white italic">Synthetic Cohort Active</h3>
                  <div className="flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      <Activity className="h-3 w-3" />
                      Live Stream
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-800" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Collecting Behavioral Data</span>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute top-20 right-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl animate-pulse" />
              <div className="absolute bottom-20 left-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS SECTION ──────────────────────────────────────────────── */}
      <section className="relative py-40 border-y border-white/5 bg-white/[0.01]">
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
      <section className="px-6 py-60 bg-[#050505]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">Built for modern <br /> <span className="text-indigo-400 italic">UX Protocols.</span></h2>
            </div>
            <p className="max-w-sm text-lg font-medium text-slate-500 italic border-l border-white/10 pl-8 pb-4">
              "We replaced manual QA and traditional user testing with Specter. It's like having 1,000 users in your terminal 24/7."
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
      <section className="px-6 py-40">
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
      <section className="px-6 py-60">
        <div className="mx-auto max-w-5xl rounded-[64px] bg-gradient-to-br from-indigo-600 to-indigo-900 p-16 md:p-32 text-center shadow-[0_64px_128px_-32px_rgba(79,70,229,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          <div className="absolute -bottom-48 -left-48 h-96 w-96 bg-white/5 blur-[100px] rounded-full" />

          <div className="relative z-10 space-y-12">
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">Join the <br /> <span className="italic text-indigo-200">synthesis revolution.</span></h2>
            <p className="max-w-2xl mx-auto text-xl font-medium text-indigo-100/60 leading-relaxed italic">
              "Deploy your first cohort in under 5 minutes. No integration required. Just a URL and a vision."
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
    <div className={`relative p-10 rounded-[48px] border border-white/5 bg-[#0a0a0a] group hover:border-white/20 transition-all duration-700 overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      <div className="relative z-10 space-y-8">
        <div className={`h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center ${colors[color].split(' ').pop()} group-hover:scale-110 group-hover:bg-white/[0.05] transition-all duration-500`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-black tracking-tight text-white group-hover:translate-x-2 transition-transform duration-500">{title}</h3>
          <p className="text-base font-medium text-slate-500 leading-relaxed italic group-hover:text-slate-400 transition-colors">{description}</p>
        </div>
      </div>
    </div>
  );
}
