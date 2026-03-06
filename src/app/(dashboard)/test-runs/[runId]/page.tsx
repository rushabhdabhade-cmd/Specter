import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Cpu, User, Play, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default async function TestRunPage({ params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params;
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    // Fetch test run with project details
    const { data: run, error: runError } = await supabase
        .from('test_runs')
        .select(`
      *,
      projects (
        name,
        target_url,
        llm_provider
      )
    `)
        .eq('id', runId)
        .single();

    if (runError || !run) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <h2 className="text-xl font-bold text-white">Test Run not found</h2>
                <Link href="/dashboard" className="text-blue-500 hover:underline">Back to Dashboard</Link>
            </div>
        );
    }

    // Fetch all sessions for this test run
    const { data: sessions } = await supabase
        .from('persona_sessions')
        .select(`
      *,
      persona_configs (
        name,
        goal_prompt
      )
    `)
        .eq('test_run_id', runId)
        .order('created_at', { ascending: true });

    const statusColors = {
        queued: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
        running: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        abandoned: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        error: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    return (
        <div className="animate-in fade-in space-y-10 duration-700">
            {/* Header */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-slate-300">Test Run Details</span>
                </div>

                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{run.projects?.name}</h1>
                        <p className="font-medium text-slate-500">
                            Target: <span className="text-indigo-400 select-all">{run.projects?.target_url}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Cpu className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white">
                            Engine: {run.projects?.llm_provider || 'Ollama'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sessions Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight text-white">Persona Sessions</h2>
                    <span className="text-xs font-medium text-slate-500">{sessions?.length || 0} Synthetic Users Deployed</span>
                </div>

                <div className="grid gap-4">
                    {sessions?.map((session) => (
                        <div
                            key={session.id}
                            className="group flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 transition-all hover:border-white/10 hover:bg-[#121212]"
                        >
                            <div className="flex items-center gap-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-white">{session.persona_configs?.name}</p>
                                    <p className="text-xs text-slate-500 max-w-[400px] truncate">
                                        Goal: {session.persona_configs?.goal_prompt}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${statusColors[session.status as keyof typeof statusColors]}`}>
                                        {session.status}
                                    </span>
                                    {session.execution_mode === 'manual' && (
                                        <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tighter">
                                            Manual Approval Required
                                        </span>
                                    )}
                                </div>

                                <Link
                                    href={`/sessions/${session.id}`}
                                    className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/10 active:scale-95 border border-white/5"
                                >
                                    <Play className="h-3 w-3" />
                                    View Session
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
