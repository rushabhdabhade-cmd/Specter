import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  ChevronLeft,
  Download,
  Share2,
  Smile,
  Meh,
  Frown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  Brain,
  FileText
} from 'lucide-react';

export default async function ReportPage({ params }: { params: Promise<{ testRunId: string }> }) {
  const { testRunId } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await createClient();

  // Fetch test run with project details and the synthesized report
  const { data: run, error: runError } = await supabase
    .from('test_runs')
    .select(`
      *,
      projects (
        name,
        target_url
      ),
      reports (*)
    `)
    .eq('id', testRunId)
    .single();

  if (runError || !run) redirect('/reports');

  const report = run.reports?.[0];

  // Fetch all session logs for this run to build the breakdown
  const { data: sessions } = await supabase
    .from('persona_sessions')
    .select(`
      *,
      persona_configs (
        name,
        goal_prompt
      ),
      session_logs (
        emotion_tag,
        emotion_score
      )
    `)
    .eq('test_run_id', testRunId);

  // Group emotions for a summary chart placeholder
  const emotionStats = {
    delight: 0,
    neutral: 0,
    confusion: 0,
    frustration: 0
  };

  sessions?.forEach(s => {
    s.session_logs?.forEach((l: any) => {
      if (l.emotion_tag in emotionStats) {
        emotionStats[l.emotion_tag as keyof typeof emotionStats]++;
      }
    });
  });

  const totalLogs = Object.values(emotionStats).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-in fade-in space-y-10 duration-700 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col space-y-6 md:flex-row md:items-end md:justify-between md:space-y-0">
        <div className="space-y-4">
          <Link
            href="/reports"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to Reports
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              {run.projects?.name}
            </h1>
            <p className="font-medium text-slate-500">
              Session analysis for <span className="text-indigo-400 select-all">{run.projects?.target_url}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-11 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-6 text-xs font-bold text-white hover:bg-white/10 transition-all">
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button className="flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'UX Score', value: report?.product_opportunity_score || '0', unit: '/100', icon: TrendingUp, color: 'text-indigo-400' },
          { label: 'Friction', value: (report?.product_opportunity_score || 0) > 80 ? 'Low' : 'Medium', icon: Activity, color: 'text-emerald-400' },
          { label: 'Sessions', value: sessions?.length || '0', icon: CheckCircle2, color: 'text-blue-400' },
          { label: 'Total Steps', value: totalLogs, icon: Zap, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="rounded-3xl border border-white/5 bg-[#0d0d0d] p-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-white">{stat.value}</span>
              {stat.unit && <span className="text-sm font-bold text-slate-600 pb-1.5">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      {report?.executive_summary && (
        <div className="rounded-[40px] border border-white/5 bg-[#0d0d0d] p-10 space-y-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Brain className="h-32 w-32 text-indigo-500" />
          </div>
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Executive Summary</h2>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed font-medium max-w-[800px]">
              {report.executive_summary}
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sentiment Analysis */}
        <div className="lg:col-span-2 rounded-[40px] border border-white/5 bg-[#0d0d0d] p-10 space-y-10 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Sentiment Overview</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Emotional distribution across all synthetic journeys.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Delight', count: emotionStats.delight, icon: Smile, color: 'emerald' },
              { label: 'Neutral', count: emotionStats.neutral, icon: Meh, color: 'slate' },
              { label: 'Confusion', count: emotionStats.confusion, icon: Activity, color: 'blue' },
              { label: 'Frustration', count: emotionStats.frustration, icon: Frown, color: 'red' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 flex flex-col items-center text-center space-y-4 group hover:bg-white/5 transition-all">
                <s.icon className={`h-8 w-8 text-${s.color}-500 opacity-80 group-hover:scale-110 transition-transform`} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{s.count}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 pt-6 border-t border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Key Friction Points
            </h3>
            <div className="space-y-4">
              {[
                "Checkout confirmation was delayed by 1.2s",
                "Persona 'Non-Tech User' struggled with the filter sidebar",
                "Authentication redirection loop detected on page 3"
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="mt-1 h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <p className="text-sm font-medium text-slate-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Persona Breakdown */}
        <div className="rounded-[40px] border border-white/5 bg-[#0d0d0d] p-8 space-y-8 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Cohort Performance</h2>
            <p className="text-xs text-slate-500 font-medium">Individual persona success rates.</p>
          </div>

          <div className="space-y-4">
            {sessions?.map((session) => (
              <div key={session.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 group hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {session.persona_configs?.name}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Success
                  </span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 line-clamp-1 italic">
                  Goal: {session.persona_configs?.goal_prompt}
                </p>
              </div>
            ))}
          </div>

          <button className="w-full py-4 rounded-2xl border border-white/5 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all">
            View Full Logs
          </button>
        </div>
      </div>
    </div>
  );
}
