import Sidebar from '@/components/dashboard/Sidebar';
import UserMenu from '@/components/auth/UserMenu';
import SyncUser from '@/components/auth/SyncUser';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-slate-50 selection:bg-indigo-500/30 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#080808] relative">
        <SyncUser />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 flex h-20 items-center justify-between px-10 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-4">

          </div>
          <UserMenu />
        </header>

        <div className="mx-auto max-w-[1400px] p-1 lg:p-16">
          {children}
        </div>
      </main>
    </div>
  );
}
