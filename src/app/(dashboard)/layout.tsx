import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#050505] text-slate-50 overflow-hidden selection:bg-indigo-500/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]/30 backdrop-blur-3xl pt-1">
        <div className="max-w-[1280px] mx-auto p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
