import Link from 'next/link';
import {
  Sparkles, Zap
} from 'lucide-react';
import ScrollyHero from '@/components/marketing/ScrollyHero';
import UrlTypewriterSection from '@/components/marketing/UrlTypewriterSection';
import LegoModelWrapper from '@/components/marketing/LegoModelWrapper';

export default function Home() {
  return (
    <div className="flex flex-col bg-white text-slate-900">

      {/* ── SCROLLYTELLING HERO (0–500vh sticky canvas) ── */}
      <ScrollyHero />

      {/* ── URL INPUT TYPEWRITER ── */}
      <UrlTypewriterSection />

      {/* ── 3D AI PERSONA MODEL ── */}
      <LegoModelWrapper />



      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 pb-32 relative overflow-hidden">
        {/* Wavy lines on section background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path
              key={i}
              d={`M -100 ${50 + i * 60} Q 200 ${10 + i * 60} 500 ${50 + i * 60} T 1100 ${50 + i * 60} T 1700 ${50 + i * 60}`}
              fill="none"
              stroke="rgba(6,182,212,0.6)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <div
          className="mx-auto max-w-4xl rounded-3xl p-16 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-indigo-100"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,255,0.97) 100%)',
            border: '1px solid rgba(99,102,241,0.1)',
          }}
        >
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.25) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Top glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10 space-y-8">
            {/* Social proof */}


            <h2
              className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900"
            >
              Start testing <br />
              <span className="text-indigo-600">smarter today.</span>
            </h2>
            <p className="max-w-xl mx-auto text-lg text-slate-500 leading-relaxed font-medium">
              Run your first AI user test in under 5 minutes. <br className="hidden md:block" />
              Just paste a URL — no setup, no scripts, just insights.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl px-10 py-5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/25"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                }}
              >
                Start for free
              </Link>
              <Link
                href="/pricing"
                className="text-slate-400 text-sm font-bold hover:text-indigo-600 transition-all px-6 py-4"
              >
                View pricing →
              </Link>
            </div>


          </div>
        </div>
      </section>
    </div>
  );
}

