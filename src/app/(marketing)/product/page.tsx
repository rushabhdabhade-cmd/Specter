import Link from 'next/link';
import {
    Zap, Database,
    BarChart3, ArrowRight,
    Monitor, Cloud, Search, Workflow
} from 'lucide-react';

export default function ProductPage() {
    return (
        <div className="flex flex-col bg-white overflow-hidden">
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <section className="px-6 pt-36 pb-24 text-center bg-gradient-to-b from-slate-50 to-white">
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium text-slate-500">How Specter works</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
                        Everything you need<br />
                        <span className="text-indigo-600">to test smarter.</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-500 leading-relaxed">
                        Specter creates AI users that browse your site the way real people do — so you can fix problems before your customers ever find them.
                    </p>
                </div>
            </section>

            {/* ── WHERE TO RUN ─────────────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-white">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center mb-16 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Run tests your way</h2>
                        <p className="text-slate-500 max-w-lg mx-auto">Choose to run on your own machine for privacy, or scale up in the cloud. Both options give you the same quality results.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Local */}
                        <div className="p-10 rounded-2xl border border-slate-200 bg-white space-y-8 hover:border-indigo-200 hover:shadow-md transition-all duration-300 group">
                            <div className="flex items-start gap-5">
                                <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                                    <Monitor className="h-7 w-7 text-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-2xl font-bold text-slate-900">Run locally</h3>
                                    <p className="text-slate-500 leading-relaxed">
                                        Tests run on your own computer. Your data never leaves your machine — great for sensitive projects.
                                    </p>
                                </div>
                            </div>
                            <ul className="space-y-3 pl-1">
                                {[
                                    'No API costs',
                                    'Complete data privacy',
                                    'Unlimited test sessions',
                                    'Full control over settings',
                                ].map(feature => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                                        <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                            <Zap className="h-3 w-3 text-indigo-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Cloud */}
                        <div className="p-10 rounded-2xl border border-slate-200 bg-white space-y-8 hover:border-emerald-200 hover:shadow-md transition-all duration-300 group">
                            <div className="flex items-start gap-5">
                                <div className="h-14 w-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <Cloud className="h-7 w-7 text-emerald-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-2xl font-bold text-slate-900">Run in the cloud</h3>
                                    <p className="text-slate-500 leading-relaxed">
                                        Scale to hundreds of AI users at once, running tests from multiple locations around the world.
                                    </p>
                                </div>
                            </div>
                            <ul className="space-y-3 pl-1">
                                {[
                                    'Run many tests at the same time',
                                    'Test from multiple locations',
                                    'No hardware required',
                                    'Ready in seconds',
                                ].map(feature => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <Zap className="h-3 w-3 text-emerald-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CAPABILITIES ────────────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-slate-50 border-y border-slate-100">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">What Specter does for you</h2>
                        <p className="text-slate-500 max-w-lg mx-auto">A complete set of tools to understand how people experience your product.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <FeatureItem
                            icon={Search}
                            title="Explores on its own"
                            desc="AI users navigate your site freely, uncovering issues in flows you never thought to test."
                        />
                        <FeatureItem
                            icon={Workflow}
                            title="Finds friction points"
                            desc="See exactly where users slow down, get confused, or give up — with step-by-step detail."
                        />
                        <FeatureItem
                            icon={Database}
                            title="Records every thought"
                            desc="Each AI user's reasoning is logged so you can read through their experience like a journal."
                        />
                        <FeatureItem
                            icon={BarChart3}
                            title="Clear, useful reports"
                            desc="Get plain-English summaries with specific recommendations — not just raw data."
                        />
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-white">
                <div className="mx-auto max-w-3xl rounded-3xl bg-indigo-600 p-16 md:p-20 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent)]" />
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                            Ready to find your first issue?
                        </h2>
                        <p className="text-white/75 text-lg">
                            Paste a URL and get results in under 5 minutes. No setup, no credit card.
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-indigo-600 hover:bg-slate-100 transition-all shadow-lg active:scale-95"
                        >
                            Start for free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="space-y-4 p-7 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-300 group">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-500">
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
                <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
