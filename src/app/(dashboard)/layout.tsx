import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-slate-50 selection:bg-indigo-500/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]/30 pt-1 backdrop-blur-3xl">
        <div className="mx-auto max-w-[1280px] p-10">{children}</div>
      </main>
    </div>
  );
}
