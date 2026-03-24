'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    BarChart3, ArrowRight, Share2,
    Check, Globe, Calendar, Trash2, AlertTriangle, Loader2
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
    onDelete?: (id: string) => void;
}

export function ReportCard({ report, onDelete }: ReportCardProps) {
    const [copied, setCopied] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' });
            if (res.ok) {
                onDelete?.(report.id);
            } else {
                console.error('Failed to delete report');
                setDeleting(false);
                setShowConfirm(false);
            }
        } catch (err) {
            console.error('Error deleting report:', err);
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    const scoreColor = report.usabilityScore >= 75 ? 'text-emerald-400' : report.usabilityScore >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = report.usabilityScore >= 75 ? 'bg-emerald-500/5' : report.usabilityScore >= 50 ? 'bg-amber-500/5' : 'bg-red-500/5';
    const scoreBorder = report.usabilityScore >= 75 ? 'border-emerald-500/20' : report.usabilityScore >= 50 ? 'border-amber-500/20' : 'border-red-500/20';

    // Determine how many persona bubbles to show (limit to 5)
    const displayCount = Math.min(report.sessionCount, 5);
    const remainingCount = report.sessionCount > 5 ? report.sessionCount - 5 : 0;

    return (
        <>
            <div className="group relative flex flex-col rounded-[48px] border border-white/20 bg-[#0a0a0a] p-10 transition-all duration-500 hover:border-white/10 hover:translate-y-[-4px] overflow-hidden">
                {/* Ambient Glow */}
                <div className={`absolute -right-20 -top-20 h-48 w-48 rounded-full blur-[100px] opacity-10 transition-opacity group-hover:opacity-20 ${report.usabilityScore >= 75 ? 'bg-emerald-500' : report.usabilityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`} />

                <div className="relative space-y-10 flex-1 flex flex-col z-10">
                    {/* Top Section */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors leading-tight">
                                {report.projectName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4">

                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                                    <span>{report.completedAt}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className={`rounded-3xl border ${scoreBorder} ${scoreBg} p-8 space-y-4 relative overflow-hidden`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">UX Health Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black tracking-tighter ${scoreColor}`}>{report.usabilityScore}</span>
                                <span className="text-[10px] font-black opacity-30 tracking-widest uppercase">Units</span>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Friction Level</p>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-white italic capitalize">{report.frictionLevel}</span>
                                <div className={`h-2.5 w-2.5 rounded-full ${report.frictionLevel === 'Low' ? 'bg-emerald-500' : report.frictionLevel === 'Medium' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="mt-auto pt-2border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex -space-x-4">

                                {remainingCount > 0 && (
                                    <div className="h-10 w-10 rounded-2xl border-2 border-[#0a0a0a] bg-white/5 flex items-center justify-center shadow-2xl z-20">
                                        <span className="text-[10px] font-black text-slate-500">+{remainingCount}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-white uppercase tracking-widest text-slate-800 italic">
                                {report.sessionCount} Synthetic Agents
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                                className="p-4 rounded-2xl border border-white/20 bg-white/5 text-slate-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleShare}
                                className={`p-4 rounded-2xl border transition-all active:scale-95 ${copied
                                    ? 'bg-emerald-500/10 border-emerald-300/20 text-emerald-400'
                                    : 'bg-white/5 border-white/20 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                            </button>
                            <Link
                                href={`/reports/${report.id}`}
                                className="flex items-center gap-4 h-14 px-8 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                            >
                                Review
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        className="relative z-10 w-full max-w-md rounded-[32px] border border-white/10 bg-[#0d0d0d] p-10 space-y-8 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-white tracking-tight">Delete Test Result</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    This will permanently delete <span className="text-white font-bold">{report.projectName}</span> and all associated sessions and logs. This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={deleting}
                                className="h-11 px-6 rounded-2xl border border-white/10 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 h-11 px-6 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all active:scale-95 disabled:opacity-50"
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
