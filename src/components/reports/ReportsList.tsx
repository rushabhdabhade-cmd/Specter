'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, FileText, AlertTriangle } from 'lucide-react';
import { ReportCard } from './ReportCard';
import Link from 'next/link';

interface Report {
    id: string;
    projectName: string;
    url: string;
    completedAt: string;
    usabilityScore: number;
    frictionLevel: string;
    funnelRate: number;
    sessionCount: number;
}

interface ReportsListProps {
    initialReports: Report[];
}

export function ReportsList({ initialReports }: ReportsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'high' | 'low'>('all');

    const filteredReports = useMemo(() => {
        return initialReports.filter(report => {
            const matchesSearch = report.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                report.url.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                filterMode === 'all' ||
                (filterMode === 'high' && report.usabilityScore >= 70) ||
                (filterMode === 'low' && report.usabilityScore < 50);

            return matchesSearch && matchesFilter;
        });
    }, [initialReports, searchQuery, filterMode]);

    return (
        <div className="space-y-8">
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search projects or URLs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 bg-[#0d0d0d] border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#0d0d0d] border border-white/5 rounded-2xl p-1">
                        <button
                            onClick={() => setFilterMode('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterMode('high')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            High Score
                        </button>
                        <button
                            onClick={() => setFilterMode('low')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'low' ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Needs Work
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                        <ReportCard key={report.id} report={report} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[48px] border border-dashed border-white/5 bg-white/[0.01] py-32 text-center transition-all animate-in fade-in zoom-in-95 duration-700">
                        <div className="relative mb-10">
                            <div className="h-24 w-24 rounded-[32px] bg-gradient-to-br from-slate-900 to-black border border-white/5 flex items-center justify-center shadow-2xl">
                                <FileText className="h-10 w-10 text-slate-800" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-4 tracking-tight">No matching reports</h3>
                        <p className="max-w-[420px] text-base text-slate-500 font-medium leading-relaxed mb-12">
                            We couldn't find any experience reports matching your current search or filter criteria.
                        </p>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => { setSearchQuery(''); setFilterMode('all'); }}
                                className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 transition-colors"
                                id="reset-filters"
                            >
                                Clear All Filters
                            </button>
                            <div className="h-4 w-px bg-white/10" />
                            <Link href="/dashboard" className="text-xs font-black uppercase tracking-[0.2em] text-white hover:opacity-80 transition-opacity">
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
