import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { Ghost } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col font-sans">

            {/* ── NAVBAR — transparent on homepage, glassmorphism after scroll ── */}
            <MarketingNavbar />

            <main className="flex-1">{children}</main>

            {/* ── FOOTER ── */}
            <footer className="bg-slate-900 text-slate-400">

                {/* Main footer content */}
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="flex flex-col md:flex-row gap-12 md:gap-24">

                        {/* Brand column */}
                        <div className="md:w-72 space-y-5 flex-shrink-0">
                            <Link href="/" className="flex items-center gap-2 w-fit group">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white group-hover:bg-indigo-600 transition-colors">
                                    <Ghost className="h-3.5 w-3.5 fill-current" />
                                </div>
                                <span className="text-sm font-semibold text-white tracking-tight">Specter</span>
                            </Link>
                            <p className="text-sm text-slate-400 leading-relaxed max-w-[220px]">
                                Test your website with AI users before real customers find the problems.
                            </p>
                            <div className="flex items-center gap-3">
                                {[
                                    { Icon: Twitter, href: '#' },
                                    { Icon: Github, href: '#' },
                                    { Icon: Linkedin, href: '#' },
                                ].map(({ Icon, href }, i) => (
                                    <Link
                                        key={i}
                                        href={href}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all"
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Link columns */}
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-10">
                            {[
                                {
                                    heading: 'Platform',
                                    links: [
                                        { label: 'Product', href: '/product' },
                                        { label: 'Pricing', href: '/pricing' },
                                        { label: 'Security', href: '#' },
                                        { label: 'Enterprise', href: '#' },
                                    ],
                                },
                                {
                                    heading: 'Resources',
                                    links: [
                                        { label: 'Documentation', href: '/docs' },
                                        { label: 'API Reference', href: '#' },
                                        { label: 'User Guides', href: '#' },
                                        { label: 'Community', href: '#' },
                                    ],
                                },
                                {
                                    heading: 'Company',
                                    links: [
                                        { label: 'About', href: '/about' },
                                        { label: 'Changelog', href: '#' },
                                        { label: 'Status', href: '#' },
                                        { label: 'Contact', href: '#' },
                                    ],
                                },
                            ].map(({ heading, links }) => (
                                <div key={heading} className="space-y-4">
                                    <p className="text-xs font-semibold text-white uppercase tracking-wider">{heading}</p>
                                    <ul className="space-y-3">
                                        {links.map(({ label, href }) => (
                                            <li key={label}>
                                                <Link
                                                    href={href}
                                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                                >
                                                    {label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/10">
                    <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">© 2026 Specter AI</p>
                        <div className="flex items-center gap-5">
                            <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy</Link>
                            <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms</Link>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="text-xs text-slate-500">All systems operational</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
