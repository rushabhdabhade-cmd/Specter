import React from 'react';
import { ShieldAlert, Zap, Link2Off, MousePointerClick, AlertCircle, CheckCircle2 } from 'lucide-react';

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Technical Conversion Audit</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Deterministic friction points detected by the parallel heuristic engine.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Health Score Card */}
                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
                    <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Usability Score</p>
                    <div className="relative flex items-end justify-center gap-1">
                        <span className="text-5xl font-black tracking-tighter leading-none text-emerald-400">{healthScore}</span>
                        <span className="text-slate-600 font-bold text-sm mb-1">/100</span>
                    </div>
                </div>

                {/* Performance Card */}
                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50" />
                    <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Slow Load Alerts</p>
                    <div className="relative flex items-end justify-center gap-1">
                        <span className="text-5xl font-black tracking-tighter leading-none text-white">{data.slowPages?.length || 0}</span>
                        <Zap className="h-4 w-4 text-indigo-400 mb-2 ml-1" />
                    </div>
                </div>

                {/* Broken Links Card */}
                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04]">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-50" />
                    <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Critical 404 Errors</p>
                    <div className="relative flex items-end justify-center gap-1">
                        <span className="text-5xl font-black tracking-tighter leading-none text-red-400">{data.brokenLinks?.length || 0}</span>
                        <Link2Off className="h-4 w-4 text-red-500 mb-2 ml-1" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Friction Points List */}
                <div className="rounded-[40px] border border-white/5 bg-[#0a0a0a] p-8 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <MousePointerClick className="h-4 w-4 text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Behavioral Friction Log</span>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.frictionPoints?.length > 0 ? data.frictionPoints.map((f, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-amber-500/20 transition-all">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">{f.issue}</p>
                                    <p className="text-[10px] font-mono text-slate-500 truncate max-w-[400px]">{f.url}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-40">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No behavioral friction detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Slow Pages List Overlay */}
                <div className="rounded-[40px] border border-white/5 bg-[#0a0a0a] p-8 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Performance Bottlenecks</span>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.slowPages?.length > 0 ? data.slowPages.map((p, i) => {
                            if (!p) return null;
                            return (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-500/[0.02] border border-indigo-500/10 group hover:border-indigo-500/30 transition-all">
                                    <AlertCircle className="h-4 w-4 text-indigo-500 mt-1 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-white">High Latency Detected</p>
                                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{p.latency}ms</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-[400px]">{p.url}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-40">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">All pages meeting speed benchmarks</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Broken Links List */}
                <div className="rounded-[40px] border border-white/5 bg-[#0a0a0a] p-8 shadow-2xl lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Link2Off className="h-4 w-4 text-red-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Network Resource Audit</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.brokenLinks?.length > 0 ? data.brokenLinks.map((item, i) => {
                            if (!item) return null;
                            return (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-red-500/[0.02] border border-red-500/10 group hover:border-red-500/30 transition-all">
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-red-400">{item.error || '404 - Not Found'}</p>
                                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-[400px]">{item.url}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-40 col-span-2">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">All network resources resolving</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
