import Link from 'next/link';
import { ArrowRight, Zap, Shield, Rocket } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
    const { userId } = await auth();
    const targetHref = userId ? "/dashboard" : "/dashboard"; // Simplified, linking to dashboard always works because of middleware, but will trigger sign-in if not authed. 
    // Actually, the user asked for specific navigation to "signin" if not already. 
    // Given their current .env.local it points to "/", so "/dashboard" is the most logical path that forces a login.

    return (
        <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center space-y-12">
            {/* Hero section placeholder */}
            <div className="space-y-6 max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <Zap className="h-3 w-3 text-indigo-400" />
                    The Future of Web Testing
                </div>

                <h1 className="text-6xl md:text-7xl font-bold tracking-tighter leading-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                    Specter: Autonomous <br /> Synthetic User Testing
                </h1>

                <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Deploy AI-powered synthetic users who explore your app like real people.
                    Uncover friction, find bugs, and optimize your conversion flow without
                    waiting for real user data.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                        href={userId ? "/dashboard" : "/dashboard"}
                        className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                    >
                        {userId ? "Go to Dashboard" : "Launch Cohort"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <button className="px-8 py-4 text-sm font-bold text-slate-300 hover:text-white transition-colors">
                        View Live Demo
                    </button>
                </div>
            </div>

            {/* Feature grid placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full pt-20 border-t border-white/5 opacity-60">
                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] text-left space-y-3">
                    <Shield className="h-6 w-6 text-indigo-400" />
                    <h3 className="font-bold">Real Human Personas</h3>
                    <p className="text-xs text-slate-500">Synthetic users with unique geolocations, ages, and tech literacy levels.</p>
                </div>
                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] text-left space-y-3">
                    <Rocket className="h-6 w-6 text-indigo-400" />
                    <h3 className="font-bold">Zero Setup Engine</h3>
                    <p className="text-xs text-slate-500">Just point to a URL. No selectors, no scripts, no maintenance required.</p>
                </div>
                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] text-left space-y-3">
                    <Zap className="h-6 w-6 text-indigo-400" />
                    <h3 className="font-bold">24/7 Monitoring</h3>
                    <p className="text-xs text-slate-500">Automated tests that run on every commit or on a persistent schedule.</p>
                </div>
            </div>

            {/* Minimal Footer */}
            <footer className="pt-20 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                © 2026 Specter Labs • Built for Modern Engineering Teams
            </footer>
        </main>
    );
}
