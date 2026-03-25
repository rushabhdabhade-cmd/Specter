import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Clock, Globe, Plus, ArrowRight, CheckCircle2, XCircle, Activity } from 'lucide-react';

export default async function TestRunsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

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
        const status = run.status || 'pending';

        return {
            id: run.id,
            projectName: run.projects?.name || run.projects?.target_url || 'Untitled Project',
            url: run.projects?.target_url || '',
            status,
            date: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalSessions,
            completedSessions,
        };
    });

    return (
        <div className="animate-in fade-in space-y-8 duration-700">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Test Runs</h1>
                    <p className="text-base text-slate-400 mt-1">
                        All AI-powered UX tests run across your projects.
                    </p>
                </div>
                <Link
                    href="/projects/new/setup"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex-shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    New Test Run
                </Link>
            </div>

            {/* ── List ── */}
            {testRuns.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {testRuns.map((run) => {
                        const isCompleted = run.status === 'completed';
                        const isFailed = run.status === 'failed';
                        const isRunning = run.status === 'running';
                        const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : isRunning ? Activity : Clock;
                        const statusColor = isCompleted ? '#10b981' : isFailed ? '#ef4444' : isRunning ? '#3b82f6' : '#64748b';
                        const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : isRunning ? 'Running' : 'Pending';

                        return (
                            <Link
                                key={run.id}
                                href={`/test-runs/${run.id}`}
                                className="group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/50 px-6 py-5 transition-all hover:border-slate-600/60 hover:bg-slate-800/80 overflow-hidden"
                            >
                                {/* Left accent bar */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                    style={{ background: statusColor }}
                                />

                                <div className="flex items-center gap-5 pl-3">
                                    <div
                                        className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
                                        style={{ background: statusColor + '15', borderColor: statusColor + '35' }}
                                    >
                                        <Zap className={`h-5 w-5 ${isRunning ? 'animate-pulse' : ''}`} style={{ color: statusColor }} />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                                            {run.projectName}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 mt-1.5">

                                            <span className="flex items-center gap-1.5 text-sm text-slate-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                {run.date}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 mt-4 sm:mt-0 pl-3 sm:pl-0 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-200">
                                            {run.completedSessions}/{run.totalSessions}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">personas done</p>
                                    </div>

                                    <div
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold"
                                        style={{ color: statusColor, borderColor: statusColor + '40', background: statusColor + '12' }}
                                    >
                                        <StatusIcon className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
                                        {statusLabel}
                                    </div>

                                    <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Zap className="h-7 w-7 text-indigo-400 opacity-60" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-base font-bold text-white">No test runs yet</h3>
                        <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                            Run a UX test on your website to see results here.
                        </p>
                    </div>
                    <Link
                        href="/projects/new/setup"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Run your first test
                    </Link>
                </div>
            )}
        </div>
    );
}
