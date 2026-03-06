import Link from 'next/link';
import { Plus, CheckCircle2, Play, Clock, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

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

  const stats = [
    {
      label: 'Active Projects',
      value: projectsCount?.toString() || '0',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Test Runs',
      value: runsCount?.toString() || '0',
      icon: Play,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Personas Deployed',
      value: personasCount?.toString() || '0',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const recentRuns = (recentRunsRaw || []).map((run: any) => {
    const totalSessions = run.persona_sessions?.length || 0;
    const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;

    return {
      id: run.id,
      url: run.projects?.target_url || 'Unknown',
      date: new Date(run.created_at).toLocaleDateString(),
      status: run.status?.toUpperCase() || 'UNKNOWN',
      statusColor: run.status === 'failed' ? 'bg-red-500' : run.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500',
      totalSessions,
      completedSessions
    };
  });

  return (
    <div className="animate-in fade-in space-y-10 duration-700">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="font-medium text-slate-500">
            Welcome back. Here's what's happening with your synthetic users.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Plus className="h-4 w-4" />
          New Test Run
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] p-8 transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-white/[0.02]"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400 transition-colors group-hover:text-slate-300">
                {stat.label}
              </span>
              <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
            </div>
            <div className="text-4xl font-bold tracking-tight text-white">{stat.value}</div>

            {/* Subtle Gradient Glow */}
            <div
              className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${stat.bgColor} opacity-0 blur-[50px] transition-opacity duration-700 group-hover:opacity-100`}
            />
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {recentRuns.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Recent Test Runs</h2>

          <div className="space-y-3">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/test-runs/${run.id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f0f0f] p-5 px-6 transition-all hover:border-white/10 hover:bg-[#121212]"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${run.statusColor} shadow-[0_0_10px_rgba(239,68,68,0.5)]`}
                    />
                    <div
                      className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${run.statusColor} animate-ping opacity-20`}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white transition-colors group-hover:text-indigo-400">
                      {run.url}
                    </p>
                    <p className="text-[11px] font-medium tracking-widest text-slate-500 uppercase">
                      {run.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 px-4 border-r border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Cohort</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {run.completedSessions}/{run.totalSessions} Ready
                    </span>
                  </div>
                  <div className={`rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-tighter text-slate-300`}>
                    {run.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Hint */}
      {recentRuns.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
            <Zap className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">No activity yet</p>
            <p className="max-w-[200px] text-xs text-slate-500">
              Configure your first test run to start analyzing your user journey.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
