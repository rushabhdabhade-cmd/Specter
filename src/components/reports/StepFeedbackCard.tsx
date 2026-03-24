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
        <div className={`rounded-2xl border overflow-hidden transition-all ${cfg.border} bg-[#080808]`}>
            {/* Emotion accent top bar */}
            <div className="h-0.5 w-full" style={{ background: cfg.hex }} />

            <div className={`flex flex-col ${hasScreenshot ? 'lg:flex-row' : ''} gap-0`}>

                {/* ── Screenshot panel (left on lg, top on mobile) ───────────────── */}
                {hasScreenshot && (
                    <div className="lg:w-[420px] flex-shrink-0 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5 bg-black">
                        {/* Step badge overlay */}
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                            <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg"
                                style={{ background: cfg.hex }}
                            >
                                {step.step_number}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                            </span>
                        </div>

                        {/* Action type badge */}
                        <div className="absolute top-3 right-3 z-10">
                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 border border-white/10 text-[9px] font-black text-white backdrop-blur-sm">
                                {ACTION_ICONS[actionType]}
                                {actionType}
                            </span>
                        </div>

                        {/* Screenshot */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={step.screenshot_url}
                            alt={`Step ${step.step_number}`}
                            className="w-full object-cover object-top max-h-[300px] lg:max-h-none lg:h-full"
                            loading="lazy"
                        />

                        {/* Gradient footer on screenshot */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end px-3 pb-3">
                            <p className="text-[9px] font-mono text-white/40 truncate">{step.current_url}</p>
                        </div>
                    </div>
                )}

                {/* ── Feedback panel (right on lg, bottom on mobile) ─────────────── */}
                <div className="flex-1 p-6 space-y-5">

                    {/* Header — step info without screenshot */}
                    {!hasScreenshot && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                                    style={{ background: cfg.hex }}
                                >
                                    {step.step_number}
                                </div>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
                                    {ACTION_ICONS[actionType]} {actionType}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                </span>
                                {step.action_taken?.specific_emotion && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 bg-white/5 border border-white/10 italic">
                                        &ldquo;{step.action_taken.specific_emotion}&rdquo;
                                    </span>
                                )}
                            </div>
                            <IntensityBadge intensity={intensity} />
                        </div>
                    )}

                    {/* Score delta (screenshot mode — stacked) */}
                    {hasScreenshot && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                </span>
                                {step.action_taken?.specific_emotion && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 bg-white/5 border border-white/10 italic">
                                        &ldquo;{step.action_taken.specific_emotion}&rdquo;
                                    </span>
                                )}
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
                                    {ACTION_ICONS[actionType]} {actionType}
                                </span>
                            </div>
                            <IntensityBadge intensity={intensity} />
                        </div>
                    )}

                    {/* Inner monologue */}
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Persona Reasoning</p>
                        <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
                            {step.inner_monologue}
                        </p>
                    </div>

                    {/* UX Feedback — the core insight */}
                    {hasFeedback && (
                        <div className={`rounded-xl border p-4 space-y-2 ${cfg.border}`} style={{ background: cfg.hex + '0a' }}>
                            <div className="flex items-center gap-2">
                                <Quote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.hex }} />
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.hex }}>
                                    UX/UI Feedback
                                </p>
                            </div>
                            <p className="text-[13px] text-slate-200 leading-relaxed italic pl-5">
                                {uxFeedback}
                            </p>
                        </div>
                    )}

                    {/* Proposed Solution — MANDATORY action advice */}
                    {step.action_taken?.proposed_solution && (
                        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                    Strategic Fix / Solution
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-auto w-1 bg-indigo-500/30 rounded-full" />
                                <p className="text-[14px] text-white font-medium leading-relaxed">
                                    {step.action_taken.proposed_solution}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Selector */}
                    {step.action_taken?.selector && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Target</span>
                            <code className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 border border-white/5 text-[10px] text-indigo-400 font-mono">
                                <MousePointerClick className="h-2.5 w-2.5" />
                                {step.action_taken.selector}
                            </code>
                        </div>
                    )}

                    {/* Typed text */}
                    {step.action_taken?.text && (
                        <div className="flex items-start gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-1">Typed</span>
                            <code className="px-2 py-1 rounded-lg bg-black/60 border border-white/5 text-[10px] text-amber-300 font-mono">
                                {step.action_taken.text}
                            </code>
                        </div>
                    )}

                    {/* Navigation paths accordion */}
                    {paths.length > 0 && (
                        <div>
                            <button
                                onClick={() => setPathsOpen(!pathsOpen)}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                            >
                                {pathsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {paths.length} Navigation Paths Identified
                            </button>
                            {pathsOpen && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {paths.map((p, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-[9px] font-mono text-slate-500 truncate max-w-[200px]">
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
