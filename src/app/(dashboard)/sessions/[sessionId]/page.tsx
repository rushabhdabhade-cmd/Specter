'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SessionControl } from '@/components/engine/SessionControl';
import {
    ChevronLeft,
    Terminal,
    MessageSquare,
    History,
    ExternalLink,
    Target,
    User as UserIcon,
    Smile,
    Frown,
    Meh,
    Activity,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SessionPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const [session, setSession] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            // Fetch session with persona config
            const { data: sessionData } = await supabase
                .from('persona_sessions')
                .select('*, persona_configs(*), test_runs(id, projects(name, target_url))')
                .eq('id', sessionId)
                .single();

            // Fetch existing logs
            const { data: logData } = await supabase
                .from('session_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('step_number', { ascending: true });

            setSession(sessionData);
            setLogs(logData || []);
            setLoading(false);
        }

        fetchData();

        // Subscribe to session updates
        const sessionSub = supabase
            .channel(`session_${sessionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'persona_sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                setSession((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        // Subscribe to new logs
        const logsSub = supabase
            .channel(`logs_${sessionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'session_logs',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                setLogs((prev) => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionSub);
            supabase.removeChannel(logsSub);
        };
    }, [sessionId, supabase]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    if (loading) return (
        <div className="flex items-center justify-center p-20 animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">
            Loading Mission Control...
        </div>
    );

    const latestLog = logs[logs.length - 1];
    const emotionIcons = {
        delight: <Smile className="h-4 w-4 text-emerald-400" />,
        frustration: <Frown className="h-4 w-4 text-amber-400" />,
        confusion: <Meh className="h-4 w-4 text-blue-400" />,
        neutral: <Activity className="h-4 w-4 text-slate-400" />,
    };

    return (
        <div className="animate-in fade-in space-y-8 duration-700 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/test-runs/${session?.test_run_id}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-white">{session?.persona_configs?.name}</h1>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-500 uppercase font-black">
                                Session {sessionId.slice(0, 8)}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            Testing <span className="text-slate-300">{session?.test_runs?.projects?.name}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {session?.exit_reason && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${session.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                            }`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold uppercase tracking-widest leading-none pt-0.5">
                                {session.exit_reason}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                        <Target className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-widest leading-none pt-0.5">
                            Mode: {session?.execution_mode}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Mirror & Monologue */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Visual Terminal */}
                    <div className="group relative rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Browser Terminal</span>
                            </div>
                            {latestLog?.current_url && (
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="max-w-[200px] truncate">{latestLog.current_url}</span>
                                </div>
                            )}
                        </div>

                        <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                            {latestLog?.screenshot_url ? (
                                <img
                                    src={latestLog.screenshot_url}
                                    alt="Browser View"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-700">
                                    <Activity className="h-12 w-12 animate-pulse" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Waiting for first observation...</p>
                                </div>
                            )}
                        </div>

                        {latestLog?.inner_monologue && (
                            <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="p-5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-indigo-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inner Monologue</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                            {emotionIcons[latestLog.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                            <span className="text-[10px] font-bold capitalize text-slate-300 pt-0.5 leading-none">
                                                {latestLog.emotion_tag || 'Neutral'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                        "{latestLog.inner_monologue}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Persona Details */}
                    <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-indigo-400" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Synthetic Persona</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Primary Goal</p>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">{session?.persona_configs?.goal_prompt}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Tech Literacy</p>
                                <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">{session?.persona_configs?.tech_literacy}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Controls & History */}
                <div className="space-y-8">
                    <SessionControl
                        sessionId={sessionId}
                        isPaused={!!session?.is_paused}
                        status={session?.status || 'queued'}
                    />

                    <div className="flex flex-col rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden max-h-[600px] shadow-2xl">
                        <div className="flex items-center gap-3 p-5 border-b border-white/5 bg-white/[0.02]">
                            <History className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation History</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {logs.map((log, i) => (
                                <div key={log.id} className="relative pl-6 pb-4 last:pb-0 border-l border-white/10">
                                    <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600">Step {log.step_number}</span>
                                            <span className="text-[9px] text-slate-700">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        {log.action_taken && (
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase text-indigo-400">{(log.action_taken as any).type}</span>
                                                    <span className="text-[10px] text-slate-500 truncate">{(log.action_taken as any).selector}</span>
                                                </div>
                                                {log.emotion_tag && (
                                                    <div className="flex items-center gap-1.5">
                                                        {emotionIcons[log.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                                        <span className="text-[9px] font-bold uppercase text-slate-500">Feeling {log.emotion_tag}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-center py-10 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">No history yet</p>
                                </div>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
        </div>
    );
}
