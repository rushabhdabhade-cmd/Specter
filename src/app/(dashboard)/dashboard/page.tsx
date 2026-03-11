import Link from 'next/link';
import { Plus, CheckCircle2, Play, Clock, Zap, History, ArrowUpRight, Cpu } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { LiveDashboardStats } from '@/components/engine/LiveDashboardStats';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();

  // Fetch Stats (Filtered by userId)
  const { count: projectsCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: runsCount } = await supabase
    .from('test_runs')
    .select('*, projects!inner(*)', { count: 'exact', head: true })
    .eq('projects.user_id', userId);

  const { count: personasCount } = await supabase
    .from('persona_sessions')
    .select('*, test_runs!inner(*, projects!inner(*))', { count: 'exact', head: true })
    .eq('test_runs.projects.user_id', userId);

  // Fetch Recent Runs with Project URL
  const { data: recentRunsRaw } = await supabase
    .from('test_runs')
    .select(`
      id,
      status,
      created_at,
      projects!inner (
        target_url,
        user_id
      ),
      persona_sessions (
        id,
        status
      )
    `)
    .eq('projects.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentRuns = (recentRunsRaw || []).map((run: any) => {
    const totalSessions = run.persona_sessions?.length || 0;
    const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;

    return {
      id: run.id,
      url: run.projects?.target_url || 'Unknown',
      date: new Date(run.created_at).toLocaleDateString(),
      status: run.status?.toUpperCase() || 'UNKNOWN',
      statusColor: run.status === 'failed' ? 'text-red-400 border-red-500/20' : run.status === 'completed' ? 'text-emerald-400 border-emerald-500/20' : 'text-blue-400 border-blue-500/20',
      totalSessions,
      completedSessions
    };
  });

  return (
    <div className="animate-in fade-in space-y-20 duration-1000 selection:bg-indigo-500/30">
      {/* ── COMMAND HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <Cpu className="h-3.5 w-3.5" />
            Engine Status: Optimal
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">Command <br /> <span className="italic opacity-50">Center.</span></h1>
          <p className="max-w-md text-sm font-medium text-slate-500 italic leading-relaxed">
            Orchestrating autonomous behavioral synthesis across your network protocol.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="group flex items-center gap-4 rounded-2xl bg-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
        >
          <Plus className="h-5 w-5" />
          Initialize Protocol
        </Link>
      </div>

      {/* ── LIVE ANALYTICS ─────────────────────────────────────────────── */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Live Analytics</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <LiveDashboardStats
          initialStats={{
            projectsCount: projectsCount || 0,
            runsCount: runsCount || 0,
            personasCount: personasCount || 0
          }}
          userId={userId}
        />
      </section>

      {/* ── EXECUTION PROTOCOLS ────────────────────────────────────────── */}
      {recentRuns.length > 0 && (
        <section className="space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <History className="h-5 w-5 text-slate-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white italic">Execution Logs</h2>
            </div>
            <Link href="/test-runs" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors flex items-center gap-2">
              View All Protocol Logs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/test-runs/${run.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between rounded-[32px] border border-white/5 bg-[#0a0a0a] p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.01]"
              >
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Zap className={`h-5 w-5 ${run.status === 'COMPLETED' ? 'text-emerald-400' : run.status === 'FAILED' ? 'text-red-400' : 'text-blue-400'} group-hover:scale-110 transition-transform`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                      {run.url}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">ID: {run.id.slice(0, 8)}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-800" />
                      <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{run.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 mt-6 md:mt-0">
                  <div className="flex flex-col items-end gap-1 px-6 border-r border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Cohort Synthesis</span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {run.completedSessions}/{run.totalSessions} <span className="opacity-30 italic">Active</span>
                    </span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl bg-white/5 border ${run.statusColor} text-[10px] font-black tracking-[0.2em] uppercase`}>
                    {run.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentRuns.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-8 rounded-[48px] border border-white/5 bg-white/[0.01] p-32 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Zap className="h-10 w-10 opacity-30" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-white italic">Protocol Inactive</h3>
            <p className="max-w-[280px] mx-auto text-sm font-medium text-slate-600 italic leading-relaxed">
              No behavioral synthesis sessions found. Initialize your first protocol to begin.
            </p>
          </div>
          <Link
            href="/projects/new/setup"
            className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors underline underline-offset-8 decoration-indigo-500/20"
          >
            Launch Setup Wizard
          </Link>
        </div>
      )}
    </div>
  );
}
