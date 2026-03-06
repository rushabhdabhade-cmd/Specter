'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, ChevronUp, Terminal, History, MessageSquare, Activity, ShieldAlert, Zap } from 'lucide-react';

interface SessionLogAccordionProps {
    sessionId: string;
}

export function SessionLogAccordion({ sessionId }: SessionLogAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && logs.length === 0) {
            fetchLogs();
        }
    }, [isOpen]);

    async function fetchLogs() {
        setLoading(true);
        const { data } = await supabase
            .from('session_logs')
            .select('*')
            .eq('session_id', sessionId)
            .order('step_number', { ascending: true });

        setLogs(data || []);
        setLoading(false);
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'system': return <Terminal className="h-3 w-3 text-indigo-400" />;
            case 'error': return <ShieldAlert className="h-3 w-3 text-red-500" />;
            default: return <Zap className="h-3 w-3 text-slate-400" />;
        }
    };

    return (
        <div className="w-full mt-4 border-t border-white/5 pt-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group"
            >
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isOpen ? 'Hide' : 'Show'} Detailed Logs
                <div className="h-px flex-1 bg-white/5 group-hover:bg-white/10 transition-all ml-2" />
            </button>

            {isOpen && (
                <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    {loading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <Activity className="h-3 w-3 text-indigo-500 animate-spin" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Retrieving telemetry...</span>
                        </div>
                    ) : logs.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.map((log) => (
                                <div key={log.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getIcon((log.action_taken as any)?.type || 'action')}
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">
                                                Step {log.step_number} • {(log.action_taken as any)?.type || 'ACTION'}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-slate-700 font-mono">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                        {log.inner_monologue}
                                    </p>
                                    {(log.action_taken as any)?.selector && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 border border-white/5 w-fit">
                                            <span className="text-[8px] font-bold text-indigo-500 uppercase">Target</span>
                                            <span className="text-[8px] text-slate-500 font-mono">{(log.action_taken as any).selector}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-700 text-center py-4 uppercase font-bold tracking-widest leading-none">
                            No logs found for this session
                        </p>
                    )}
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
