'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Play, CheckCircle2, Clock } from 'lucide-react';
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

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setSessions(initialSessions);
    }, [initialSessions]);

    useEffect(() => {
        // Subscribe to changes in persona_sessions for this test run
        const channel = supabase
            .channel(`test_run_sessions_${testRunId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'persona_sessions',
                    filter: `test_run_id=eq.${testRunId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // For inserts, we might need persona_configs which is joined
                        // Usually inserts happen via server action, so we can wait or refetch
                        // But for speed, let's just add it if it's there
                        setSessions((prev) => [...prev, payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setSessions((prev) =>
                            prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [testRunId, supabase]);

    const statusColors: any = {
        queued: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
        running: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        abandoned: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        error: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    return (
        <div className="grid gap-4">
            {sessions.map((session) => (
                <div
                    key={session.id}
                    className="group flex flex-col rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 transition-all hover:border-white/10 hover:bg-[#121212]"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-start gap-4 flex-1">
                            <div className="flex items-center gap-6 w-full">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-white">{session.persona_configs?.name || 'Persona'}</p>
                                    <p className="text-xs text-slate-500 max-w-[400px] truncate leading-tight">
                                        Goal: {session.persona_configs?.goal_prompt}
                                    </p>
                                </div>
                            </div>

                            {(session.started_at || session.exit_reason) && (
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-medium sm:ml-18">
                                    {session.started_at && (
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            <span>Started: {isMounted ? new Date(session.started_at).toLocaleTimeString() : '...'}</span>
                                        </div>
                                    )}
                                    {session.completed_at && (
                                        <div className="flex items-center gap-1.5 text-slate-400 border-l border-white/5 pl-6">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            <span>Finished: {isMounted ? new Date(session.completed_at).toLocaleTimeString() : '...'}</span>
                                        </div>
                                    )}
                                    {session.exit_reason && (
                                        <div className={`flex items-center gap-1.5 font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/5 ${session.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'
                                            }`}>
                                            {session.exit_reason}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-end space-y-2">
                                <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${statusColors[session.status as keyof typeof statusColors] || statusColors.queued}`}>
                                    {session.status}
                                </span>
                                {session.execution_mode === 'manual' && session.status === 'running' && (
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

                    <SessionLogAccordion sessionId={session.id} />
                </div>
            ))}
        </div>
    );
}
