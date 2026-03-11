import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BarChart3, Sparkles } from 'lucide-react';
import { ReportsList } from '@/components/reports/ReportsList';

export default async function ReportsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = createAdminClient();

    // Fetch reports directly and join test_run/project data for ownership
    const { data: reportsRaw } = await supabase
        .from('reports')
        .select(`
            id,
            score:product_opportunity_score,
            funnel_rate:funnel_completion_rate,
            created_at,
            test_run:test_runs!inner (
                id,
                status,
                completed_at,
                project:projects!inner (
                    name,
                    target_url,
                    user_id
                ),
                persona_sessions(count)
            )
        `)
        .eq('test_runs.projects.user_id', userId)
        .order('created_at', { ascending: false });

    const reports = (reportsRaw || []).map((r: any) => {
        // Handle potential array-wrapped joins from Supabase
        const testRun = Array.isArray(r.test_run) ? r.test_run[0] : r.test_run;
        const project = Array.isArray(testRun?.project) ? testRun.project[0] : testRun?.project;
        const sessions = Array.isArray(testRun?.persona_sessions) ? testRun.persona_sessions : [testRun?.persona_sessions];
        const sessionCount = sessions?.[0]?.count || 0;

        // Ensure score is a number and fallback to 0 safely
        const usabilityScore = Number(r.score || 0);

        return {
            id: testRun?.id || r.id,
            projectName: project?.name || 'Untitled Project',
            url: project?.target_url || 'Unknown URL',
            completedAt: testRun?.completed_at ? new Date(testRun.completed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : new Date(r.created_at).toLocaleDateString(),
            usabilityScore,
            frictionLevel: usabilityScore >= 75 ? 'Low' : usabilityScore >= 50 ? 'Medium' : 'High',
            funnelRate: r.funnel_rate || 0,
            sessionCount
        };
    });

    return (
        <div className="animate-in fade-in space-y-12 duration-1000 max-w-[1200px] mx-auto pb-20">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-white/5">
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Analytics Hub</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-white leading-tight">
                        Experience <span className="text-indigo-400">Reports</span>
                    </h1>
                    <p className="text-lg font-medium text-slate-400 leading-relaxed italic">
                        &ldquo;Deciphering the psychological friction points across your user journey using high-fidelity behavioral synthesis.&rdquo;
                    </p>
                </div>

                <div className="flex-shrink-0 bg-white/[0.02] border border-white/5 rounded-[32px] px-8 py-6 backdrop-blur-3xl group transition-all hover:bg-white/[0.04]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Sparkles className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{reports.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Total Synthesized</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports List Wrapper */}
            <ReportsList initialReports={reports} />
        </div>
    );
}
