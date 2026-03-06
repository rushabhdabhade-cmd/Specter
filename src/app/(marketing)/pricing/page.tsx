import { Check, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
    const tiers = [
        {
            name: 'Free',
            price: '$0',
            description: 'Perfect for side projects and local experimentation.',
            features: [
                '3 Persona Cohorts',
                'Local Ollama Execution',
                'Basic Mission Control',
                '24h Report History',
            ],
            cta: 'Start for Free',
            highlighted: false,
        },
        {
            name: 'Pro',
            price: '$49',
            description: 'For growing apps that need deep behavioral insights.',
            features: [
                'Unlimited Cohorts',
                'Gemini 1.5 Cloud Engine',
                'Manual Stepping Oversight',
                'Full History & PDF Export',
                'Priority Support',
            ],
            cta: 'Upgrade to Pro',
            highlighted: true,
        },
        {
            name: 'Teams',
            price: '$199',
            description: 'Scalable testing for engineering and UX teams.',
            features: [
                'Concurrent Persona Workers',
                'Custom Team Workspace',
                'Shared Persona Library',
                'SSO & RBAC',
                'Dedicated UX Analyst Link',
            ],
            cta: 'Contact Sales',
            highlighted: false,
        },
    ];

    return (
        <div className="animate-in fade-in duration-700 px-6 py-40">
            <div className="mx-auto max-w-7xl text-center space-y-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
                        <Zap className="h-3 w-3 text-amber-500 fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simple, Transparent Pricing</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                        Choose your <span className="text-indigo-500 italic">intelligence</span> tier.
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg font-medium text-slate-500">
                        Whether you're running local open-source models or global cloud architectures, we have a plan that fits.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative flex flex-col rounded-[48px] border p-12 transition-all hover:scale-[1.02] duration-500 ${tier.highlighted
                                    ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_80px_rgba(79,70,229,0.3)]'
                                    : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'
                                }`}
                        >
                            {tier.highlighted && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-10 space-y-4">
                                <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                                <div className="flex items-end gap-1">
                                    <span className="text-5xl font-black text-white">{tier.price}</span>
                                    <span className="text-sm font-bold text-slate-400 opacity-60 pb-2">/mo</span>
                                </div>
                                <p className={`text-sm font-medium leading-relaxed ${tier.highlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {tier.description}
                                </p>
                            </div>

                            <ul className="mb-12 flex-1 space-y-5 text-left">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${tier.highlighted ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            <Check className="h-3 w-3" />
                                        </div>
                                        <span className={`text-sm font-medium ${tier.highlighted ? 'text-indigo-50 white/80' : 'text-slate-300'}`}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/sign-up"
                                className={`flex items-center justify-center gap-2 rounded-2xl py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] ${tier.highlighted
                                        ? 'bg-white text-black hover:bg-slate-100 shadow-xl'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                                    }`}
                            >
                                {tier.cta}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="pt-24 space-y-8">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-700">Trusted by modern engineering teams</p>
                    <div className="flex flex-wrap items-center justify-center gap-12 opacity-20 grayscale filter">
                        {['Vercel', 'Linear', 'Supabase', 'Clerk', 'Railway'].map(logo => (
                            <span key={logo} className="text-2xl font-black tracking-tighter text-white">{logo}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
