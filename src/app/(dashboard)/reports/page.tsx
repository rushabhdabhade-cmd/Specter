import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, FileText, ArrowRight, ShieldCheck, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default async function ReportsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    // Fetch all completed test runs for the user with their reports
    const { data: reportsRaw } = await supabase
        .from('test_runs')
        .select(`
      id,
      status,
      created_at,
      completed_at,
      projects!inner (
        name,
        target_url,
        user_id
      ),
      reports (
        product_opportunity_score,
        funnel_completion_rate
      )
    `)
        .eq('projects.user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

    const reports = (reportsRaw || []).map((r: any) => {
        const reportData = r.reports?.[0];
        return {
            id: r.id,
            projectName: r.projects?.name || 'Untitled',
            url: r.projects?.target_url || 'Unknown',
            completedAt: r.completed_at ? new Date(r.completed_at).toLocaleDateString() : 'N/A',
            usabilityScore: reportData?.product_opportunity_score || 0,
            frictionLevel: (reportData?.product_opportunity_score || 0) > 80 ? 'Low' : 'Medium',
            funnelRate: reportData?.funnel_completion_rate || 0,
        };
    });

    return (
        <div className="animate-in fade-in space-y-10 duration-700">
            {/* Header */}
            <div className="flex flex-col space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-white">Experience Reports</h1>
                <p className="font-medium text-slate-500">
                    In-depth behavioral analysis and usability scores synthesized from synthetic user sessions.
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {reports.length > 0 ? (
                    reports.map((report) => (
                        <div
                            key={report.id}
                            className="group flex flex-col rounded-[32px] border border-white/5 bg-[#0d0d0d] p-8 transition-all hover:border-white/10 hover:bg-[#111111] hover:shadow-2xl shadow-indigo-500/5 overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {report.projectName}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                            Verified {report.completedAt}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-500 group-hover:text-white transition-all">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Specter Score</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-white">{report.usabilityScore}</span>
                                        <span className="text-xs font-bold text-emerald-500 pb-1.5">/100</span>
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Friction</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-white">{report.frictionLevel}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-6 w-6 rounded-full border-2 border-[#0d0d0d] bg-white/5 text-[8px] flex items-center justify-center font-bold text-slate-500">
                                            P{i}
                                        </div>
                                    ))}
                                    <div className="h-6 w-6 rounded-full border-2 border-[#0d0d0d] bg-white/5 text-[8px] flex items-center justify-center font-bold text-slate-500">
                                        +5
                                    </div>
                                </div>

                                <Link
                                    href={`/reports/${report.id}`}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:text-indigo-400 transition-colors"
                                >
                                    View Full Report
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[40px] border border-dashed border-white/5 bg-white/[0.01] py-32 text-center">
                        <div className="relative mb-8">
                            <FileText className="h-16 w-16 text-slate-800" />
                            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">No reports available</h3>
                        <p className="max-w-[360px] text-sm text-slate-500 leading-relaxed mb-10">
                            Reports are automatically generated once a test run cohort completes its assigned sessions.
                        </p>
                        <div className="flex items-center gap-4">
                            <Link href="/test-runs" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                                Check Active Runs
                            </Link>
                            <div className="h-4 w-px bg-white/10" />
                            <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-white">
                                Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
