'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    BarChart3, ShieldCheck, ArrowRight, Share2, Download,
    Check, Loader2, Globe, Calendar, Zap
} from 'lucide-react';

interface ReportCardProps {
    report: {
        id: string;
        projectName: string;
        url: string;
        completedAt: string;
        usabilityScore: number;
        frictionLevel: string;
        funnelRate: number;
        sessionCount: number;
    };
}

export function ReportCard({ report }: ReportCardProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const reportUrl = `${window.location.origin}/reports/${report.id}`;
            await navigator.clipboard.writeText(reportUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const scoreColor = report.usabilityScore >= 75 ? 'text-emerald-400' : report.usabilityScore >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = report.usabilityScore >= 75 ? 'bg-emerald-500/10' : report.usabilityScore >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';
    const scoreBorder = report.usabilityScore >= 75 ? 'border-emerald-500/20' : report.usabilityScore >= 50 ? 'border-amber-500/20' : 'border-red-500/20';

    // Determine how many persona bubbles to show (limit to 5)
    const displayCount = Math.min(report.sessionCount, 5);
    const remainingCount = report.sessionCount > 5 ? report.sessionCount - 5 : 0;

    return (
        <div className="group relative flex flex-col rounded-[32px] border border-white/5 bg-[#0d0d0d] p-0 transition-all hover:border-white/10 hover:bg-[#111111] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative p-8 space-y-8 flex-1 flex flex-col">
                {/* Top Section: Project Identity & Icon */}
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors leading-tight">
                            {report.projectName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Globe className="h-3 w-3 text-indigo-500/50" />
                                <span className="truncate max-w-[150px]">{report.url.replace(/^https?:\/\//, '')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Calendar className="h-3 w-3 text-emerald-500/50" />
                                <span>{report.completedAt}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-slate-500 group-hover:scale-110 group-hover:text-white group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-500">
                        <BarChart3 className="h-7 w-7" />
                    </div>
                </div>

                {/* Middle Section: key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-2xl border ${scoreBorder} ${scoreBg} p-5 space-y-2 relative overflow-hidden group/metric`}>
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/metric:opacity-20 transition-opacity">
                            <Zap className="h-10 w-10 text-white" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">UX Health Score</p>
                        <div className="flex items-end gap-1">
                            <span className={`text-4xl font-black ${scoreColor}`}>{report.usabilityScore}</span>
                            <span className="text-xs font-bold opacity-30 pb-1.5">/100</span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-2 group/metric">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Friction Level</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">{report.frictionLevel}</span>
                            <div className={`h-2 w-2 rounded-full ${report.frictionLevel === 'Low' ? 'bg-emerald-500' : report.frictionLevel === 'Medium' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Persona Icons & Actions */}
                <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {report.sessionCount > 0 ? (
                                Array.from({ length: displayCount }).map((_, i) => (
                                    <div key={i} className="h-8 w-8 rounded-full border-2 border-[#0d0d0d] bg-gradient-to-br from-slate-800 to-slate-900 border-white/5 flex items-center justify-center shadow-lg transition-transform hover:-translate-y-1 hover:z-10 group/p">
                                        <span className="text-[9px] font-black text-slate-500 group-hover/p:text-white transition-colors">P{i + 1}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="h-8 w-8 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-[9px] font-black text-slate-700">0</span>
                                </div>
                            )}
                            {remainingCount > 0 && (
                                <div className="h-8 w-8 rounded-full border-2 border-[#0d0d0d] bg-white/5 flex items-center justify-center shadow-lg z-20">
                                    <span className="text-[9px] font-black text-slate-400">+{remainingCount}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                            {report.sessionCount} Participant{report.sessionCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className={`p-3 rounded-xl border transition-all active:scale-95 ${copied
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-white/[0.03] border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                                }`}
                            title="Share Report Link"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                        </button>
                        <Link
                            href={`/reports/${report.id}`}
                            className="flex items-center gap-3 h-11 px-6 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                        >
                            Details
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
