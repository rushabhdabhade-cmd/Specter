'use client';

import { useState } from 'react';
import {
    MousePointerClick, Type, ArrowDown, Clock,
    Navigation, CheckCircle2, XCircle, Quote,
    TrendingDown, TrendingUp, Minus, ChevronRight, ChevronDown, Sparkles
} from 'lucide-react';

interface StepFeedbackCardProps {
    step: {
        step_number: number;
        emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight';
        inner_monologue: string;
        current_url: string;
        screenshot_url?: string;
        action_taken?: {
            type?: string;
            selector?: string;
            text?: string;
            ux_feedback?: string;
            proposed_solution?: string;
            specific_emotion?: string;
            possible_paths?: string[];
            emotional_intensity?: number;
        };
    };
}

const EMOTION_CONFIG: Record<string, any> = {
    delight: { label: 'Delight', hex: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    satisfaction: { label: 'Satisfaction', hex: '#34d399', bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
    curiosity: { label: 'Curiosity', hex: '#818cf8', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    surprise: { label: 'Surprise', hex: '#fbbf24', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    neutral: { label: 'Neutral', hex: '#64748b', bg: 'bg-slate-800/40', text: 'text-slate-400', border: 'border-slate-700' },
    confusion: { label: 'Confusion', hex: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    boredom: { label: 'Boredom', hex: '#94a3b8', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-600' },
    frustration: { label: 'Frustration', hex: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    disappointment: { label: 'Disappointment', hex: '#f87171', bg: 'bg-red-400/10', text: 'text-red-300', border: 'border-red-400/20' },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
    click: <MousePointerClick className="h-3 w-3" />,
    type: <Type className="h-3 w-3" />,
    scroll: <ArrowDown className="h-3 w-3" />,
    wait: <Clock className="h-3 w-3" />,
    navigate: <Navigation className="h-3 w-3" />,
    complete: <CheckCircle2 className="h-3 w-3" />,
    fail: <XCircle className="h-3 w-3" />,
};

function IntensityBadge({ intensity }: { intensity: number }) {
    const pct = Math.round(intensity * 100);
    const color = intensity > 0.7 ? 'text-white' : 'text-slate-500';
    return <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${color}`}>Intensity: {pct}%</span>;
}

export function StepFeedbackCard({ step }: StepFeedbackCardProps) {
    const [pathsOpen, setPathsOpen] = useState(false);
    const cfg = EMOTION_CONFIG[step.emotion_tag] ?? EMOTION_CONFIG.neutral;
    const actionType = step.action_taken?.type ?? 'system';
    let uxFeedback = step.action_taken?.ux_feedback as any;
    if (uxFeedback && typeof uxFeedback === 'object') {
        uxFeedback = uxFeedback.overall || uxFeedback.feedback || JSON.stringify(uxFeedback);
    }
    const hasFeedback = uxFeedback && uxFeedback !== 'undefined' && String(uxFeedback).length > 5;
    const intensity = step.action_taken?.emotional_intensity ?? 0.5;
    const paths = step.action_taken?.possible_paths ?? [];
    const hasScreenshot = !!step.screenshot_url;

    return (
        <div className={`group/card rounded-3xl border overflow-hidden transition-all duration-500 ${cfg.border} bg-[#060606] hover:border-white/10 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]`}>
            {/* Emotion accent top bar */}
            <div className="h-1 w-full" style={{ background: cfg.hex }} />

            <div className={`flex flex-col ${hasScreenshot ? 'lg:flex-row' : ''} gap-0`}>

                {/* ── Screenshot panel (left on lg, top on mobile) ───────────────── */}
                {hasScreenshot && (
                    <div className="lg:w-[480px] flex-shrink-0 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5 bg-[#000000] group-hover/card:bg-[#040404] transition-colors">
                        {/* Overlay Gradient for top legibility */}
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-[5]" />

                        {/* Step badge overlay */}
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                            <div
                                className="h-8 w-8 rounded-2xl flex items-center justify-center text-[11px] font-black text-white shadow-xl backdrop-blur-md border border-white/20"
                                style={{ background: cfg.hex + 'dd' }}
                            >
                                {step.step_number}
                            </div>
                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/5 shadow-lg ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                            </span>
                        </div>

                        {/* Action type badge */}
                        <div className="absolute top-4 right-4 z-10">
                            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/80 border border-white/10 text-[9px] font-black text-white backdrop-blur-md shadow-lg group-hover/card:border-white/20 transition-all">
                                {ACTION_ICONS[actionType]}
                                <span className="uppercase tracking-widest">{actionType}</span>
                            </span>
                        </div>

                        {/* Screenshot */}
                        <div className="relative h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={step.screenshot_url}
                                alt={`Step ${step.step_number}`}
                                className="w-full object-cover object-top max-h-[300px] lg:max-h-none lg:h-full filter brightness-[0.85] group-hover/card:brightness-100 transition-all duration-700"
                                loading="lazy"
                            />
                            {/* Inner Border / Shadow Overlay */}
                            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </div>

                        {/* Gradient footer on screenshot */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end px-4 pb-4 z-[5]">
                            <div className="flex items-center gap-1.5 opacity-60 group-hover/card:opacity-100 transition-opacity">
                                <Navigation className="h-3 w-3 text-slate-400" />
                                <p className="text-[10px] font-mono text-white/80 truncate max-w-[320px]">{step.current_url}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Feedback panel (right on lg, bottom on mobile) ─────────────── */}
                <div className="flex-1 p-8 space-y-6 bg-gradient-to-b from-white/[0.01] to-transparent">

                    {/* Header — step info without screenshot */}
                    {!hasScreenshot && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-8 w-8 rounded-2xl flex items-center justify-center text-[10px] font-black text-white border border-white/10 shadow-lg"
                                    style={{ background: cfg.hex }}
                                >
                                    {step.step_number}
                                </div>
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 ${cfg.bg} ${cfg.text}`}>
                                    {ACTION_ICONS[actionType]} {actionType}
                                </span>
                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                </span>
                                {step.action_taken?.specific_emotion && (
                                    <span className="px-2.5 py-1 rounded-xl text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 italic">
                                        &ldquo;{step.action_taken.specific_emotion}&rdquo;
                                    </span>
                                )}
                            </div>
                            <IntensityBadge intensity={intensity} />
                        </div>
                    )}

                    {/* Score delta (screenshot mode — stacked) */}
                    {hasScreenshot && (
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 shadow-sm ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                </span>
                                {step.action_taken?.specific_emotion && (
                                    <span className="px-2.5 py-1 rounded-xl text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 italic">
                                        &ldquo;{step.action_taken.specific_emotion}&rdquo;
                                    </span>
                                )}
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 bg-white/5 text-slate-300`}>
                                    {ACTION_ICONS[actionType]} {actionType}
                                </span>
                            </div>
                            <IntensityBadge intensity={intensity} />
                        </div>
                    )}

                    {/* Inner monologue */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Persona Reasoning</p>
                        <p className="text-[14px] text-slate-300 leading-relaxed font-semibold">
                            {step.inner_monologue}
                        </p>
                    </div>

                    {/* UX Feedback — the core insight */}
                    {hasFeedback && (
                        <div className={`group/feedback rounded-2xl border p-5 space-y-3 transition-all ${cfg.border} hover:border-white/10`} style={{ background: cfg.hex + '05' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-lg" style={{ background: cfg.hex + '20' }}>
                                    <Quote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.hex }} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: cfg.hex }}>
                                    UX/UI Feedback
                                </p>
                            </div>
                            <p className="text-[13px] text-slate-100 leading-relaxed italic pl-3 border-l-2 border-slate-800" style={{ borderColor: cfg.hex + '40' }}>
                                &ldquo;{uxFeedback}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Proposed Solution — MANDATORY action advice */}
                    {step.action_taken?.proposed_solution && (
                        <div className="relative group/sol rounded-2xl border border-indigo-500/10 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-transparent p-5 space-y-4 hover:border-indigo-500/30 transition-all overflow-hidden">
                            {/* Subtle background glow */}
                            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-3xl -z-10 group-hover/sol:bg-indigo-500/10 transition-all" />

                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">
                                    Strategic Fix / Solution
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-auto w-1 bg-gradient-to-b from-indigo-500 to-indigo-500/20 rounded-full" />
                                <p className="text-[14px] text-white font-bold leading-relaxed">
                                    {step.action_taken.proposed_solution}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Details footer */}
                    {(step.action_taken?.selector || step.action_taken?.text) && (
                        <div className="flex items-center gap-4 pt-4 border-t border-white/5 flex-wrap">
                            {/* Selector */}
                            {step.action_taken?.selector && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Target</span>
                                    <code className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-[10px] text-indigo-400 font-mono">
                                        <MousePointerClick className="h-2.5 w-2.5" />
                                        <span className="max-w-[140px] truncate">{step.action_taken.selector}</span>
                                    </code>
                                </div>
                            )}

                            {/* Typed text */}
                            {step.action_taken?.text && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Typed</span>
                                    <code className="px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-[10px] text-amber-300 font-mono">
                                        {step.action_taken.text}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation paths accordion */}
                    {paths.length > 0 && (
                        <div className="pt-2">
                            <button
                                onClick={() => setPathsOpen(!pathsOpen)}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {pathsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {paths.length} Navigation Paths Identified
                            </button>
                            {pathsOpen && (
                                <div className="mt-3 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {paths.map((p, i) => (
                                        <span key={i} className="px-2 py-1 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] font-mono text-slate-400 hover:border-white/10 transition-colors">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
