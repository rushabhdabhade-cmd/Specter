import React from 'react';
import { ShieldAlert, Zap, Link2Off, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TechnicalAuditProps {
    data: {
        brokenLinks: { url: string; error?: string }[];
        slowPages: { url: string; latency: number }[];
        frictionPoints: { url: string; issue: string }[];
    } | null;
}

export const TechnicalAudit: React.FC<TechnicalAuditProps> = ({ data }) => {
    if (!data) return null;

    const totalIssues = (data.brokenLinks?.length || 0) + (data.slowPages?.length || 0) + (data.frictionPoints?.length || 0);
    const healthScore = Math.max(0, 100 - (totalIssues * 5));
    const scoreColor = healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-white">Technical Issues Found</h2>
                    <p className="text-xs text-slate-400">Real problems caught during the test — broken links, slow pages, and errors that blocked users.</p>
                </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Usability Score</p>
                    <div className="flex items-end justify-center gap-0.5">
                        <span className="text-3xl font-black tracking-tight leading-none" style={{ color: scoreColor }}>{healthScore}</span>
                        <span className="text-slate-500 font-bold text-sm mb-0.5">/100</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Slow Pages</p>
                    <div className="flex items-end justify-center gap-1">
                        <span className="text-3xl font-black tracking-tight leading-none text-amber-400">{data.slowPages?.length || 0}</span>
                        <Zap className="h-3.5 w-3.5 text-amber-500 mb-0.5" />
                    </div>
                </div>

                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Broken Links</p>
                    <div className="flex items-end justify-center gap-1">
                        <span className="text-3xl font-black tracking-tight leading-none text-red-400">{data.brokenLinks?.length || 0}</span>
                        <Link2Off className="h-3.5 w-3.5 text-red-500 mb-0.5" />
                    </div>
                </div>
            </div>

            {/* Slow pages detail */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Performance Bottlenecks</span>
                </div>

                <div className="space-y-2">
                    {data.slowPages?.length > 0 ? data.slowPages.map((p, i) => {
                        if (!p) return null;
                        const isVerySlow = p.latency > 5000;
                        return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-semibold text-white">
                                            {isVerySlow ? 'Very slow page' : 'Slow page'}
                                        </p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isVerySlow ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                            {(p.latency / 1000).toFixed(1)}s to load
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.url}</p>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <p className="text-xs text-emerald-300">All pages loaded within acceptable time</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Broken links detail — only show if any */}
            {(data.brokenLinks?.length || 0) > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Link2Off className="h-3.5 w-3.5 text-red-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Broken Links</span>
                    </div>
                    <div className="space-y-2">
                        {data.brokenLinks.map((l, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                                <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white">{l.error || 'Page not found (404)'}</p>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{l.url}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
