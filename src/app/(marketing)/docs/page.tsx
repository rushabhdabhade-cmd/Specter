import Link from 'next/link';
import {
    Book, Search,
    Terminal, Code, Zap, Shield,
    Settings, Users, Activity, ArrowRight
} from 'lucide-react';

export default function DocsPage() {
    const sections = [
        {
            title: 'Foundation',
            items: [
                { name: 'Introduction', icon: Book },
                { name: 'Quick Start Protocol', icon: Zap },
                { name: 'Architecture', icon: Activity },
            ]
        },
        {
            title: 'Engines',
            items: [
                { name: 'Local Engine (Ollama)', icon: Terminal },
                { name: 'Cloud Hybrid Mode', icon: Shield },
                { name: 'Model Parameters', icon: Settings },
            ]
        },
        {
            title: 'Personas',
            items: [
                { name: 'Psychological Profiles', icon: Users },
                { name: 'Goal Prompting', icon: Code },
                { name: 'Behavioral Biases', icon: Activity },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#050505] selection:bg-indigo-500/30">
            {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
            <aside className="fixed left-0 top-20 bottom-0 w-72 border-r border-white/5 bg-black hidden lg:block overflow-y-auto px-6 py-12 scrollbar-hide">
                <div className="space-y-12">
                    {sections.map(section => (
                        <div key={section.title} className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">{section.title}</h4>
                            <ul className="space-y-4">
                                {section.items.map(item => (
                                    <li key={item.name}>
                                        <Link href="#" className="flex items-center gap-3 text-sm font-medium text-slate-500 hover:text-white transition-all group">
                                            <item.icon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </aside>

            {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
            <main className="flex-1 lg:pl-72 pt-32 pb-40 px-6 lg:px-24">
                <div className="max-w-4xl mx-auto space-y-24">

                    {/* Header */}
                    <div className="space-y-8 pb-12 border-b border-white/5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            Documentation v1.4.0
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white">The Protocol.</h1>
                        <p className="text-xl font-medium text-slate-500 italic leading-relaxed">
                            Comprehensive guides to deploying autonomous behavioral synthesis across your products.
                        </p>
                    </div>

                    {/* Intro Section */}
                    <section className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-white italic">01. Initialization</h2>
                            <p className="text-lg text-slate-400 leading-relaxed font-medium">
                                Specter operates by deploying high-fidelity synthetic personas into a headless browser environment. Our engine translates natural language persona configs into complex behavioral patterns.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-3xl border border-white/5 bg-zinc-900/20 space-y-6 group hover:border-white/10 transition-all">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400">
                                    <Terminal className="h-5 w-5" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white">Local Setup</h4>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed italic">Configure Ollama and Specter CLI for private local runs.</p>
                                    <Link href="#" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 pt-4 hover:translate-x-2 transition-transform">
                                        Read Guide <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>

                            <div className="p-8 rounded-3xl border border-white/5 bg-zinc-900/20 space-y-6 group hover:border-white/10 transition-all">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white">Project Protocol</h4>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed italic">Learn how to define project constraints and auth requirements.</p>
                                    <Link href="#" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 pt-4 hover:translate-x-2 transition-transform">
                                        Read Guide <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Quick Code Example */}
                    <section className="space-y-8">
                        <h3 className="text-2xl font-black text-white italic">CLI Synthesis Example</h3>
                        <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 overflow-hidden">
                            <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-red-500/50" />
                                    <div className="h-2 w-2 rounded-full bg-amber-500/50" />
                                    <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">protocol.sh</span>
                            </div>
                            <pre className="p-8 text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto">
                                <code>{`# Deploy local synthesis session
specter run --persona "Skeptical PM" \\
            --url "https://app.example.com" \\
            --engine "ollama/llama3" \\
            --steps 20 \\
            --output ./reports/friction.json`}</code>
                            </pre>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
