'use client';

import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Zap
} from 'lucide-react';

interface ActionItem {
    priority: string;
    title: string;
    detail: string;
}

interface ActionItemsProps {
    items: ActionItem[];
}

export function ActionItems({ items }: ActionItemsProps) {
    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Prioritized UX Fixes</h2>
                    <p className="text-sm text-slate-500 font-medium">Automated extraction of the most impactful improvements based on persona friction.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {items.map((item, i) => {
                    const priorityColor =
                        item.priority.toLowerCase().includes('high') ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                            item.priority.toLowerCase().includes('medium') ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                                'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';

                    return (
                        <div
                            key={i}
                            className="group relative rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 transition-all hover:bg-white/[0.03] hover:border-white/10"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-5">
                                    <div className={`mt-1 flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${priorityColor}`}>
                                        {item.priority}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {item.title}
                                        </h4>
                                        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                        Analyze Friction <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Accent line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-indigo-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
