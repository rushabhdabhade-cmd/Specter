'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ghost, ArrowRight } from 'lucide-react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Product', href: '/product' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Docs', href: '/docs' },
  { name: 'About', href: '/about' },
];

export default function MarketingNavbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check on mount in case page is pre-scrolled
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On the homepage, start transparent and transition to glassmorphism.
  // On other pages, always use the solid header.
  const transparent = isHome && !scrolled;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: transparent ? 'transparent' : 'rgba(6,6,16,0.82)',
        backdropFilter: transparent ? 'none' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: transparent ? 'none' : 'blur(20px) saturate(180%)',
        borderBottom: transparent
          ? '1px solid transparent'
          : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <nav className="flex h-[60px] items-center justify-between gap-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${transparent
                ? 'bg-slate-900/10 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white'
                : 'bg-white/12 text-white group-hover:bg-indigo-600'
              }`}>
              <Ghost className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className={`text-sm font-semibold tracking-tight transition-colors ${transparent ? 'text-slate-800' : 'text-white'
              }`}>
              Specter
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3.5 py-1.5 text-sm rounded-lg transition-all ${isActive
                      ? transparent ? 'text-slate-900 font-bold' : 'text-white font-bold'
                      : transparent
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
                        : 'text-white/58 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {item.name}
                  {/* Active underline indicator */}
                  <span
                    className={`absolute bottom-0 left-3.5 right-3.5 h-[2.5px] rounded-t-full transition-all duration-300 ${isActive
                        ? transparent ? 'bg-indigo-600 scale-100 opacity-100' : 'bg-indigo-400 scale-100 opacity-100'
                        : 'bg-transparent scale-0 opacity-0'
                      }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="px-5 py-2 text-sm font-semibold rounded-xl bg-white text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all border border-slate-200/60 ring-1 ring-black/5">
                    Log in
                  </button>
                </SignInButton>
                {/* <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #0891b2)' }}
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link> */}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${transparent
                      ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/5'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Dashboard
                </Link>
                <UserButton
                  appearance={{ elements: { userButtonAvatarBox: 'h-7 w-7 rounded-md shadow-sm' } }}
                />
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
