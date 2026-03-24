'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Ghost, LayoutDashboard, Zap,
  Users, BarChart3, ChevronRight,
  Settings, Database, Activity
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Test Runs', icon: Zap, href: '/test-runs' },
    { name: 'Personas', icon: Users, href: '/personas' },
    { name: 'Reports', icon: BarChart3, href: '/reports' },
  ];

  return (
    <div className="hidden md:flex h-screen w-72 flex-col border-r border-white/20 bg-[#050505]/[0.2] text-slate-400 relative z-[60]">
      {/* ── LOGO ────────────────────────────────────────────────────────── */}
      <Link href="/" className="flex h-24 items-center gap-4 px-8 border-b border-white/5 cursor-pointer group/logo">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-2xl transition-transform group-hover/logo:scale-105 active:scale-95">
          <Ghost className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-white uppercase group-hover/logo:text-indigo-400 transition-colors">Specter</span>
          <span className="text-[9px] font-black tracking-[0.2em] text-indigo-500 uppercase">Engine v1.0</span>
        </div>
      </Link>

      {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-8 px-6 py-10 overflow-y-auto scrollbar-hide">
        <div className="space-y-2">

          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 border ${isActive
                  ? 'bg-white/5 text-white border-white/10 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)]'
                  : 'text-slate-400 border-transparent hover:bg-white/[0.2] hover:text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon
                    className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-400'}`}
                  />
                  {item.name}
                </div>
                {isActive && (
                  <div className="relative flex items-center justify-center h-2 w-2">
                    <span className="absolute h-full w-full rounded-full bg-indigo-500/50 animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
