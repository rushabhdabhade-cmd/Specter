import { createAdminClient } from '@/lib/supabase/admin';
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
import { ActionItems } from '@/components/reports/ActionItems';

export default async function ReportPage({ params }: { params: Promise<{ testRunId: string }> }) {
  const { testRunId } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = createAdminClient();

  // 1. Fetch run with project ownership check
  const { data: run, error: runError } = await supabase
    .from('test_runs')
    .select(`*, projects!inner(*)`)
    .eq('id', testRunId)
    .eq('projects.user_id', userId)
    .single();

  if (runError || !run) redirect('/reports');

  // 2. Fetch the report separately to avoid join ambiguity
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('test_run_id', testRunId)
    .maybeSingle();

  // Expanded query — get full logs with screenshots and DOM data
  const { data: sessions } = await supabase
    .from('persona_sessions')
    .select(`
      *,
      persona_configs(name, goal_prompt, tech_literacy),
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

      {/* ── Hero Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'UX Score', value: uxScore, icon: TrendingUp, color: uxScore >= 75 ? '#10b981' : uxScore >= 50 ? '#f59e0b' : '#ef4444', unit: '/100' },
          { label: 'Friction', value: frictionLevel, icon: Activity, color: frictionLevel === 'Low' ? '#10b981' : frictionLevel === 'Medium' ? '#f59e0b' : frictionLevel === 'N/A' ? '#64748b' : '#ef4444', isStatus: true },
          { label: 'Sessions', value: sessions?.length || 0, icon: Users, color: '#6366f1' },
          { label: 'Total Steps', value: totalLogs, icon: Zap, color: '#f59e0b' },
          { label: 'Friction Events', value: totalFrictionEvents, icon: AlertTriangle, color: '#ef4444' },
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{stat.label}</p>
            <div className="flex items-end justify-center gap-1">
              <span className={`${stat.isStatus ? 'text-2xl' : 'text-4xl'} font-black tracking-tighter leading-none`} style={{ color: stat.color }}>{stat.value}</span>
              {stat.unit && <span className="text-slate-600 font-bold text-sm mb-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Strategic Conclusion Hub ─────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Strategic Briefing</h2>
            <p className="text-sm text-slate-500 font-medium">Holistic AI synthesis and prioritized architectural fixes.</p>
          </div>
        </div>

        {/* Synthesis Markdown */}
        {report?.executive_summary ? (
          <div className="rounded-[40px] border border-white/5 bg-[#0a0a0a] p-10 prose prose-invert max-w-none shadow-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.executive_summary.replace(/^#+\s*STRATEGIC\s*SUMMARY\s*\n+/i, '')}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Synthesis in progress...</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">AI is currently analyzing the session logs to generate your strategic briefing. Refresh in a few moments.</p>
            </div>
          </div>
        )}

        <ActionItems items={reportData.actionItems || []} />
      </div>

      {/* ── Cohort Segmentation Profiling ─────────────────────────────────── */}
      <div className="rounded-[40px] border border-white/5 bg-[#0d0d0d] p-10 space-y-12 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Participant Profile Segmentation</h2>
          <p className="text-sm text-slate-500 font-medium">Understanding performance by Technical Literacy.</p>
        </div>

        {['High', 'Medium', 'Low'].map((literacy) => {
          const literacySessions = (sessions || []).filter((s: any) =>
            s.persona_configs?.tech_literacy?.toLowerCase() === literacy.toLowerCase()
          );
          if (literacySessions.length === 0) return null;

          // Calculate group metrics
          const groupScores = literacySessions.map(s => {
            const sIdx = sessions?.findIndex(ss => ss.id === s.id) ?? 0;
            return sessionScores[sIdx];
          });
          const avgScore = Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length);
          const scoreColor = avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-amber-400' : 'text-red-400';

          return (
            <div key={literacy} className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${literacy === 'High' ? 'bg-emerald-500' : literacy === 'Medium' ? 'bg-blue-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{literacy} Tech Literacy Segment</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-2xl font-black ${scoreColor}`}>{avgScore}<span className="text-[10px] text-slate-600 ml-0.5">/100</span></p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Avg. Segment Score</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {literacySessions.map((session: any) => {
                  const sIdx = sessions?.findIndex((s: any) => s.id === session.id) ?? 0;
                  const score = sessionScores[sIdx];
                  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={session.id} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4 group hover:border-white/10 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white leading-tight truncate">{session.persona_configs?.name}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-2 w-fit ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{session.status}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-black leading-none" style={{ color: scoreColor }}>{score}</p>
                          <p className="text-[9px] text-slate-600 font-bold">SCORE</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* ── Detailed Persona Insight Modules ── */}
      <div className="space-y-32">
        {sessions?.map((session: any, idx: number) => {
          const score = sessionScores[idx];
          const logs = (session.session_logs || []).sort((a: any, b: any) => a.step_number - b.step_number);
          const isCompleted = session.status === 'completed';
          const personaName = session.persona_configs?.name;
          const literacy = session.persona_configs?.tech_literacy;

          // Local emotion stats for this persona
          const personaEmotionStats = { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
          logs.forEach((l: any) => { if (l.emotion_tag in personaEmotionStats) personaEmotionStats[l.emotion_tag as keyof typeof personaEmotionStats]++; });

          return (
            <div key={session.id} className="space-y-12">
              {/* Module Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-px shadow-lg">
                      <div className="h-full w-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center">
                        <Users className="h-6 w-6 text-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter text-white">{personaName}</h2>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mt-1">{literacy} Tech Literacy &bull; Journey Profile</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-slate-400 italic max-w-2xl leading-relaxed">
                    &ldquo;{session.persona_configs?.goal_prompt}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-12 bg-white/[0.02] border border-white/5 rounded-[32px] px-10 py-6">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
                    <p className="text-2xl font-black text-white">{isCompleted ? '100%' : 'Abandoned'}</p>
                  </div>
                  <div className="h-8 w-px bg-white/5" />
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Persona Score</p>
                    <p className="text-3xl font-black" style={{ color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score}</p>
                  </div>
                </div>
              </div>

              {/* Persona Sentiment Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Delight', count: personaEmotionStats.delight, icon: Smile, color: '#10b981', bg: 'bg-emerald-500/10' },
                  { label: 'Neutral', count: personaEmotionStats.neutral, icon: Meh, color: '#64748b', bg: 'bg-slate-500/10' },
                  { label: 'Confusion', count: personaEmotionStats.confusion, icon: Activity, color: '#3b82f6', bg: 'bg-blue-500/10' },
                  { label: 'Frustration', count: personaEmotionStats.frustration, icon: Frown, color: '#ef4444', bg: 'bg-red-500/10' },
                ].map((s, i) => {
                  const pct = logs.length > 0 ? Math.round((s.count / logs.length) * 100) : 0;
                  return (
                    <div key={i} className={`rounded-3xl ${s.bg} border border-white/5 p-6 space-y-3`}>
                      <div className="flex items-center justify-between">
                        <s.icon className="h-5 w-5" style={{ color: s.color }} />
                        <span className="text-base font-black text-white">{pct}%</span>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Feedback Summary for this persona */}
              <FeedbackSummary
                id={session.id}
                logs={logs}
                summary={undefined} // Keep persona specific logs clean, global summary is at top
              />

              {/* Audit Trail for this persona */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Detailed Journey Audit</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {logs.map((log: any) => (
                    <StepFeedbackCard key={log.id} step={log} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Holistic Spatial Analysis ── */}
      <div className="space-y-8 pt-12 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Map className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Holistic Website Heatmap</h2>
            <p className="text-sm text-slate-500 font-medium">Aggregate spatial interactions from every participant in the cohort.</p>
          </div>
        </div>
        <WebsiteHeatmap
          steps={allSteps}
          dropOffStats={reportData.dropOffStats}
          totalSessions={sessions?.length}
        />
      </div>

    </div>
  );
}
