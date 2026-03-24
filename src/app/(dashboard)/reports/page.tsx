import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BarChart3, Sparkles, Zap, Target, Activity, Cpu } from 'lucide-react';
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
            completedAt: testRun?.completed_at ? new Date(testRun.completed_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString(),
            usabilityScore,
            frictionLevel: usabilityScore >= 75 ? 'Low' : usabilityScore >= 50 ? 'Medium' : 'High',
            funnelRate: r.funnel_rate || 0,
            sessionCount
        };
    });

    return (
        <div className="animate-in fade-in space-y-20 duration-1000">
            {/* ── INTELLIGENCE HEADER ────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight">
                        Intelligence <br /> <span className="italic opacity-50">Briefing.</span>
                    </h1>
                    <p className="max-w-md text-sm font-medium text-slate-400 italic leading-relaxed">
                        Deciphering the psychological friction points and behavioral conversion rates synthesized across your infrastructure.
                    </p>
                </div>

                <div className="flex-shrink-0 bg-[#0a0a0a] border border-white/20 rounded-[32px] px-10 py-8 backdrop-blur-3xl group transition-all hover:border-white/10">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Cpu className="h-7 w-7 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-black tracking-tighter text-white">{reports.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Total Datasets</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── REPORTS GRID ────────────────────────────────────────────────── */}
            <ReportsList initialReports={reports} />
        </div>
    );
}
