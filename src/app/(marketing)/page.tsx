import Link from 'next/link';
import { ArrowRight, Zap, Shield, Cpu, Target, BrainCircuit, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-[#050505] overflow-hidden">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 pt-20 pb-40 text-center">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-indigo-600 opacity-20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 h-[300px] w-[300px] bg-emerald-600 opacity-10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phase 2: Live Local & Cloud Engines</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            Test your <span className="bg-gradient-to-r from-indigo-400 via-white to-emerald-400 bg-clip-text text-transparent">UX</span> before <br className="hidden md:block" /> humans ever see it.
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl font-medium text-slate-400 leading-relaxed italic">
            "Specter deploys autonomous, multi-persona synthetic users to navigate, think, and feel through your web application in real-time."
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-6">
            <Link
              href="/sign-up"
              className="group flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-base font-black uppercase tracking-widest text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.15)]"
            >
              Deploy First Cohort
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="text-base font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all underline decoration-slate-800 underline-offset-8 decoration-2 hover:decoration-indigo-500"
            >
              Try Local Engine
            </Link>
          </div>
        </div>

        {/* Browser Mockup / Preview */}
        <div className="mt-32 w-full max-w-6xl mx-auto p-4 rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="rounded-[28px] overflow-hidden border border-white/5 bg-[#0a0a0a] aspect-[16/9] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
            <div className="space-y-6 text-center z-10 p-12">
              <div className="flex justify-center -space-x-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 w-16 rounded-3xl border-4 border-[#0a0a0a] bg-white/5 flex items-center justify-center shadow-2xl">
                    <BrainCircuit className="h-8 w-8 text-indigo-400" />
                  </div>
                ))}
              </div>
              <p className="text-2xl font-black tracking-tight text-white">5 Synthetic Personas Currently Testing</p>
              <div className="flex items-center justify-center gap-3 text-slate-500">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Real-time Session Oversight Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-40 bg-[#070707]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6 p-10 rounded-[40px] border border-white/5 bg-[#0a0a0a] group hover:border-indigo-500/20 transition-all">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Target className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">High Fidelity Personas</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Configure age, tech literacy, and domain familiarity. Our LLM core ensures every "user" behaves uniquely.</p>
            </div>

            <div className="space-y-6 p-10 rounded-[40px] border border-white/5 bg-[#0a0a0a] group hover:border-emerald-500/20 transition-all">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">Local-First Engine</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Prioritize privacy with Ollama. Run testing cohorts locally on your hardware with no extra costs.</p>
            </div>

            <div className="space-y-6 p-10 rounded-[40px] border border-white/5 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">Manual Oversight</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Human-in-the-loop testing. View real-time inner monologues and emotional state before approving every step.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-6 py-60 text-center overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/[0.03] pointer-events-none" />
        <div className="mx-auto max-w-4xl space-y-12">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Stop guessing. Start knowing.</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Specter has identified thousands of friction points and usability bugs across real-world web applications.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12">
            {[
              { label: "UX Bugs Caught", value: "12k+" },
              { label: "Personas Built", value: "850+" },
              { label: "Test Hours Saved", value: "1.4k" },
              { label: "Precision Rate", value: "99.8%" },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-4xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-40">
        <div className="mx-auto max-w-5xl rounded-[60px] bg-gradient-to-br from-indigo-600 to-indigo-900 p-16 md:p-32 text-center shadow-[0_0_100px_rgba(79,70,229,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-96 w-96 bg-white opacity-5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Ready to deploy your first synthetic cohort?</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href="/sign-up"
                className="w-full md:w-auto rounded-3xl bg-white px-12 py-6 text-xl font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all shadow-2xl active:scale-95"
              >
                Start Free Trial
              </Link>
              <Link
                href="/pricing"
                className="text-white font-black uppercase tracking-widest hover:underline underline-offset-8"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
