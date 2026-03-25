import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Cpu, AlertCircle, BarChart3, Globe } from 'lucide-react';
import { RerunButton } from '@/components/engine/RerunButton';
import { StopButton } from '@/components/engine/StopButton';
import { LiveSessionList } from '@/components/engine/LiveSessionList';

export default async function TestRunPage({ params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params;
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    const [runRes, sessionsRes] = await Promise.all([
        supabase
            .from('test_runs')
            .select(`*, projects(name, target_url, llm_provider)`)
            .eq('id', runId)
            .single(),
        supabase
            .from('persona_sessions')
            .select(`*, persona_configs(name, goal_prompt)`)
            .eq('test_run_id', runId)
            .order('created_at', { ascending: true })
    ]);

    const run = runRes.data as any;
    const sessions = sessionsRes.data as any[] | null;

    if (runRes.error || !run) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <h2 className="text-lg font-bold text-white">Test run not found</h2>
                <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const isCompleted = run.status === 'completed';
    const provider = run.projects?.llm_provider || 'Gemini';

    return (
        <div className="animate-in fade-in space-y-8 duration-700">

            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/test-runs" className="hover:text-white transition-colors">Test Runs</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-slate-300 truncate max-w-[200px]">{run.projects?.name}</span>
            </div>

            {/* ── Header ── */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="space-y-2 min-w-0">
                        <h1 className="text-xl font-bold text-white leading-snug">{run.projects?.name}</h1>

                    </div>

                    <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                        <StopButton runId={run.id} status={run.status} />
                        <RerunButton runId={run.id} />
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600/40">
                            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs font-semibold text-slate-300">
                                AI Engine: {provider}
                            </span>
                        </div>
                        {isCompleted && (
                            <Link
                                href={`/reports/${run.id}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <BarChart3 className="h-4 w-4" />
                                View Full Report
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Sessions ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Persona Sessions</h2>
                    <span className="text-xs text-slate-400">
                        {sessions?.length || 0} AI {sessions?.length === 1 ? 'persona' : 'personas'} ran
                    </span>
                </div>
                <LiveSessionList initialSessions={sessions || []} testRunId={run.id} />
            </div>
        </div>
    );
}
