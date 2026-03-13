'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@clerk/nextjs';
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
    AlertCircle,
    BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const [session, setSession] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const logsEndRef = useRef<HTMLDivElement>(null);
    const { getToken } = useAuth();

    // Auto-redirect to report when completed
    useEffect(() => {
        if (session?.status === 'completed') {
            const checkReport = async () => {
                const { data: run } = await supabase
                    .from('test_runs')
                    .select('status')
                    .eq('id', session.test_run_id)
                    .single();

                if (run?.status === 'completed') {
                    // Give user a moment to see the success state
                    setTimeout(() => {
                        router.push(`/reports/${session.test_run_id}`);
                    }, 3000);
                }
            };
            checkReport();
        }
    }, [session?.status, session?.test_run_id, router, supabase]);

    useEffect(() => {
        async function fetchData() {
            const token = await getToken();
            const authenticatedSupabase = createClient(token || undefined);

            // Fetch session with persona config
            const { data: sessionData } = await authenticatedSupabase
                .from('persona_sessions')
                .select('*, persona_configs(*), test_runs(id, status, projects(name, target_url))')
                .eq('id', sessionId)
                .single();

            // Fetch existing logs
            const { data: logData } = await authenticatedSupabase
                .from('session_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('step_number', { ascending: true });

            setSession(sessionData);
            setLogs(logData || []);
            setLoading(false);

            // Subscribe to session updates
            const sessionSub = authenticatedSupabase
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
            const logsSub = authenticatedSupabase
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
                authenticatedSupabase.removeChannel(sessionSub);
                authenticatedSupabase.removeChannel(logsSub);
            };
        }

        fetchData();
    }, [sessionId, getToken]);

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
                                    <div className="relative">
                                        <Activity className="h-12 w-12 animate-pulse text-indigo-500/50" />
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {session?.live_status || 'Initializing engine...'}
                                        </p>
                                        <p className="text-[10px] text-slate-600 animate-pulse font-medium">
                                            Specter AI is currently analyzing the visual state of your application.
                                        </p>
                                    </div>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Goal</p>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">{session?.persona_configs?.goal_prompt}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Tech Literacy</p>
                                <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">{session?.persona_configs?.tech_literacy}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Age Range</p>
                                <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">{session?.persona_configs?.age_range || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Geolocation</p>
                                <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">{session?.persona_configs?.geolocation || 'N/A'}</p>
                            </div>
                            <div className="col-span-full space-y-1 mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Domain Familiarity</p>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                    {session?.persona_configs?.domain_familiarity || "General user with standard industry knowledge."}
                                </p>
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
                        liveStatus={session?.live_status}
                    />

                    <div className="flex flex-col rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden max-h-[600px] shadow-2xl">
                        <div className="flex items-center gap-3 p-5 border-b border-white/5 bg-white/[0.02]">
                            <History className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation History</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                            {logs.map((log, i) => {
                                const action = log.action_taken as any;
                                const isSystem = action?.type === 'system';

                                return (
                                    <div key={log.id} className="relative pl-6 pb-2 last:pb-0 border-l border-white/5">
                                        <div className={`absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full ${isSystem ? 'bg-slate-700' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                            }`} />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Step {log.step_number}</span>
                                                    {isSystem ? (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-bold uppercase tracking-widest">
                                                            {action.info?.replace('_', ' ')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold uppercase tracking-widest">
                                                            {action?.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] text-slate-700 font-medium">{new Date(log.created_at).toLocaleTimeString()}</span>
                                            </div>

                                            <div className={`p-4 rounded-2xl border transition-all ${isSystem
                                                ? 'bg-transparent border-white/5 opacity-60'
                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                                }`}>
                                                {log.inner_monologue && (
                                                    <p className="text-xs text-slate-300 leading-relaxed font-medium mb-3">
                                                        {log.inner_monologue}
                                                    </p>
                                                )}

                                                {!isSystem && action?.ux_feedback && (
                                                    <div className="p-3 mb-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Activity className="h-3 w-3 text-indigo-400" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Persona UX Insights</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                                                            "{action.ux_feedback}"
                                                        </p>
                                                    </div>
                                                )}

                                                {!isSystem && action?.possible_paths && action.possible_paths.length > 0 && (
                                                    <div className="mb-3 space-y-1.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Possible Navigational Paths</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {action.possible_paths.map((path: string, idx: number) => (
                                                                <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-500 font-mono">
                                                                    {path}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isSystem && action?.selector && (
                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                                        <span className="text-[10px] text-slate-500 font-mono bg-black/40 px-2 py-0.5 rounded">
                                                            Decision: {action.selector}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    {log.emotion_tag && (
                                                        <div className="flex items-center gap-1.5">
                                                            {emotionIcons[log.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 pt-0.5">
                                                                {log.emotion_tag}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
