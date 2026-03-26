import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Clock, Plus, ArrowRight, CheckCircle2, XCircle, Activity } from 'lucide-react';

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
        <div className="animate-in fade-in space-y-8 duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Test Runs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        All AI-powered tests run across your projects.
                    </p>
                </div>
                <Link
                    href="/projects/new/setup"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    New Test Run
                </Link>
            </div>

            {/* ── List ── */}
            {testRuns.length > 0 ? (
                <div className="space-y-2">
                    {testRuns.map((run) => {
                        const isCompleted = run.status === 'completed';
                        const isFailed = run.status === 'failed';
                        const isRunning = run.status === 'running';
                        const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : isRunning ? Activity : Clock;
                        const statusClass = isCompleted
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                            : isFailed
                            ? 'text-red-600 bg-red-50 border-red-200'
                            : isRunning
                            ? 'text-blue-600 bg-blue-50 border-blue-200'
                            : 'text-slate-500 bg-slate-50 border-slate-200';
                        const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : isRunning ? 'Running' : 'Pending';
                        const accentClass = isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : isRunning ? 'bg-blue-500' : 'bg-slate-300';

                        return (
                            <Link
                                key={run.id}
                                href={`/test-runs/${run.id}`}
                                className="group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm overflow-hidden"
                            >
                                {/* Left accent bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentClass}`} />

                                <div className="flex items-center gap-4 pl-2">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                        isCompleted ? 'bg-emerald-50 border-emerald-200' :
                                        isFailed ? 'bg-red-50 border-red-200' :
                                        isRunning ? 'bg-blue-50 border-blue-200' :
                                        'bg-slate-50 border-slate-200'
                                    }`}>
                                        <Zap className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''} ${
                                            isCompleted ? 'text-emerald-500' :
                                            isFailed ? 'text-red-500' :
                                            isRunning ? 'text-blue-500' :
                                            'text-slate-400'
                                        }`} />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                            {run.projectName}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                {run.date}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-3 sm:mt-0 pl-2 sm:pl-0 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {run.completedSessions}/{run.totalSessions}
                                        </p>
                                        <p className="text-xs text-slate-400">users done</p>
                                    </div>

                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${statusClass}`}>
                                        <StatusIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
                                        {statusLabel}
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">No test runs yet</h3>
                        <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                            Run a test on your website to see results here.
                        </p>
                    </div>
                    <Link
                        href="/projects/new/setup"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Run your first test
                    </Link>
                </div>
            )}
        </div>
    );
}
