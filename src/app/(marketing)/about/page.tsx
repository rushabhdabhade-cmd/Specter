import Link from 'next/link';
import {
    Target, Sparkles,
    ShieldCheck
} from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="flex flex-col bg-[#050505] overflow-hidden">
            {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
            <section className="relative px-6 pt-40 pb-40 text-center">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 bg-emerald-500/10 blur-[150px] rounded-full" />
                <div className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 backdrop-blur-3xl shadow-2xl">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Our Protocol</span>
                    </div>

                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white leading-[0.85]">
                        Redefining the <br /> <span className="text-emerald-400 italic">User Echo.</span>
                    </h1>

                    <p className="mx-auto max-w-3xl text-xl md:text-2xl font-medium text-slate-400 leading-relaxed italic opacity-80">
                        Specter was founded on a simple realization: the gap between building a product and understanding how a human feels using it is far too large.
                    </p>
                </div>
            </section>

            {/* ── CORE BELIEFS ────────────────────────────────────────────────── */}
            <section className="px-6 py-40 border-y border-white/5 bg-white/[0.01]">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">Eliminating the <br /> <span className="opacity-40 italic">Guesswork.</span></h2>
                            <p className="text-lg font-medium text-slate-500 italic leading-relaxed">
                                Traditional user testing is slow, expensive, and limited by human fatigue. We believe the future of design lies in behavioral synthesis—dynamic, high-fidelity modeling that tests your assumptions in real-time.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
                                <ValueItem
                                    icon={Target}
                                    title="Precision First"
                                    desc="We don't settle for 'good enough' data. Our engine models sub-second emotional response."
                                />
                                <ValueItem
                                    icon={ShieldCheck}
                                    title="Total Privacy"
                                    desc="With local engine support, your behavioral data never has to leave your infra."
                                />
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="aspect-square rounded-[64px] bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-white/5 flex items-center justify-center p-12 overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-1000">
                                <div className="h-full w-full rounded-[48px] bg-black/60 backdrop-blur-3xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                                    <Sparkles className="h-24 w-24 text-emerald-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── THE COHORT ──────────────────────────────────────────────────── */}
            <section className="px-6 py-60">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-6 mb-32">
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white italic opacity-80">Join the Cohort.</h2>
                        <p className="text-lg font-medium text-slate-500 italic max-w-2xl mx-auto">
                            We're a team of behavioral scientists, engine designers, and UX fundamentalists building the future of automated synthesis.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <StatCard label="Synthesis Sessions Ran" value="1.2M+" />
                        <StatCard label="Global Contributors" value="150+" />
                        <StatCard label="Years of R&D" value="4.5" />
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────────────── */}
            <section className="px-6 py-40">
                <div className="mx-auto max-w-5xl rounded-[64px] bg-emerald-600 p-16 md:p-32 text-center shadow-[0_64px_128px_-32px_rgba(16,185,129,0.5)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />

                    <div className="relative z-10 space-y-12">
                        <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">Let's build <br /> <span className="italic text-emerald-100/60 uppercase">The Protocol.</span></h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                            <Link
                                href="/sign-up"
                                className="w-full sm:w-auto rounded-2xl bg-white px-12 py-6 text-base font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-2xl active:scale-95"
                            >
                                Join Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ValueItem({ icon: Icon, title, desc }: { icon: import('react').ElementType, title: string, desc: string }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 text-emerald-400">
                <Icon className="h-5 w-5" />
                <h4 className="text-lg font-black uppercase tracking-tight text-white">{title}</h4>
            </div>
            <p className="text-sm font-medium text-slate-600 italic leading-relaxed">{desc}</p>
        </div>
    )
}

function StatCard({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-12 rounded-[48px] border border-white/5 bg-white/[0.01] text-center space-y-4 hover:bg-white/[0.03] transition-all group">
            <p className="text-6xl md:text-8xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-700">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">{label}</p>
        </div>
    )
}
