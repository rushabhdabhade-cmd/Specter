import Link from 'next/link';
import { Ghost, ArrowRight } from 'lucide-react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const { userId } = await auth();

    return (
        <div className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-indigo-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black transition-transform group-hover:scale-110">
                            <Ghost className="h-6 w-6 fill-current" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">Specter</span>
                    </Link>

                    <div className="hidden items-center gap-10 md:flex">
                        {['Product', 'Pricing', 'Docs', 'About'].map((item) => (
                            <Link
                                key={item}
                                href={item === 'Pricing' ? '/pricing' : '#'}
                                className="text-sm font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-6">
                        {!userId ? (
                            <>
                                <SignInButton mode="modal">
                                    <button className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <Link
                                    href="/sign-up"
                                    className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    Get Started
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                >
                                    Dashboard
                                </Link>
                                <UserButton />
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="flex-1 pt-20">{children}</main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#050505] py-20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
                        <div className="col-span-2 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
                                    <Ghost className="h-5 w-5 fill-current" />
                                </div>
                                <span className="text-xl font-black tracking-tighter text-white">Specter</span>
                            </div>
                            <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                                The world's first autonomous synthetic user engine. Test your UX before real humans ever see it.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white">Product</h4>
                            <ul className="space-y-4">
                                {['Features', 'Manual Step', 'LLM Engine', 'Security'].map(item => (
                                    <li key={item}><Link href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-400 transition-colors">{item}</Link></li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white">Support</h4>
                            <ul className="space-y-4">
                                {['Documentation', 'API Reference', 'Status', 'Contact'].map(item => (
                                    <li key={item}><Link href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-400 transition-colors">{item}</Link></li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-20 border-t border-white/5 pt-10 text-center">
                        <p className="text-xs font-medium text-slate-700">© 2026 Specter AI. Built for the future of UX.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
