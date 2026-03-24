import Link from 'next/link';
import { Ghost, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const { userId } = await auth();

    return (
        <div className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-indigo-500/30 font-sans">
            {/* Background Grain/Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Navigation */}
            <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6">
                <nav className="flex h-16 items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-6 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:bg-black/50 hover:border-white/20">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            <Ghost className="h-5 w-5 fill-current" />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">Specter</span>
                    </Link>

                    <div className="hidden items-center gap-8 md:flex">
                        {[
                            { name: 'Product', href: '/product' },
                            { name: 'Pricing', href: '/pricing' },
                            { name: 'Docs', href: '/docs' },
                            { name: 'About', href: '/about' }
                        ].map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:text-white hover:tracking-[0.25em]"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-5">
                        {!userId ? (
                            <>
                                <SignInButton mode="modal">
                                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                                        Log In
                                    </button>
                                </SignInButton>
                                <Link
                                    href="/sign-up"
                                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                    Deploy
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-5">
                                <Link
                                    href="/dashboard"
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                >
                                    Console
                                </Link>
                                <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8 rounded-lg' } }} />
                            </div>
                        )}
                    </div>
                </nav>
            </header>

            <main className="flex-1">{children}</main>

            {/* Premium Footer */}
            <footer className="relative border-t border-white/5 bg-[#050505] pt-32 pb-16 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid grid-cols-1 gap-16 md:grid-cols-12 lg:gap-24">
                        <div className="md:col-span-4 space-y-8">
                            <Link href="/" className="flex items-center gap-3 group w-fit">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black transition-transform group-hover:scale-110">
                                    <Ghost className="h-6 w-6 fill-current" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter text-white">Specter</span>
                            </Link>
                            <p className="max-w-xs text-base font-medium leading-relaxed text-slate-500">
                                Pioneering the age of autonomous behavioral synthesis. Build better products with users that never sleep.
                            </p>
                            <div className="flex items-center gap-5">
                                {[Twitter, Github, Linkedin].map((Icon, i) => (
                                    <Link key={Icon.displayName} href="#" className="text-slate-600 hover:text-white transition-colors">
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Platform</h4>
                                <ul className="space-y-4">
                                    {['Capabilities', 'LLM Engine', 'Security', 'Enterprise'].map(item => (
                                        <li key={item}><Link href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-400 transition-colors">{item}</Link></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Resources</h4>
                                <ul className="space-y-4">
                                    {['Documentation', 'API Reference', 'User Guides', 'Community'].map(item => (
                                        <li key={item}><Link href={item === 'Documentation' ? '/docs' : '#'} className="text-sm font-medium text-slate-500 hover:text-indigo-400 transition-colors">{item}</Link></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Company</h4>
                                <ul className="space-y-4">
                                    {['About Us', 'Changelog', 'Status', 'Contact'].map(item => (
                                        <li key={item}><Link href={item === 'About Us' ? '/about' : '#'} className="text-sm font-medium text-slate-500 hover:text-indigo-400 transition-colors">{item}</Link></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">© 2026 Specter AI. Path To Synthesis.</p>
                        <div className="flex items-center gap-8">
                            <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Privacy</Link>
                            <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Terms</Link>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Systems Nominal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
