import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const tiers = [
    {
        name: 'Free',
        price: '$0',
        per: 'forever',
        description: 'Great for trying Specter on a side project or personal site.',
        features: [
            '3 test runs',
            'Run tests on your own machine',
            'Basic reports',
            '24-hour report history',
        ],
        cta: 'Start for free',
        href: '/sign-up',
        highlighted: false,
    },
    {
        name: 'Pro',
        price: '$49',
        per: 'per month',
        description: 'For teams who want deeper insights and faster results.',
        features: [
            'Unlimited test runs',
            'Cloud-powered AI testing',
            'Full report history',
            'PDF export',
            'Priority support',
        ],
        cta: 'Get started',
        href: '/sign-up',
        highlighted: true,
    },
    {
        name: 'Teams',
        price: '$199',
        per: 'per month',
        description: 'For larger teams who need to test at scale.',
        features: [
            'Run many tests at once',
            'Shared team workspace',
            'Shared AI user library',
            'Single sign-on (SSO)',
            'Dedicated support',
        ],
        cta: 'Contact us',
        href: '/about',
        highlighted: false,
    },
];

const faqs = [
    {
        q: 'Do I need a credit card to start?',
        a: 'No. The Free plan requires no payment details — just sign up and start testing.',
    },
    {
        q: 'What is an AI user?',
        a: 'An AI user is a simulated person who browses your website, clicks around, and reports back what confused or frustrated them.',
    },
    {
        q: 'What does "run tests on your own machine" mean?',
        a: 'You can run Specter locally using Ollama — a free tool that runs AI models on your computer, with no API costs.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. There are no contracts or lock-ins. You can cancel or downgrade at any time from your account settings.',
    },
    {
        q: 'What happens to my reports if I cancel?',
        a: 'Your reports stay accessible for 30 days after cancellation so you can export anything you need.',
    },
];

export default function PricingPage() {
    return (
        <div className="bg-white animate-in fade-in duration-500">

            {/* ── HEADER ── */}
            <section className="pt-36 pb-20 px-6 text-center bg-gradient-to-b from-slate-50 to-white">
                <div className="mx-auto max-w-2xl space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium text-slate-500">Simple, transparent pricing</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                        Pick the plan that fits.
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Start free and upgrade when you need more. No hidden fees, no confusing tiers.
                    </p>
                </div>
            </section>

            {/* ── PRICING CARDS ── */}
            <section className="px-6 pb-24">
                <div className="mx-auto max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                        {tiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${tier.highlighted
                                        ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                                    }`}
                            >
                                {tier.highlighted && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                        <span className="rounded-full bg-slate-900 px-3.5 py-1 text-xs font-semibold text-white">
                                            Most popular
                                        </span>
                                    </div>
                                )}

                                <div className="mb-8 space-y-3">
                                    <h3 className={`text-sm font-semibold uppercase tracking-wider ${tier.highlighted ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {tier.name}
                                    </h3>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-slate-900'}`}>
                                            {tier.price}
                                        </span>
                                        <span className={`text-sm ${tier.highlighted ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            /{tier.per}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${tier.highlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                                        {tier.description}
                                    </p>
                                </div>

                                <ul className="mb-8 flex-1 space-y-3.5">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full ${tier.highlighted ? 'bg-white/20' : 'bg-indigo-50 border border-indigo-100'
                                                }`}>
                                                <Check className={`h-2.5 w-2.5 ${tier.highlighted ? 'text-white' : 'text-indigo-600'}`} strokeWidth={2.5} />
                                            </div>
                                            <span className={`text-sm leading-snug ${tier.highlighted ? 'text-indigo-50' : 'text-slate-600'}`}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href={tier.href}
                                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98] ${tier.highlighted
                                            ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                            : 'bg-slate-900 text-white hover:bg-indigo-600'
                                        }`}
                                >
                                    {tier.cta}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* All plans note */}
                    <p className="mt-8 text-center text-sm text-slate-400">
                        All plans include a 14-day free trial. No credit card required for Free.
                    </p>
                </div>
            </section>

            {/* ── COMPARISON TABLE ── */}
            <section className="px-6 py-16 bg-slate-50 border-y border-slate-100">
                <div className="mx-auto max-w-4xl">
                    <h2 className="text-xl font-bold text-slate-900 mb-8 text-center">What's included</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 pr-6 font-medium text-slate-500 w-1/2">Feature</th>
                                    {['Free', 'Pro', 'Teams'].map(name => (
                                        <th key={name} className={`py-3 px-4 font-semibold text-center ${name === 'Pro' ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            {name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { feature: 'Test runs', free: '3', pro: 'Unlimited', teams: 'Unlimited' },
                                    { feature: 'AI users per run', free: 'Up to 3', pro: 'Up to 10', teams: 'Unlimited' },
                                    { feature: 'Run tests locally', free: true, pro: true, teams: true },
                                    { feature: 'Cloud testing', free: false, pro: true, teams: true },
                                    { feature: 'Report history', free: '24 hours', pro: 'Full', teams: 'Full' },
                                    { feature: 'PDF export', free: false, pro: true, teams: true },
                                    { feature: 'Shared workspace', free: false, pro: false, teams: true },
                                    { feature: 'Single sign-on (SSO)', free: false, pro: false, teams: true },
                                    { feature: 'Priority support', free: false, pro: true, teams: true },
                                ].map(({ feature, free, pro, teams }) => (
                                    <tr key={feature} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 pr-6 text-slate-600">{feature}</td>
                                        {[free, pro, teams].map((val, i) => (
                                            <td key={i} className="py-3.5 px-4 text-center">
                                                {typeof val === 'boolean' ? (
                                                    val
                                                        ? <Check className="h-4 w-4 text-emerald-500 mx-auto" strokeWidth={2.5} />
                                                        : <span className="text-slate-200 text-lg leading-none">—</span>
                                                ) : (
                                                    <span className={`text-sm ${i === 1 ? 'font-semibold text-indigo-600' : 'text-slate-500'}`}>{val}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="px-6 py-24 bg-white">
                <div className="mx-auto max-w-2xl">
                    <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">Common questions</h2>
                    <div className="space-y-px">
                        {faqs.map(({ q, a }, i) => (
                            <div key={i} className="py-5 border-b border-slate-100 last:border-0">
                                <p className="text-sm font-semibold text-slate-900 mb-2">{q}</p>
                                <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BOTTOM CTA ── */}
            <section className="px-6 py-16 bg-slate-50 border-t border-slate-100">
                <div className="mx-auto max-w-xl text-center space-y-5">
                    <h2 className="text-2xl font-bold text-slate-900">Still not sure?</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Start with the free plan — no credit card, no commitment. Upgrade whenever it makes sense.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Start for free
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
