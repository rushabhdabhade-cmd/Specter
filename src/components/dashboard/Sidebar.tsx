'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ghost, LayoutDashboard, Zap, Users, BarChart3, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Test Runs', icon: Zap, href: '/test-runs' },
    { name: 'Personas', icon: Users, href: '/personas' },
    { name: 'Reports', icon: BarChart3, href: '/reports' },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/5 bg-[#050505] text-slate-400">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
          <Ghost className="h-5 w-5 fill-current" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">Specter</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-white/5 text-white shadow-[0_0_20px_rgba(255,255,255,0.03)] border border-white/5'
                : 'hover:bg-white/[0.02] hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`}
                />
                {item.name}
              </div>
              {isActive && <ChevronRight className="h-3 w-3 text-slate-600" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4 py-6">
        <div className="px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Powered by Specter AI
          </p>
        </div>
      </div>
    </div>
  );
}
