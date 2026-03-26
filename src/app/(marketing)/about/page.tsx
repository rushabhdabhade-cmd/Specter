import Link from 'next/link';
import { Github, Linkedin, ArrowRight, Globe, Shield, Zap, Heart } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="flex flex-col bg-white">

            {/* ── HERO ── */}
            <section className="px-6 pt-36 pb-20 bg-gradient-to-b from-slate-50 to-white text-center">
                <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium text-slate-500">About Specter</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                        Built to make testing
                        <br />
                        <span className="text-indigo-600">simple and honest.</span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Specter helps you understand how real people experience your website — before you ship, before you guess, and before you lose them.
                    </p>
                </div>
            </section>

            {/* ── WHY I BUILT THIS ── */}
            <section className="px-6 py-20 bg-white">
                <div className="mx-auto max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                        <div className="space-y-5">
                            <h2 className="text-2xl font-bold text-slate-900">Why I built Specter</h2>
                            <p className="text-slate-500 leading-relaxed">
                                Most developers ship features and hope they work. Real user testing is slow, expensive, and hard to set up — so it usually gets skipped.
                            </p>
                            <p className="text-slate-500 leading-relaxed">
                                I built Specter to close that gap. You paste a URL, and within minutes you have AI users browsing your site, thinking out loud, and telling you exactly what's confusing them.
                            </p>
                            <p className="text-slate-500 leading-relaxed">
                                No setup, no waiting, no guessing. Just feedback you can actually act on.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: Zap, title: 'Fast feedback', desc: 'Get your first results in under 5 minutes — no recruiting, no scheduling.' },
                                { icon: Globe, title: 'Runs anywhere', desc: 'Use Gemini or OpenRouter in the cloud, or Ollama locally on your own machine.' },
                                { icon: Shield, title: 'Privacy first', desc: 'Run tests entirely on your own hardware. Your data stays yours.' },
                                { icon: Heart, title: 'Built for builders', desc: 'Designed for developers and product teams who move fast and need real answers.' },
                            ].map(({ icon: Icon, title, desc }) => (
                                <div key={title} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                                    <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Icon className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── BUILDER ── */}
            <section className="px-6 py-20 bg-slate-50 border-y border-slate-100">
                <div className="mx-auto max-w-3xl">
                    <h2 className="text-xl font-bold text-slate-900 mb-10">Who's behind it</h2>
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col sm:flex-row gap-8 items-start">

                        {/* Avatar placeholder */}
                        <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            R
                        </div>

                        <div className="space-y-4 flex-1">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Rushabh Dabhade</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Full Stack Developer · Bhusawal, India</p>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                I'm a full stack developer who loves building things that actually get used. I work across the stack — React, Node.js, Next.js, and cloud infrastructure. Specter started as a side project to scratch my own itch: I wanted a faster way to know if the thing I just built made sense to people who weren't me.
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                I'm available for freelance work and always happy to talk about what you're building.
                            </p>
                            <div className="flex items-center gap-3 pt-1">
                                <Link
                                    href="https://github.com/Coder-Rushabh"
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                                >
                                    <Github className="h-4 w-4" />
                                    GitHub
                                </Link>
                                <Link
                                    href="https://www.linkedin.com/in/rushabh-dabhade/"
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                                >
                                    <Linkedin className="h-4 w-4" />
                                    LinkedIn
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── WHAT SPECTER IS ── */}
            <section className="px-6 py-20 bg-white">
                <div className="mx-auto max-w-3xl space-y-10">
                    <h2 className="text-xl font-bold text-slate-900">What Specter is (and isn't)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">What it is</p>
                            <ul className="space-y-3">
                                {[
                                    'A fast way to spot UX problems before users do',
                                    'AI users that browse your site like real people',
                                    'Plain-English reports with specific recommendations',
                                    'A tool that runs in the cloud or on your own machine',
                                    'Built for small teams and solo developers',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What it isn't</p>
                            <ul className="space-y-3">
                                {[
                                    'A replacement for talking to real users',
                                    'A load testing or performance tool',
                                    'An analytics or heatmap platform',
                                    'Only for big companies — anyone can use it',
                                    'A black box — you can see every step each AI user took',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-500">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0 mt-1.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="px-6 py-16 bg-slate-50 border-t border-slate-100">
                <div className="mx-auto max-w-xl text-center space-y-5">
                    <h2 className="text-2xl font-bold text-slate-900">Want to try it?</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        The free plan gets you 3 test runs with no credit card. Takes about 5 minutes to set up.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Start for free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            See pricing
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
}
