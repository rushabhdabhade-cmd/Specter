import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, ChevronRight, Clock, Globe, ArrowUpRight } from 'lucide-react';

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
      )
    `)
        .eq('projects.user_id', userId)
        .order('created_at', { ascending: false });

    const testRuns = (testRunsRaw || []).map((run: any) => ({
        id: run.id,
        projectName: run.projects?.name || 'Untitled Project',
        url: run.projects?.target_url || 'Unknown',
        status: run.status || 'pending',
        createdAt: new Date(run.created_at).toLocaleDateString(),
        startedAt: run.started_at ? new Date(run.started_at).toLocaleTimeString() : null,
        completedAt: run.completed_at ? new Date(run.completed_at).toLocaleTimeString() : null,
    }));

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'failed':
                return 'text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            case 'running':
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse-subtle';
            default:
                return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="animate-in fade-in space-y-10 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Test Runs</h1>
                    <p className="font-medium text-slate-500">
                        Monitor and review every synthetic user journey across your projects.
                    </p>
                </div>
                <Link
                    href="/projects/new/setup"
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    <Zap className="h-4 w-4 fill-current" />
                    Deploy New Cohort
                </Link>
            </div>

            {/* Runs List */}
            <div className="grid gap-4">
                {testRuns.length > 0 ? (
                    testRuns.map((run) => (
                        <Link
                            key={run.id}
                            href={`/test-runs/${run.id}`}
                            className="group relative flex items-center justify-between rounded-[24px] border border-white/5 bg-[#0d0d0d] p-7 transition-all hover:border-white/10 hover:bg-[#111111] hover:shadow-2xl hover:shadow-white/[0.02]"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 transition-all group-hover:bg-white/10`}>
                                    <Zap className={`h-5 w-5 ${run.status === 'running' ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`} />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {run.projectName}
                                        </h3>
                                        <div className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${getStatusStyle(run.status)}`}>
                                            {run.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Globe className="h-3.5 w-3.5" />
                                            <span className="text-xs font-medium max-w-[200px] truncate">{run.url}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-xs font-medium tracking-tight whitespace-nowrap">{run.createdAt}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col items-end gap-1 px-4 border-r border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">ID</span>
                                    <span className="text-[11px] font-mono text-slate-400">{run.id.slice(0, 8)}...</span>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity border border-white/5">
                                    <ArrowUpRight className="h-4 w-4" />
                                </div>
                            </div>

                            {/* Status Indicator Glow */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full transition-all duration-500 ${run.status === 'completed' ? 'bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.5)]' :
                                    run.status === 'failed' ? 'bg-red-500 shadow-[2px_0_15px_rgba(239,68,68,0.5)]' :
                                        run.status === 'running' ? 'bg-blue-500 shadow-[2px_0_15px_rgba(59,130,246,0.5)]' :
                                            'bg-slate-700 opacity-0'
                                }`} />
                        </Link>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] py-24 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-600 mb-6">
                            <Zap className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No test runs found</h3>
                        <p className="max-w-[300px] text-sm text-slate-500 mb-8 leading-relaxed">
                            Launch your first cohort of synthetic users to start gathering behavioral insights.
                        </p>
                        <Link
                            href="/projects/new/setup"
                            className="bg-white px-6 py-3 rounded-xl text-sm font-bold text-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
