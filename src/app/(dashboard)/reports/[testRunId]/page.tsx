import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { calculateSessionScore } from '@/lib/utils/scoring';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, AlertTriangle, Brain, CheckCircle2, ChevronLeft,
  Frown, Meh, Smile, Sparkles, Users, Zap
} from 'lucide-react';
import { RefreshButton } from '@/components/reports/RefreshButton';
import { AuditTrail } from '@/components/reports/AuditTrail';
import { FeedbackSummary } from '@/components/reports/FeedbackSummary';
import { ActionItems } from '@/components/reports/ActionItems';
import { ReportActions } from '@/components/reports/ReportActions';
import { TechnicalAudit } from '@/components/reports/TechnicalAudit';
import { MetricTooltip } from '@/components/reports/MetricTooltip';

export default async function ReportPage({ params }: { params: Promise<{ testRunId: string }> }) {
  const { testRunId } = await params;
  const { userId } = await auth().catch(() => ({ userId: null })) as { userId: string | null };

  const supabase = createAdminClient();

  const [runRes, reportRes, sessionsRes] = await Promise.all([
    userId
      ? supabase.from('test_runs').select(`*, projects!inner(*)`).eq('id', testRunId).eq('projects.user_id', userId).single()
      : supabase.from('test_runs').select(`*, projects(*)`).eq('id', testRunId).single(),
    supabase.from('reports').select('*').eq('test_run_id', testRunId).maybeSingle(),
    supabase.from('persona_sessions').select(`
      *,
      persona_configs(name, goal_prompt, tech_literacy),
      session_logs(id, step_number, emotion_tag, emotion_score, inner_monologue, current_url, screenshot_url, action_taken, created_at)
    `).eq('test_run_id', testRunId)
  ]);

  const run = runRes.data as any;
  const report = reportRes.data as any;
  const sessions = sessionsRes.data as any[] | null;

  if (runRes.error || !run) {
    if (userId) redirect('/reports');
    return <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">Report not found or access denied.</div>;
  }

  const totalLogs = sessions?.reduce((acc: number, s: any) => acc + (s.session_logs?.length || 0), 0) || 0;
  const reportData = (report as any)?.report_data || {};

  const emotionStats = reportData.emotionStats || { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
  if (!reportData.emotionStats) {
    sessions?.forEach(s => {
      s.session_logs?.forEach((l: any) => {
        if (l.emotion_tag in emotionStats) emotionStats[l.emotion_tag as keyof typeof emotionStats]++;
      });
    });
  }

  const sessionScores = reportData.sessionScores || (sessions || []).map((s: any) => calculateSessionScore(s).mainScore);
  const totalFrictionEvents = (emotionStats.frustration || 0) + (emotionStats.confusion || 0);
  const uxScore = report?.product_opportunity_score || 0;
  const hasReport = !!report;
  const frictionLevel = !hasReport ? 'N/A' : uxScore >= 75 ? 'Low' : uxScore >= 50 ? 'Medium' : 'High';

  return (
    <div className="report-container animate-in fade-in duration-700 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pb-16 space-y-6 md:space-y-10">

      {/* ── Top bar: back nav + share ── */}
      <div className="pt-2 flex items-center justify-between">
        <Link href="/dashboard" className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>
        <div className="no-print">
          <ReportActions />
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="relative rounded-2xl border border-slate-700/60 bg-slate-800/70 overflow-hidden shadow-xl">

        <div className="relative p-5 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left: identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-14 w-14 rounded-xl bg-slate-700/80 border border-slate-600/50 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-indigo-400" />
                </div>
                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-800 flex items-center justify-center ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-20">
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={run.projects?.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none hover:text-indigo-300 transition-colors break-all"
                  >
                    {run.projects?.name}
                  </a>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                    {run.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: UX score */}
            <div className="flex-shrink-0 bg-slate-700/40 border border-slate-600/40 rounded-xl px-6 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall UX Health</p>
                <MetricTooltip text="A 0–100 score based on how positive vs negative your users felt across every page they visited. Above 75 is healthy, below 50 means users are struggling." direction="left" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black tracking-tighter leading-none" style={{ color: uxScore >= 75 ? '#10b981' : uxScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {uxScore}
                </span>
                <span className="text-slate-500 font-bold text-xl mb-1">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Friction Level',
            value: frictionLevel,
            color: frictionLevel === 'Low' ? '#10b981' : frictionLevel === 'Medium' ? '#f59e0b' : frictionLevel === 'N/A' ? '#64748b' : '#ef4444',
            isStatus: true,
            tip: 'Derived from your UX Health score — Low means users felt mostly positive (75+), Medium means mixed (50–74), High means significant struggles (below 50).'
          },
          {
            label: 'Sessions',
            value: sessions?.length || 0,
            color: '#6366f1',
            tip: 'The number of AI personas that independently tested your website in this run.'
          },
          {
            label: 'Total Steps',
            value: totalLogs,
            color: '#f59e0b',
            tip: 'Every page visit, click, and interaction recorded across all test sessions combined.'
          },
          {
            label: 'Friction Events',
            value: totalFrictionEvents,
            color: '#ef4444',
            tip: 'Total moments where a user felt confused or frustrated. Each step tagged with those emotions counts as one event.'
          },
        ].map((stat, i) => (
          <div key={i} className="relative rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <MetricTooltip text={stat.tip} />
            </div>
            <span className={`${stat.isStatus ? 'text-2xl' : 'text-3xl'} font-black tracking-tight leading-none`} style={{ color: stat.color }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── AI Insights ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Insights Report</h2>
              <p className="text-xs text-slate-400">What your users actually experience — friction, wins, and what to fix first.</p>
            </div>
          </div>
          <div className="no-print flex-shrink-0 pt-0.5">
            <RefreshButton testRunId={testRunId} variant="regenerate-only" />
          </div>
        </div>

        {report?.executive_summary ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
            <div className="px-5 md:px-8 py-6 prose prose-invert prose-sm md:prose-base max-w-none break-words
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:border-slate-700 prose-h2:pb-2
              prose-h3:text-sm prose-h3:text-indigo-300 prose-h3:mt-4 prose-h3:mb-1.5
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-2
              prose-li:text-slate-300 prose-li:marker:text-indigo-400 prose-ul:my-2 prose-ol:my-2
              prose-strong:text-white prose-strong:font-semibold
              prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
              prose-pre:bg-slate-900/60 prose-pre:border prose-pre:border-slate-700 prose-pre:whitespace-pre-wrap
              prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1 prose-code:rounded prose-code:text-[85%] prose-code:font-normal">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.executive_summary.replace(/^#+\s*STRATEGIC\s*SUMMARY\s*\n+/i, '')}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/20">
            <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Analysis in progress...</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">AI is reviewing session data to generate your insights. Refresh in a few moments.</p>
            </div>
          </div>
        )}

        <ActionItems items={reportData.actionItems || []} />
        <TechnicalAudit data={reportData.technicalAudit || null} />
      </div>

      {/* ── Cohort Segmentation ── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 md:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Participant Segments</h2>
          <p className="text-xs text-slate-400 mt-0.5">Performance broken down by user technical literacy.</p>
        </div>

        {['High', 'Medium', 'Low'].map((literacy) => {
          const literacySessions = (sessions || []).filter((s: any) =>
            s.persona_configs?.tech_literacy?.toLowerCase() === literacy.toLowerCase()
          );
          if (literacySessions.length === 0) return null;

          const groupScores = literacySessions.map(s => {
            const sIdx = sessions?.findIndex(ss => ss.id === s.id) ?? 0;
            return sessionScores[sIdx];
          });
          const avgScore = Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length);
          const scoreColor = avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-amber-400' : 'text-red-400';

          return (
            <div key={literacy} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 rounded-full ${literacy === 'High' ? 'bg-emerald-500' : literacy === 'Medium' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{literacy} Tech Literacy</h3>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${scoreColor}`}>{avgScore}<span className="text-[10px] text-slate-500 ml-0.5">/100</span></p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Avg Score</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {literacySessions.map((session: any) => {
                  const sIdx = sessions?.findIndex((s: any) => s.id === session.id) ?? 0;
                  const score = sessionScores[sIdx];
                  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={session.id} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{session.persona_configs?.name}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-2xl font-black" style={{ color: scoreColor }}>{score}</p>
                        <p className="text-[9px] text-slate-500 font-bold">SCORE</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Per-persona sections ── */}
      <div className="space-y-8">
        {sessions?.map((session: any, idx: number) => {
          const scoreResult = calculateSessionScore({
            ...session,
            persona: { tech_literacy: session.persona_configs?.tech_literacy }
          });
          const score = scoreResult.mainScore;
          const logs = [...(session.session_logs || [])].sort((a: any, b: any) => a.step_number - b.step_number);
          const personaName = (session.persona_configs?.name ?? '').replace(/</g, '&lt;');
          const literacy = (session.persona_configs?.tech_literacy ?? '').replace(/</g, '&lt;');
          const goalPrompt = (session.persona_configs?.goal_prompt ?? '').replace(/</g, '&lt;');

          const personaEmotionStats = { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
          logs.forEach((l: any) => { if (l.emotion_tag in personaEmotionStats) personaEmotionStats[l.emotion_tag as keyof typeof personaEmotionStats]++; });

          return (
            <div key={session.id} className="space-y-4">
              {/* Persona header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white">{personaName}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{literacy} Tech Literacy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Persona Score</p>
                      <MetricTooltip text="How smoothly this persona completed their goal. Combines emotion distribution, number of friction events, and whether the session completed." />
                    </div>
                    <p className="text-3xl font-black mt-0.5" style={{ color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score}<span className="text-sm text-slate-500">/100</span></p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 italic">"{goalPrompt}"</p>

              {/* Emotion breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Delight', icon: Smile, color: '#10b981', bg: 'bg-emerald-500/8 border-emerald-500/15', tip: 'Steps where the persona felt happy or pleasantly surprised — things that are working well.' },
                  { label: 'Neutral', icon: Meh, color: '#64748b', bg: 'bg-slate-500/8 border-slate-500/15', tip: 'Steps with no strong reaction — the persona got through without any notable feeling.' },
                  { label: 'Confusion', icon: Activity, color: '#3b82f6', bg: 'bg-blue-500/8 border-blue-500/15', tip: 'Steps where the persona felt lost or unsure what to do next — usually a sign of unclear UX.' },
                  { label: 'Frustration', icon: Frown, color: '#ef4444', bg: 'bg-red-500/8 border-red-500/15', tip: 'Steps where the persona felt blocked or annoyed — these are your highest-priority issues to fix.' },
                ].map((s, i) => {
                  const pct = scoreResult.emotionScores[s.label.toLowerCase()] || 0;
                  return (
                    <div key={i} className={`rounded-xl ${s.bg} border p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <s.icon className="h-4 w-4" style={{ color: s.color }} />
                        <MetricTooltip text={s.tip} />
                      </div>
                      <p className="text-xl font-black text-white">{pct}%</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              <FeedbackSummary id={session.id} logs={logs} summary={undefined} personaName={session.persona_configs?.name} />
              <AuditTrail logs={logs} personaName={session.persona_configs?.name} />
            </div>
          );
        })}
      </div>

    </div>
  );
}
