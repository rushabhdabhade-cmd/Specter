import Link from 'next/link';
import {
    Cpu, Zap, Database,
    BarChart3, ArrowRight,
    Monitor, Cloud, Search, Workflow
} from 'lucide-react';

export default function ProductPage() {
    return (
        <div className="flex flex-col bg-[#050505] overflow-hidden">
            {/* ── HEADER SECTION ──────────────────────────────────────────────── */}
            <section className="relative px-6 pt-40 pb-20 text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
                        <Cpu className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">The Behavioral Core</span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white">Full Spectrum <br /> <span className="text-indigo-400">Synthesis.</span></h1>
                    <p className="mx-auto max-w-2xl text-lg font-medium text-slate-500 leading-relaxed italic">
                        Specter is more than a test runner. It's an autonomous user experience engine that bridges the gap between design and reality.
                    </p>
                </div>
            </section>

            {/* ── ENGINE COMPARISON ────────────────────────────────────────────── */}
            <section className="px-6 py-40 bg-zinc-950/50">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                        {/* Local Engine Card */}
                        <div className="p-12 rounded-[48px] border border-white/5 bg-[#0a0a0a] space-y-10 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:scale-125 transition-transform duration-700">
                                <Monitor className="h-48 w-48 text-indigo-500" />
                            </div>
                            <div className="space-y-6 relative z-10">
                                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <Monitor className="h-8 w-8 text-indigo-400" />
                                </div>
                                <h3 className="text-4xl font-black text-white">Local Engine</h3>
                                <p className="text-slate-500 font-medium leading-relaxed italic">
                                    Run privacy-focused behavioral synthesis directly on your hardware. Powered by Ollama integration.
                                </p>
                                <ul className="space-y-4">
                                    {['Zero API Costs', 'Total Data Privacy', 'Unlimited Local Sessions', 'Full Model Control'].map(feature => (
                                        <li key={feature} className="flex items-center gap-4 text-sm font-bold text-slate-400">
                                            <Zap className="h-4 w-4 text-indigo-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Cloud Engine Card */}
                        <div className="p-12 rounded-[48px] border border-white/5 bg-[#0a0a0a] space-y-10 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 -rotate-12 group-hover:scale-125 transition-transform duration-700">
                                <Cloud className="h-48 w-48 text-emerald-500" />
                            </div>
                            <div className="space-y-6 relative z-10">
                                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Cloud className="h-8 w-8 text-emerald-400" />
                                </div>
                                <h3 className="text-4xl font-black text-white">Cloud Synthesis</h3>
                                <p className="text-slate-500 font-medium leading-relaxed italic">
                                    Scale to thousands of concurrent personas across multiple regions with our high-performance infrastructure.
                                </p>
                                <ul className="space-y-4">
                                    {['Massive Concurrency', 'Multi-Region Testing', 'Global Behavioral Models', 'Instant Deployment'].map(feature => (
                                        <li key={feature} className="flex items-center gap-4 text-sm font-bold text-slate-400">
                                            <Zap className="h-4 w-4 text-emerald-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── CORE CAPABILITIES ───────────────────────────────────────────── */}
            <section className="px-6 py-60">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-6 mb-32">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Designed for the <br /> <span className="italic opacity-50">Modern UX Protocol.</span></h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureItem
                            icon={Search}
                            title="Autonomous Discovery"
                            desc="Personas explore your app independently to find edge cases you never scripted."
                        />
                        <FeatureItem
                            icon={Workflow}
                            title="Friction Mapping"
                            desc="Sub-second tracking of cognitive load and emotional friction points."
                        />
                        <FeatureItem
                            icon={Database}
                            title="Behavioral Logs"
                            desc="Full access to inner monologues and decision logs for every synthesized session."
                        />
                        <FeatureItem
                            icon={BarChart3}
                            title="Strategic Reports"
                            desc="AI-generated summaries that translate behavioral data into product opportunities."
                        />
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
            <section className="px-6 py-40">
                <div className="mx-auto max-w-5xl rounded-[64px] border border-white/10 bg-white/[0.01] p-24 text-center space-y-12">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">Path To Synthesis.</h2>
                    <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-4 rounded-2xl bg-white px-12 py-6 text-sm font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all shadow-2xl active:scale-95"
                    >
                        Start Building
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="space-y-6 p-8 rounded-[40px] border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all group">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-white transition-all">
                <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-2">
                <h4 className="text-xl font-black text-white">{title}</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed italic">{desc}</p>
            </div>
        </div>
    )
}
