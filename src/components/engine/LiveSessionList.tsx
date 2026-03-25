'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Play, CheckCircle2, Clock, XCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { SessionLogAccordion } from './SessionLogAccordion';

interface LiveSessionListProps {
    initialSessions: any[];
    testRunId: string;
}

export function LiveSessionList({ initialSessions, testRunId }: LiveSessionListProps) {
    const [sessions, setSessions] = useState(initialSessions);
    const [isMounted, setIsMounted] = useState(false);
    const supabase = createClient();

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => { setSessions(initialSessions); }, [initialSessions]);

    useEffect(() => {
        const channel = supabase
            .channel(`test_run_sessions_${testRunId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public',
                table: 'persona_sessions',
                filter: `test_run_id=eq.${testRunId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setSessions(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                    setSessions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
                } else if (payload.eventType === 'DELETE') {
                    setSessions(prev => prev.filter(s => s.id !== payload.old.id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [testRunId, supabase]);

    const statusConfig: Record<string, { label: string; color: string; Icon: any }> = {
        queued:    { label: 'Queued',    color: '#64748b', Icon: Clock },
        running:   { label: 'Running',   color: '#3b82f6', Icon: Activity },
        completed: { label: 'Completed', color: '#10b981', Icon: CheckCircle2 },
        abandoned: { label: 'Abandoned', color: '#f59e0b', Icon: XCircle },
        error:     { label: 'Error',     color: '#ef4444', Icon: XCircle },
    };

    return (
        <div className="grid gap-4">
            {sessions.map((session) => {
                const status = session.status || 'queued';
                const cfg    = statusConfig[status] || statusConfig.queued;
                const StatusIcon = cfg.Icon;

                return (
                    <div
                        key={session.id}
                        className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 transition-all hover:border-slate-600/60 hover:bg-slate-800/70"
                    >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div
                                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
                                    style={{ background: cfg.color + '15', borderColor: cfg.color + '35' }}
                                >
                                    <User className="h-5 w-5" style={{ color: cfg.color }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {session.persona_configs?.name || 'Unnamed Persona'}
                                    </p>
                                    {session.persona_configs?.goal_prompt && (
                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[420px]">
                                            Goal: {session.persona_configs.goal_prompt}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
                                    style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '12' }}
                                >
                                    <StatusIcon className={`h-3.5 w-3.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
                                    {cfg.label}
                                </div>
                                <Link
                                    href={`/sessions/${session.id}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 border border-slate-600/40 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                                >
                                    <Play className="h-3 w-3" />
                                    View Session
                                </Link>
                            </div>
                        </div>

                        {/* Timing + exit reason */}
                        {(session.started_at || session.exit_reason) && (
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-slate-700/50">
                                {session.started_at && (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        Started {isMounted ? new Date(session.started_at).toLocaleTimeString() : '...'}
                                    </span>
                                )}
                                {session.completed_at && (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                        Finished {isMounted ? new Date(session.completed_at).toLocaleTimeString() : '...'}
                                    </span>
                                )}
                                {session.exit_reason && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                                        status === 'completed'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {session.exit_reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </span>
                                )}
                                {session.execution_mode === 'manual' && status === 'running' && (
                                    <span className="text-xs text-amber-400 font-semibold">
                                        ⚠ Waiting for manual approval
                                    </span>
                                )}
                            </div>
                        )}

                        <SessionLogAccordion sessionId={session.id} />
                    </div>
                );
            })}
        </div>
    );
}
