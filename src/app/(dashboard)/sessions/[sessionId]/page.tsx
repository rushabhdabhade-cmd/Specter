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
    Brain,
    User as UserIcon,
    Smile,
    Frown,
    Meh,
    Activity,
    AlertCircle,
    BarChart3,
    Sparkles,
    Globe,
    Cpu,
    Compass
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const [session, setSession] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const logsEndRef = useRef<HTMLDivElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);
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

            // 1. Parallel Fetching
            const [sessionRes, logsRes] = await Promise.all([
                authenticatedSupabase
                    .from('persona_sessions')
                    .select('*, persona_configs(*), test_runs(id, status, projects(name, target_url))')
                    .eq('id', sessionId)
                    .single(),

                authenticatedSupabase
                    .from('session_logs')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('step_number', { ascending: true })
            ]);

            const sessionData = sessionRes.data;
            const logData = logsRes.data;

            setSession(sessionData);
            setLogs(logData || []);

            // Reconstruct terminal history from stored session logs
            const historyLines = (logData || []).map((log: any) => {
                const action = log.action_taken as any;
                if (action?.type === 'system') {
                    return `[SYS] ${(action.info || '').replace(/_/g, ' ').toUpperCase()}`;
                }
                const path = (() => { try { return new URL(log.current_url).pathname; } catch { return log.current_url || ''; } })();
                const thought = log.inner_monologue ? ` — ${log.inner_monologue.slice(0, 90)}` : '';
                return `[Step ${log.step_number}] ${(action?.type || 'action').toUpperCase()} ${path}${thought}`;
            }).filter(Boolean);
            if (sessionData?.live_status) historyLines.push(`[STATUS] ${sessionData.live_status}`);
            setTerminalLines(historyLines);

            setLoading(false);

            // Subscribe to session postgres changes
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

            // Subscribe to live terminal broadcast — must match orchestrator's channel name
            const terminalSub = authenticatedSupabase
                .channel(`terminal_${sessionId}`)
                .on('broadcast', { event: 'log' }, (payload: any) => {
                    const message = payload.payload?.message;
                    if (message) {
                        setTerminalLines(prev => [...prev, `[LIVE] ${message}`]);
                    }
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
                    // Mirror new steps into terminal in real-time
                    const log = payload.new as any;
                    const action = log.action_taken as any;
                    const path = (() => { try { return new URL(log.current_url).pathname; } catch { return log.current_url || ''; } })();
                    const thought = log.inner_monologue ? ` — ${log.inner_monologue.slice(0, 90)}` : '';
                    const line = action?.type === 'system'
                        ? `[SYS] ${(action.info || '').replace(/_/g, ' ').toUpperCase()}`
                        : `[Step ${log.step_number}] ${(action?.type || 'action').toUpperCase()} ${path}${thought}`;
                    setTerminalLines(prev => [...prev, line]);
                })
                .subscribe();

            return () => {
                authenticatedSupabase.removeChannel(sessionSub);
                authenticatedSupabase.removeChannel(terminalSub);
                authenticatedSupabase.removeChannel(logsSub);
            };
        }

        fetchData();
    }, [sessionId, getToken]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLines]);

    // ── Progress derivation ───────────────────────────────────────────────────
    const MAX_PAGES = 15;
    const MAX_ACTIONS_PAGE = 5;

    // Parse "Page X/15: …" or "Page X | Action Y/5 | …" from live_status
    const pageMatch = session?.live_status?.match(/Page\s+(\d+)/i);
    const actionMatch = session?.live_status?.match(/Action\s+(\d+)\/(\d+)/i);
    const pagesVisited = pageMatch ? parseInt(pageMatch[1], 10) : 0;
    const currentPageAction = actionMatch ? parseInt(actionMatch[1], 10) : 0;

    // Fallback: count unique page URLs from log history
    const uniquePages = new Set(logs.map((l: any) => l.current_url).filter(Boolean)).size;
    const effectivePages = Math.max(pagesVisited, uniquePages);

    const stepsCompleted = logs.filter((l: any) => (l.action_taken as any)?.type !== 'system').length;
    const totalCapacity = MAX_PAGES * MAX_ACTIONS_PAGE; // 75 max actions

    // Overall %: weight pages 70% + actions-within-page 30%
    const pageProgress = Math.min(effectivePages / MAX_PAGES, 1);
    const actionProgress = effectivePages > 0 ? currentPageAction / MAX_ACTIONS_PAGE : 0;
    const overallPct = session?.status === 'completed' ? 100
        : session?.status === 'error' ? Math.round(pageProgress * 100)
            : Math.min(Math.round((pageProgress * 0.7 + actionProgress * 0.3) * 100), 99);

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
            <div className="flex items-center justify-between p-6 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <Link
                        href={`/test-runs/${session?.test_run_id}`}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-inner group"
                    >
                        <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-white">{session?.persona_configs?.name}</h1>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                <Activity className="h-3 w-3 text-indigo-400" />
                                <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest leading-none pt-0.5">
                                    Live Session
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                            <Compass className="h-3.5 w-3.5 text-slate-600" />
                            <span>Navigating <span className="text-indigo-400/80 font-bold">{session?.test_runs?.projects?.name}</span></span>
                        </div>
                        {session?.live_status && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {session.live_status.split('|').map((part: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-2xl animate-pulse">
                                        {idx === 0 && <Compass className="h-3.5 w-3.5 text-emerald-400" />}
                                        {idx === 1 && <Activity className="h-3.5 w-3.5 text-emerald-400" />}
                                        {idx === 2 && <Globe className="h-3.5 w-3.5 text-emerald-400" />}
                                        <span className="truncate max-w-[200px]">{part.trim()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {session?.exit_reason && (
                        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-lg ${session.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                            <div className={`h-2 w-2 rounded-full animate-pulse ${session.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="text-xs font-black uppercase tracking-[0.15em] leading-none pt-0.5">
                                {session.exit_reason}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pb-6 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Session Progress</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">
                            <span className="text-white">{effectivePages}</span>/{MAX_PAGES} pages
                        </span>
                        <span className="text-slate-500">
                            <span className="text-white">{stepsCompleted}</span> steps
                        </span>
                        <span className={`text-lg font-black tabular-nums ${session?.status === 'completed' ? 'text-emerald-400' :
                                session?.status === 'error' ? 'text-red-400' : 'text-indigo-400'
                            }`}>{overallPct}%</span>
                    </div>
                </div>

                {/* Track */}
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden relative">
                    {/* Pages filled */}
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${session?.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' :
                                session?.status === 'error' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' :
                                    'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                            }`}
                        style={{ width: `${overallPct}%` }}
                    />
                    {/* Shimmer on active */}
                    {session?.status === 'running' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    )}
                </div>

                {/* Page tick marks */}
                <div className="flex items-center gap-[1px]">
                    {Array.from({ length: MAX_PAGES }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-sm transition-all duration-500 ${i < effectivePages
                                    ? session?.status === 'completed' ? 'bg-emerald-500/60' : 'bg-indigo-500/60'
                                    : i === effectivePages && session?.status === 'running'
                                        ? 'bg-indigo-500/30 animate-pulse'
                                        : 'bg-white/5'
                                }`}
                        />
                    ))}
                </div>
                <p className="text-[9px] text-slate-600 font-medium">
                    {session?.status === 'completed'
                        ? `Completed — ${stepsCompleted} total interactions across ${effectivePages} pages`
                        : session?.status === 'error'
                            ? 'Session ended with an error'
                            : effectivePages === 0
                                ? 'Starting up...'
                                : `Exploring page ${effectivePages} of ${MAX_PAGES} — ${MAX_PAGES - effectivePages} page${MAX_PAGES - effectivePages !== 1 ? 's' : ''} remaining`
                    }
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Mirror & Monologue */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Visual Terminal */}
                    <div className="group relative rounded-[40px] border border-white/10 bg-[#060606] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] transition-all hover:border-white/20">
                        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.03] backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5 mr-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20" />
                                </div>
                                <Terminal className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mission Mirror v1.0</span>
                            </div>
                            {latestLog?.current_url && (
                                <a
                                    href={latestLog.current_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400 font-mono hover:bg-white/10 hover:border-white/10 hover:text-white transition-all cursor-pointer"
                                >
                                    <Globe className="h-3 w-3 text-indigo-500/50" />
                                    <span className="max-w-[300px] truncate">{latestLog.current_url}</span>
                                </a>
                            )}
                        </div>

                        <div className="aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                            {latestLog?.screenshot_url ? (
                                <img
                                    src={latestLog.screenshot_url}
                                    alt="Browser View"
                                    className="w-full h-full object-contain filter brightness-[0.9] group-hover:brightness-100 transition-all duration-700"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-6 text-slate-700">
                                    <div className="relative">
                                        <Cpu className="h-16 w-16 animate-spin-slow text-indigo-500/30" />
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                            {session?.live_status || 'Initializing Quantum Engine...'}
                                        </p>
                                        <p className="text-[10px] text-slate-600 animate-pulse font-medium max-w-[240px] leading-relaxed">
                                            Synchronizing temporal visual state with Specter Core for high-fidelity logic analysis.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Scanning overlay effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_0%,rgba(99,102,241,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan" />
                        </div>

                        {latestLog?.inner_monologue && (
                            <div className="absolute bottom-6 left-6 right-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                <div className="p-6 rounded-[32px] bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden group/monologue">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover/monologue:opacity-100 transition-opacity duration-700" />

                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                <Brain className="h-4 w-4 text-indigo-400" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Active Thought Process</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 shadow-inner">
                                            {emotionIcons[latestLog.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 pt-0.5 leading-none">
                                                {latestLog.emotion_tag || 'Neutral'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="relative text-base text-white/90 leading-relaxed font-semibold tracking-tight italic">
                                        &ldquo;{latestLog.inner_monologue}&rdquo;
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Persona Details */}
                    <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-10 space-y-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group/persona">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                    <UserIcon className="h-6 w-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight text-white uppercase italic">Synthetic Bio-Profile</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Participant Cohort ID: SPECTER-{sessionId.slice(0, 4).toUpperCase()}</p>
                                </div>
                            </div>
                            <Sparkles className="h-5 w-5 text-indigo-500/30 animate-pulse" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pt-0.5">Primary Narrative Goal</p>
                                </div>
                                <p className="text-base text-indigo-50/90 leading-relaxed font-semibold italic pl-5 border-l-2 border-indigo-500/20">
                                    &ldquo;{session?.persona_configs?.goal_prompt}&rdquo;
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2 group/stat">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover/stat:text-indigo-500/50 transition-colors">Tech Literacy</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000`} style={{ width: session?.persona_configs?.tech_literacy === 'high' ? '100%' : session?.persona_configs?.tech_literacy === 'medium' ? '60%' : '30%' }} />
                                        </div>
                                        <span className="text-xs text-white font-black uppercase tracking-widest">{session?.persona_configs?.tech_literacy}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-3 border-y border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Demographic</p>
                                        <p className="text-xs text-white font-bold">{session?.persona_configs?.age_range || '25-45'} Years</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/5" />
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Origin</p>
                                        <p className="text-xs text-white font-bold">{session?.persona_configs?.geolocation || 'Global'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex items-start gap-4">
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 mt-1">
                                <Globe className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cognitive Domain Familiarity</p>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    {session?.persona_configs?.domain_familiarity || "General user with high-level awareness of digital landscape conventions and standard UX patterns."}
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
                        innerMonologue={latestLog?.inner_monologue}
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

                                                {!isSystem && action?.possible_paths && Array.isArray(action.possible_paths) && action.possible_paths.length > 0 && (
                                                    <div className="mb-3 space-y-1.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Possible Navigational Paths</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {action.possible_paths.map((path: any, idx: number) => (
                                                                <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-500 font-mono">
                                                                    {typeof path === 'object'
                                                                        ? (path.path_name || path.description || JSON.stringify(path))
                                                                        : String(path)}
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

            {/* Live Diagnostics Terminal */}
            <div className="rounded-[40px] border border-white/5 bg-[#080808] p-8 space-y-4 shadow-2xl relative overflow-hidden group/terminal backdrop-blur-3xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Terminal className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-white uppercase italic">Live Diagnostics Stream</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Zero-latency Ephemeral Console Buffer</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-[#040404] rounded-3xl p-6 font-mono text-xs text-emerald-400/90 space-y-1.5 h-44 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner">
                    {terminalLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1 duration-300">

                            <span className="leading-relaxed break-all font-medium">{line}</span>
                        </div>
                    ))}
                    {terminalLines.length === 0 && (
                        <p className="text-slate-600 font-medium italic animate-pulse">Waiting for diagnostic stream outputs...</p>
                    )}
                    <div ref={terminalEndRef} />
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
        
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }

        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
