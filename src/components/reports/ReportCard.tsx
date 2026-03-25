'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Share2, Check, Calendar, Trash2, AlertTriangle, Loader2, Users } from 'lucide-react';

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
    onDelete?: (id: string) => void;
}

export function ReportCard({ report, onDelete }: ReportCardProps) {
    const [copied, setCopied] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/reports/${report.id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' });
            if (res.ok) onDelete?.(report.id);
            else { setDeleting(false); setShowConfirm(false); }
        } catch { setDeleting(false); setShowConfirm(false); }
    };

    const scoreColor = report.usabilityScore >= 75 ? '#10b981' : report.usabilityScore >= 50 ? '#f59e0b' : '#ef4444';
    const frictionColor = report.frictionLevel === 'Low' ? '#10b981' : report.frictionLevel === 'Medium' ? '#f59e0b' : '#ef4444';

    return (
        <>
            <div className="group relative flex flex-col rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all duration-300 hover:border-slate-600/60 hover:bg-slate-800/80 overflow-hidden">

                {/* Top */}
                <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1 pr-3">
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {report.projectName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Calendar className="h-3 w-3 text-slate-500 flex-shrink-0" />
                            <span className="text-xs text-slate-400">{report.completedAt}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                        <Users className="h-3.5 w-3.5" />
                        {report.sessionCount} persona{report.sessionCount !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div
                        className="rounded-xl p-4 border"
                        style={{ borderColor: scoreColor + '30', background: scoreColor + '0d' }}
                    >
                        <p className="text-xs font-semibold text-slate-400 mb-2">UX Health Score</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black" style={{ color: scoreColor }}>
                                {report.usabilityScore}
                            </span>
                            <span className="text-xs text-slate-500">/100</span>
                        </div>
                    </div>

                    <div
                        className="rounded-xl p-4 border"
                        style={{ borderColor: frictionColor + '30', background: frictionColor + '0d' }}
                    >
                        <p className="text-xs font-semibold text-slate-400 mb-2">Friction Level</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold" style={{ color: frictionColor }}>
                                {report.frictionLevel}
                            </span>
                            <span
                                className="h-2 w-2 rounded-full animate-pulse"
                                style={{ background: frictionColor }}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                            className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleShare}
                            className={`p-2 rounded-lg border transition-all ${copied
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'border-slate-700/50 text-slate-500 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                        </button>
                    </div>

                    <Link
                        href={`/reports/${report.id}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95"
                    >
                        View Report
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Delete confirm dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800 p-8 space-y-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Delete report?</h3>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                    This will permanently delete the report for <span className="text-white font-semibold">{report.projectName}</span> and all its data. This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:text-white transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
