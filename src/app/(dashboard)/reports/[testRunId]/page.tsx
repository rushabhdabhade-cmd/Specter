import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { calculateSessionScore } from '@/lib/utils/scoring';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, AlertTriangle, Brain, CheckCircle2, ChevronLeft, Download,
  FileText, Frown, Layers, Map, Meh, Share2, Smile, Sparkles, Target,
  TrendingUp, Users, Zap
} from 'lucide-react';
import { RefreshButton } from '@/components/reports/RefreshButton';
import { SentimentTimeline } from '@/components/reports/SentimentTimeline';
import { StepFeedbackCard } from '@/components/reports/StepFeedbackCard';
import { FeedbackSummary } from '@/components/reports/FeedbackSummary';
import { WebsiteHeatmap } from '@/components/reports/WebsiteHeatmap';

export default async function ReportPage({ params }: { params: Promise<{ testRunId: string }> }) {
  const { testRunId } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await createClient();

  const { data: run, error: runError } = await supabase
    .from('test_runs')
    .select(`*, projects(name, target_url), reports(*)`)
    .eq('id', testRunId)
    .single();

  if (runError || !run) redirect('/reports');

  const report = run.reports?.[0];

  // Expanded query — get full logs with screenshots and DOM data
  const { data: sessions } = await supabase
    .from('persona_sessions')
    .select(`
      *,
      persona_configs(name, goal_prompt),
      session_logs(
        id, step_number, emotion_tag, emotion_score,
        inner_monologue, current_url, screenshot_url, action_taken, created_at
      )
    `)
    .eq('test_run_id', testRunId);

  const totalLogs = sessions?.reduce((acc: number, s: any) => acc + (s.session_logs?.length || 0), 0) || 0;

  // ── Persistent Data Recovery ────────────────────────────────────────────────
  const reportData = (report as any)?.report_data || {};

  // Use stored emotion stats or fallback to calculation
  const emotionStats = reportData.emotionStats || { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
  if (!reportData.emotionStats) {
    sessions?.forEach(s => {
      s.session_logs?.forEach((l: any) => {
        if (l.emotion_tag in emotionStats) {
          emotionStats[l.emotion_tag as keyof typeof emotionStats]++;
        }
      });
    });
  }

  // Use stored session scores or fallback to calculation
  const sessionScores = reportData.sessionScores || (sessions || []).map((s: any) => calculateSessionScore(s));

  const totalFrictionEvents = (emotionStats.frustration || 0) + (emotionStats.confusion || 0);

  // All steps across all sessions for heatmap
  const allSteps = (sessions || []).flatMap((s: any) =>
    (s.session_logs || []).sort((a: any, b: any) => a.step_number - b.step_number)
  );

  const uxScore = report?.product_opportunity_score || 0;
  const hasReport = !!report;
  const frictionLevel = !hasReport ? 'N/A' : uxScore >= 75 ? 'Low' : uxScore >= 50 ? 'Medium' : 'High';
  const frictionColor = frictionLevel === 'N/A' ? 'text-slate-500' : frictionLevel === 'Low' ? 'text-emerald-400' : frictionLevel === 'Medium' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="animate-in fade-in space-y-12 duration-700 max-w-[1200px] mx-auto pb-16">

      {/* ── Header — Premium High-Impact Project Summary ────────────────────────── */}
      <div className="flex flex-col space-y-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors w-fit">
          <ChevronLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>

        <div className="group relative rounded-[48px] border border-white/5 bg-[#0a0a0a] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          {/* mesh gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-50" />

          <div className="relative p-8 md:p-14">
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="flex items-start gap-8">
                {/* Project Identity */}
                <div className="relative flex-shrink-0">
                  <div className="h-24 w-24 rounded-[32px] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-700">
                    <Activity className="h-10 w-10 text-indigo-400" />
                  </div>
                  <div className={`absolute -bottom-2 -right-2 h-10 w-10 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-xl`}>
                    {run.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Activity className="h-5 w-5 text-white" />}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-5xl font-black tracking-tighter text-white leading-none">
                      {run.projects?.name}
                    </h1>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      Test Run {run.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Layers className="h-4 w-4 text-indigo-500/30" />
                    <p className="text-lg font-medium tracking-tight">
                      Strategic analysis for <span className="text-indigo-400 select-all font-bold underline decoration-indigo-500/30 underline-offset-4 cursor-pointer hover:text-indigo-300 transition-colors uppercase tracking-widest text-xs">{run.projects?.target_url}</span>
                    </p>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-4 pt-4">
                    <RefreshButton testRunId={testRunId} />
                    <div className="flex items-center gap-2">
                      <button className="flex h-11 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-6 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                      <button className="flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
                        <Download className="h-4 w-4" /> Export PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-End Global Score Panel */}
              <div className="flex-shrink-0 bg-white/[0.03] border border-white/5 rounded-[40px] p-8 md:p-10 text-center min-w-[220px] backdrop-blur-3xl relative group/score transition-all hover:bg-white/[0.05]">
                <div className="absolute inset-0 bg-indigo-500/5 rounded-[40px] blur-3xl opacity-0 group-hover/score:opacity-100 transition-opacity" />
                <p className="relative text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Overall UX Health</p>
                <div className="relative flex items-end justify-center gap-1">
                  <span className="text-7xl font-black tracking-tighter leading-none" style={{ color: uxScore >= 75 ? '#10b981' : uxScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {uxScore}
                  </span>
                  <span className="text-slate-600 font-bold text-2xl mb-2">/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero Stats — Premium Glass Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: 'UX Score',
            value: uxScore,
            unit: '/100',
            icon: TrendingUp,
            color: uxScore >= 75 ? '#10b981' : uxScore >= 50 ? '#f59e0b' : '#ef4444'
          },
          {
            label: 'Friction',
            value: frictionLevel,
            unit: null,
            icon: Activity,
            color: frictionLevel === 'Low' ? '#10b981' : frictionLevel === 'Medium' ? '#f59e0b' : frictionLevel === 'N/A' ? '#64748b' : '#ef4444',
            isStatus: true
          },
          { label: 'Sessions', value: sessions?.length || 0, unit: null, icon: Users, color: '#6366f1' },
          { label: 'Total Steps', value: totalLogs, unit: null, icon: Zap, color: '#f59e0b' },
          { label: 'Friction Events', value: totalFrictionEvents, unit: null, icon: AlertTriangle, color: '#ef4444' },
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/5">
            <div className="absolute -top-4 -right-4 h-16 w-16 opacity-[0.03] transition-opacity group-hover:opacity-[0.07]">
              <stat.icon className="h-full w-full" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{stat.label}</p>
            <div className="flex items-end justify-center gap-1">
              <span
                className={`${stat.isStatus ? 'text-2xl' : 'text-4xl'} font-black tracking-tighter leading-none`}
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
              {stat.unit && <span className="text-slate-600 font-bold text-sm mb-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── UX Feedback Analytics ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">UX Feedback Analytics</h2>
          <p className="text-sm text-slate-500 font-medium">Charts, keyword themes, and every persona observation — distilled.</p>
        </div>
        <FeedbackSummary
          logs={allSteps}
          summary={reportData.feedbackSummary}
        />
      </div>

      {/* ── Sentiment Overview ──────────────────────────────────────────── */}
      <div className="rounded-[40px] border border-white/5 bg-[#0d0d0d] p-10 space-y-8 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Sentiment Overview</h2>
          <p className="text-sm text-slate-500 font-medium">Emotional distribution across all synthetic journeys.</p>
        </div>

        {/* Emotion bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Delight', count: emotionStats.delight, icon: Smile, color: '#10b981', bg: 'bg-emerald-500/10' },
            { label: 'Neutral', count: emotionStats.neutral, icon: Meh, color: '#64748b', bg: 'bg-slate-500/10' },
            { label: 'Confusion', count: emotionStats.confusion, icon: Activity, color: '#3b82f6', bg: 'bg-blue-500/10' },
            { label: 'Frustration', count: emotionStats.frustration, icon: Frown, color: '#ef4444', bg: 'bg-red-500/10' },
          ].map((s, i) => {
            const pct = totalLogs > 0 ? Math.round((s.count / totalLogs) * 100) : 0;
            return (
              <div key={i} className={`rounded-2xl ${s.bg} border border-white/5 p-6 space-y-4`}>
                <s.icon className="h-6 w-6" style={{ color: s.color }} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">{s.label}</p>
                  <p className="text-3xl font-black text-white">{s.count}</p>
                  <p className="text-[10px] text-slate-600 font-bold mt-0.5">{pct}% of steps</p>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Session Journey Drilldown ───────────────────────────────────── */}
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Session Journey Drilldown</h2>
          <p className="text-sm text-slate-500 font-medium">Step-by-step analysis with screenshots and per-step scoring.</p>
        </div>

        {sessions?.map((session: any, idx: number) => {
          const score = sessionScores[idx];
          const logs = (session.session_logs || []).sort((a: any, b: any) => a.step_number - b.step_number);
          const isCompleted = session.status === 'completed';
          const totalSteps = logs.length;

          return (
            <div key={session.id} className="group relative rounded-[48px] border border-white/5 bg-[#0a0a0a] overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] transition-all hover:shadow-[0_32px_64px_-16px_rgba(129,140,248,0.1)]">
              {/* Premium Header — mesh gradient bg */}
              <div className="relative p-8 md:p-12 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    {/* Persona Avatar/Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="h-20 w-20 rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-500">
                        <Users className="h-8 w-8 text-indigo-400" />
                      </div>
                      <div className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'} shadow-xl`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4 text-white" /> : <AlertTriangle className="h-4 w-4 text-white" />}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-3xl font-black tracking-tighter text-white leading-none">
                          {session.persona_configs?.name}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                          {session.status}
                        </div>
                      </div>
                      <p className="max-w-xl text-sm md:text-base font-medium text-slate-400 leading-relaxed italic opacity-80 decoration-indigo-500/30">
                        &ldquo;{session.persona_configs?.goal_prompt}&rdquo;
                      </p>

                      {/* Secondary Stats */}
                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{totalSteps} Steps Taken</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-slate-800" />
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {logs.filter((l: any) => l.emotion_tag === 'delight').length} Delightful Beats
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High-End Score Panel */}
                  <div className="flex-shrink-0 bg-white/[0.03] border border-white/5 rounded-[32px] p-6 text-center min-w-[140px] backdrop-blur-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Persona Score</p>
                    <div className="relative">
                      <div className="flex items-end justify-center">
                        <span className="text-5xl font-black tracking-tighter leading-none" style={{ color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {score}
                        </span>
                        <span className="text-slate-600 font-bold text-lg mb-1">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Content — Directly Visible */}
              <div className="border-t border-white/5">
                <div className="p-8 md:p-12 space-y-8 bg-gradient-to-b from-[#0c0c0c] to-[#0a0a0a]">


                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Audit Trail</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {logs.map((log: any) => (
                      <StepFeedbackCard key={log.id} step={log} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Website Heatmap ─────────────────────────────────────────────── */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Map className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Website Heatmap</h2>
            <p className="text-sm text-slate-500 font-medium">Click each page to see where the persona interacted. Red blobs = frustration, blue = confusion.</p>
          </div>
        </div>
        <WebsiteHeatmap steps={allSteps} />
      </div>

      {/* ── Cohort Breakdown ────────────────────────────────────────────── */}
      <div className="rounded-[40px] border border-white/5 bg-[#0d0d0d] p-10 space-y-8 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Cohort Breakdown</h2>
          <p className="text-sm text-slate-500 font-medium">Individual persona success rates.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(sessions || []).map((session: any, i: number) => {
            const score = sessionScores[i];
            const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

            return (
              <div key={session.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 group hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{session.persona_configs?.name}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 w-fit
                      ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}">
                      {session.status}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black" style={{ color: scoreColor }}>{score}</p>
                    <p className="text-[9px] text-slate-600">/100</p>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, background: scoreColor }} />
                </div>

                <p className="text-[10px] text-slate-600 italic leading-relaxed line-clamp-2">
                  {session.persona_configs?.goal_prompt}
                </p>
              </div>
            );
          })}
        </div>


      </div>

    </div>
  );
}
