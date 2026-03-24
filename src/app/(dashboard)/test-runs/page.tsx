import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    Zap, ChevronRight, Clock,
    Globe, ArrowUpRight, Cpu,
    Plus, ArrowRight, Activity,
    Layout
} from 'lucide-react';

export default async function TestRunsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    // Fetch all test runs for projects owned by the user
    const { data: testRunsRaw } = await supabase
        .from('test_runs')
        .select(`
      id,
      status,
      created_at,
      started_at,
      completed_at,
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
        .order('created_at', { ascending: false });

    const testRuns = (testRunsRaw || []).map((run: any) => {
        const totalSessions = run.persona_sessions?.length || 0;
        const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;

        return {
            id: run.id,
            projectName: run.projects?.name || 'Untitled Project',
            url: run.projects?.target_url || 'Unknown',
            status: run.status || 'pending',
            createdAt: new Date(run.created_at).toLocaleDateString(),
            startedAt: run.started_at ? new Date(run.started_at).toLocaleTimeString() : null,
            completedAt: run.completed_at ? new Date(run.completed_at).toLocaleTimeString() : null,
            totalSessions,
            completedSessions
        };
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
            case 'failed':
                return 'text-red-400 border-red-500/20 bg-red-500/5';
            case 'running':
                return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
            default:
                return 'text-slate-500 border-white/5 bg-white/5';
        }
    };

    return (
        <div className="animate-in fade-in space-y-20 duration-1000">
            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <div className="flex flex-col space-y-8 md:flex-row md:items-end md:justify-between md:space-y-0">
                <div className="space-y-4">
                    {/* <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        <Zap className="h-3.5 w-3.5" />
                        Execution Protocol Logs
                    </div> */}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">Test <br /> <span className="italic opacity-50">Protocol.</span></h1>
                    <p className="max-w-md text-sm font-medium text-slate-500 italic leading-relaxed">
                        Complete historical record of every synthetic user journey deployed across your infrastructure.
                    </p>
                </div>

                <Link
                    href="/projects/new/setup"
                    className="group flex items-center gap-4 rounded-2xl bg-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                >
                    <Plus className="h-5 w-5" />
                    New Execution
                </Link>
            </div>

            {/* ── LOGS GRID ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6">
                {testRuns.length > 0 ? (
                    testRuns.map((run) => (
                        <Link
                            key={run.id}
                            href={`/test-runs/${run.id}`}
                            className="group relative flex flex-col md:flex-row md:items-center justify-between rounded-[48px] border border-white/5 bg-[#0a0a0a] p-10 transition-all duration-500 hover:border-white/10 hover:translate-x-1"
                        >
                            <div className="flex items-center gap-10">
                                <div className={`flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 transition-all group-hover:scale-110 group-hover:bg-white/[0.03]`}>
                                    <Zap className={`h-8 w-8 ${run.status === 'running' ? 'text-blue-400 animate-pulse' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <h3 className="text-3xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                                            {run.projectName}
                                        </h3>
                                        <div className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(run.status)}`}>
                                            {run.status}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Globe className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{run.url}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{run.createdAt}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Activity className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{run.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12 mt-10 md:mt-0 pt-10 md:pt-0 border-t md:border-t-0 md:border-l border-white/5">
                                <div className="flex flex-col items-end gap-1 px-8">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">Cohort Ready</span>
                                    <span className="text-lg font-mono font-bold text-slate-400">
                                        {run.completedSessions} / {run.totalSessions}
                                    </span>
                                </div>
                                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-600 opacity-30 group-hover:opacity-100 group-hover:text-indigo-400 transition-all border border-transparent group-hover:border-white/10">
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            </div>

                            {/* Status Glow Bar */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-20 rounded-r-full transition-all duration-700 ${run.status === 'completed' ? 'bg-emerald-500 shadow-[2px_0_20px_rgba(16,185,129,0.5)]' :
                                run.status === 'failed' ? 'bg-red-500 shadow-[2px_0_20px_rgba(239,68,68,0.5)]' :
                                    run.status === 'running' ? 'bg-blue-500 shadow-[2px_0_20px_rgba(59,130,246,0.5)]' :
                                        'bg-slate-800 opacity-20'
                                }`} />
                        </Link>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-[64px] border border-white/10 bg-white/[0.01] p-32 text-center">
                        <div className="relative mb-12">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse" />
                            <div className="relative h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-slate-700">
                                <Zap className="h-10 w-10 opacity-30" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white italic mb-4">No Protocol History</h3>
                        <p className="max-w-[320px] mx-auto text-sm font-medium text-slate-600 italic leading-relaxed mb-12">
                            You haven't deployed any synthetic cohorts yet. Launch your first execution protocol to begin.
                        </p>
                        <Link
                            href="/projects/new/setup"
                            className="flex items-center gap-4 rounded-2xl bg-white px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            Initialize First Protocol
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
