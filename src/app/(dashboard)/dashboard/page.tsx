import Link from 'next/link';
import { Plus, Zap, History, ArrowUpRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { LiveDashboardStats } from '@/components/engine/LiveDashboardStats';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();

  const [projectsRes, runsRes, personasRes, recentRunsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('test_runs')
      .select('*, projects!inner(*)', { count: 'exact', head: true })
      .eq('projects.user_id', userId),

    supabase
      .from('persona_sessions')
      .select('*, test_runs!inner(*, projects!inner(*))', { count: 'exact', head: true })
      .eq('test_runs.projects.user_id', userId),

    supabase
      .from('test_runs')
      .select(`
        id,
        status,
        created_at,
        projects!inner (
          name,
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
      .limit(5)
  ]);

  const projectsCount = projectsRes.count;
  const runsCount = runsRes.count;
  const personasCount = personasRes.count;
  const recentRunsRaw = recentRunsRes.data;

  const recentRuns = (recentRunsRaw || []).map((run: any) => {
    const totalSessions = run.persona_sessions?.length || 0;
    const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;
    const status = run.status || 'unknown';

    return {
      id: run.id,
      name: run.projects?.name || run.projects?.target_url || 'Unnamed project',
      url: run.projects?.target_url || '',
      date: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status,
      totalSessions,
      completedSessions,
    };
  });

  return (
    <div className="animate-in fade-in space-y-12 duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Run AI-powered UX tests on your website and see how real users experience it.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          Run New Test
        </Link>
      </div>

      {/* ── Stats ── */}
      <LiveDashboardStats
        initialStats={{
          projectsCount: projectsCount || 0,
          runsCount: runsCount || 0,
          personasCount: personasCount || 0,
        }}
        userId={userId}
      />

      {/* ── Recent runs ── */}
      {recentRuns.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-700/60 border border-slate-600/40 flex items-center justify-center">
                <History className="h-4 w-4 text-slate-400" />
              </div>
              <h2 className="text-base font-bold text-white">Recent Test Runs</h2>
            </div>
            <Link
              href="/test-runs"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {recentRuns.map((run) => {
              const isCompleted = run.status === 'completed';
              const isFailed = run.status === 'failed';
              const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : Clock;
              const statusColor = isCompleted ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b';
              const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : run.status.charAt(0).toUpperCase() + run.status.slice(1);

              return (
                <Link
                  key={run.id}
                  href={`/test-runs/${run.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 px-5 py-4 transition-all hover:border-slate-600/60 hover:bg-slate-800/80"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-700/60 border border-slate-600/30 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[360px]">
                        {run.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{run.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 sm:mt-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {run.completedSessions}/{run.totalSessions} personas done
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold flex-shrink-0"
                      style={{ color: statusColor, borderColor: statusColor + '40', background: statusColor + '12' }}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusLabel}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {recentRuns.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Zap className="h-7 w-7 text-indigo-400 opacity-60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">No test runs yet</h3>
            <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
              Create a project and run your first AI test to see results here.
            </p>
          </div>
          <Link
            href="/projects/new/setup"
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create your first project →
          </Link>
        </div>
      )}
    </div>
  );
}
