'use client';

import { useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Zap,
    User,
} from 'lucide-react';

interface StepRef {
    personaName: string;
    stepNumber: number;
}

interface ActionItem {
    priority: string;
    title: string;
    detail: string;
    stepRefs?: StepRef[];
}

interface ActionItemsProps {
    items: ActionItem[];
}

function scrollToStep(personaName: string, stepNumber: number) {
    const key = `${personaName}-${stepNumber}`;
    const el = document.querySelector(`[data-step-key="${key}"]`) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Highlight pulse: set data-highlighted, remove after 2s
    el.setAttribute('data-highlighted', 'true');
    setTimeout(() => el.removeAttribute('data-highlighted'), 2000);
}

export function ActionItems({ items }: ActionItemsProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
                    const priority = item.priority.toLowerCase();
                    const isHigh = priority.includes('high');
                    const isMedium = priority.includes('medium');

                    const colorClass = isHigh ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-emerald-400';
                    const bgClass = isHigh ? 'bg-red-500/5 border-red-500/10' : isMedium ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10';
                    const accentClass = isHigh ? 'bg-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : isMedium ? 'bg-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]';
                    const chipBg = isHigh ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : isMedium ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';

                    const Icon = isHigh ? AlertCircle : isMedium ? Zap : CheckCircle2;
                    const hasRefs = item.stepRefs && item.stepRefs.length > 0;
                    const isHovered = hoveredIndex === i;

                    return (
                        <div
                            key={i}
                            className={`group relative rounded-3xl border ${bgClass} p-6 transition-all duration-300 hover:bg-white/[0.02] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/40 overflow-hidden`}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Color-coded accent line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all duration-300 ${accentClass}`} />

                            <div className="flex flex-col gap-4 pl-2">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`mt-1 flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${isHigh ? 'bg-red-500/10' : isMedium ? 'bg-amber-500/10' : 'bg-emerald-500/10'} border border-white/5`}>
                                            <Icon className={`h-4 w-4 ${colorClass}`} />
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                                                    {item.title}
                                                </h4>
                                                <div className={`flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 bg-black/40 ${colorClass}`}>
                                                    {item.priority}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
                                                {item.detail}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step reference chips — visible on hover */}
                                {hasRefs && (
                                    <div className={`flex flex-wrap items-center gap-2 pl-13 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
                                            <User className="h-2.5 w-2.5" />
                                            Evidenced by
                                        </span>
                                        {item.stepRefs!.map((ref, j) => (
                                            <button
                                                key={j}
                                                onClick={() => scrollToStep(ref.personaName, ref.stepNumber)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black transition-all cursor-pointer ${chipBg}`}
                                                title={`Jump to ${ref.personaName} · Step ${ref.stepNumber}`}
                                            >
                                                <span className="opacity-60">{ref.personaName}</span>
                                                <span className="h-3 w-px bg-current opacity-30" />
                                                <span>Step {ref.stepNumber}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* subtle glow gradient */}

                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
