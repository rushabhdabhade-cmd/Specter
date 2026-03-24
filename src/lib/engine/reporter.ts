import { createAdminClient } from '../supabase/admin';
import { LLMService } from './llm';
import { decrypt } from '../utils/vault';
import { calculateSessionScore } from '../utils/scoring';

export interface ReportSummary {
    personaName: string;
    goal: string;
    status: 'completed' | 'abandoned' | 'error';
    steps: number;
    summary: string;
    keyFindings: string[];
    journey: {
        step: number;
        action: string;
        emotions: string;
        monologue: string;
    }[];
}

export async function generateAndStoreReport(testRunId: string, force = false) {
    const supabase = createAdminClient();
    console.log(`📊 Generating report for Test Run: ${testRunId}... (force=${force})`);

    // ── Pre-check: if report already has an AI summary and force=false, skip synthesis ──
    const { data: existingReport } = await (supabase.from('reports') as any)
        .select('executive_summary')
        .eq('test_run_id', testRunId)
        .maybeSingle();

    console.log(`🔍 Checking if summary exists for run ${testRunId}...`);
    if (existingReport?.executive_summary) {
        console.log(`🔍 Existing summary length: ${existingReport.executive_summary.length}`);
        console.log(`🔍 Existing summary snippet: "${existingReport.executive_summary.substring(0, 50)}..."`);
    }

    const summaryAlreadyExists = !force &&
        existingReport?.executive_summary &&
        existingReport.executive_summary.trim().length > 10 &&
        !existingReport.executive_summary.includes('*AI synthesis unavailable*') &&
        !existingReport.executive_summary.includes('*AI synthesis failed') &&
        !existingReport.executive_summary.includes('Synthesis in progress');

    if (summaryAlreadyExists) {
        console.log('✅ AI summary already exists — skipping synthesis. Use force=true to regenerate.');
    } else if (existingReport?.executive_summary) {
        console.log('⚠️ Existing summary is empty, too short, or a placeholder — triggering synthesis...');
    }

    // 1. Fetch project config directly from test_run (reliable — no nested join needed)
    const { data: testRun } = await (supabase.from('test_runs') as any)
        .select('projects(id, llm_provider, encrypted_llm_key)')
        .eq('id', testRunId)
        .maybeSingle();

    const project = testRun?.projects;
    console.log(`🔍 Project config for synthesis:`, project?.llm_provider ?? 'NOT FOUND');

    // 2. Fetch all sessions with session logs
    const { data, error: sError } = await supabase
        .from('persona_sessions')
        .select(`
            id,
            status,
            persona_configs (name, goal_prompt, tech_literacy),
            session_logs (emotion_tag, inner_monologue, action_taken, step_number)
        `)
        .eq('test_run_id', testRunId);

    const sessions = data as any[];

    if (sError || !sessions || sessions.length === 0) {
        console.error('❌ Failed to fetch sessions for report:', sError);
        return;
    }

    // 2. Aggregate Data and Qualitative Insights
    let totalScore = 0;
    let completedCount = 0;
    const qualitativeData: string[] = [];
    const allUserFeedback = new Set<string>();
    const emotionStats = { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
    const sessionScores: number[] = [];

    sessions.forEach(session => {
        if (session.status === 'completed') completedCount++;

        const personaName = session.persona_configs?.name || 'Unknown';
        const goal = session.persona_configs?.goal_prompt || '';
        const logs = (session.session_logs || []).sort((a: any, b: any) => a.step_number - b.step_number);

        const sessionScore = calculateSessionScore({
            ...session,
            persona: {
                tech_literacy: session.persona_configs?.tech_literacy
            }
        });
        totalScore += sessionScore;
        sessionScores.push(sessionScore);

        // Update emotion stats for the whole run
        logs.forEach((log: any) => {
            if (log.emotion_tag in emotionStats) {
                emotionStats[log.emotion_tag as keyof typeof emotionStats]++;
            }
        });

        // Collect all unique UX feedback for the global summary
        logs.forEach((log: any) => {
            const f = log.action_taken?.ux_feedback;
            if (f && f !== 'undefined' && f.length > 5) {
                allUserFeedback.add(f);
            }
        });

        // ── Token-efficient log selection (for context) ────────────────────
        // Only include: first 2 steps, last 2 steps, and ALL frustration/confusion steps.
        const keyIndices = new Set<number>();
        logs.forEach((_: any, i: number) => {
            if (i < 2 || i >= logs.length - 2) keyIndices.add(i);
        });
        logs.forEach((log: any, i: number) => {
            if (log.emotion_tag === 'frustration' || log.emotion_tag === 'confusion') keyIndices.add(i);
        });

        const keyLogs = logs.filter((_: any, i: number) => keyIndices.has(i));

        qualitativeData.push(`\n### ${personaName} (${session.status})\nGoal: ${goal}`);
        keyLogs.forEach((log: any) => {
            const feedback = log.action_taken?.ux_feedback && log.action_taken.ux_feedback !== 'undefined'
                ? ` | UX: ${String(log.action_taken.ux_feedback).slice(0, 120)}`
                : '';
            qualitativeData.push(`S${log.step_number}[${log.emotion_tag}] @ ${log.current_url}: ${String(log.inner_monologue || '').slice(0, 150)}${feedback}`);
        });
    });

    const averageScore = Math.round(totalScore / sessions.length);
    const funnelRate = (completedCount / sessions.length) * 100;

    // 3. AI Synthesis -- uses project fetched directly from test_run above
    let aiSynthesis = `### 📋 Summary\n${sessions.length} personas tested. ${completedCount} completed. Score: **${averageScore}/100**, funnel: **${funnelRate.toFixed(1)}%**.\n\n*AI synthesis unavailable.*`;

    try {
        if (project?.llm_provider && !summaryAlreadyExists) {
            let apiKey: string | undefined;
            if (project.encrypted_llm_key) {
                try { apiKey = decrypt(project.encrypted_llm_key); } catch (e) { console.warn('⚠️ Failed to decrypt LLM key:', e); }
            }
            const llm = new LLMService({ provider: project.llm_provider, apiKey });
            console.log(`🤖 Synthesizing report with ${project.llm_provider} using ${allUserFeedback.size} feedback points...`);

            const prompt = `UX Report Synthesis. 
Goal: Provide a CONCISE, high-impact executive conclusion for stakeholders.

Stats: ${sessions.length} personas, ${funnelRate.toFixed(1)}% success rate, usability score ${averageScore}/100.

Raw qualitative feedback from all sessions:
${Array.from(allUserFeedback).map(f => `- ${f}`).join('\n')}

Key session logs detail:
${qualitativeData.join('\n')}

Write a professional UX report in Markdown with:
# STRATEGIC UX AUDIT
(Write a high-impact, 3-5 sentence professional UX audit conclusion. Focus on: Visual Hierarchy, Content Relevance, Navigation Friction, and overall Trust/Brand Perception. State clearly if the site meets the persona's expectations and where the biggest drop-off risks are.)

Finally, provide a SEPARATE section for automated parsing:
[ACTION_ITEMS]
- (Priority: High/Medium/Low) | Fix: [UX Improvement Title] | Detail: [Specific recommendation]
...
(Max 5 items)
[/ACTION_ITEMS]`;

            try {
                aiSynthesis = await llm.generateSummary(prompt);
                console.log('✅ Main synthesis complete.');
            } catch (e) {
                console.error('❌ Synthesis LLM call failed:', e);
                aiSynthesis = `### 📋 Summary\n${sessions.length} personas. ${completedCount} succeeded. Score: **${averageScore}/100**, funnel: **${funnelRate.toFixed(1)}%**.\n\n*AI synthesis failed. Raw data available in session logs.*`;
            }

            // ── Parse Action Items from Synthesis ────────────────────────────
            const actionMatch = aiSynthesis.match(/\[?ACTION_ITEMS\]?([\s\S]*?)\[\/?ACTION_ITEMS\]?/i);
            const rawActionItems = actionMatch ? actionMatch[1].trim().split('\n').filter(l => l.trim().startsWith('-')) : [];
            const actionItems = rawActionItems.map(item => {
                const cleanItem = item.replace(/^- /, '').trim();
                const parts = cleanItem.split('|').map(p => p.trim());
                return {
                    priority: parts[0]?.replace(/^Priority:\s*/i, '') || 'Medium',
                    title: parts[1]?.replace(/^Fix:\s*/i, '') || 'Improve Flow',
                    detail: parts[2]?.replace(/^Detail:\s*/i, '') || cleanItem
                };
            }).slice(0, 5);

            // Clean up the synthesis text: remove tags and redundant Strategic Summary headers
            aiSynthesis = aiSynthesis
                .replace(/\[?ACTION_ITEMS\]?[\s\S]*?\[\/?ACTION_ITEMS\]?/gi, '')
                .replace(/^#+\s*STRATEGIC\s*SUMMARY\s*\n+/i, '')
                .trim();

            (emotionStats as any).actionItems = actionItems;

            // ── Secondary Synthesis: Feedback Log Summary ──────────────────
            console.log('🤖 Characterizing raw feedback log...');
            const feedbackPrompt = `Summarize these raw UX feedback points in 2-3 concise sentences. Focus on the most frequent themes and the overall sentiment. Keep it very short and professional:
            
            ${Array.from(allUserFeedback).join('\n')}`;

            try {
                const feedbackSummary = await llm.generateSummary(feedbackPrompt);
                (emotionStats as any).feedbackSummary = feedbackSummary;
                console.log('✅ Feedback characterization complete.');
            } catch (e) {
                console.warn('⚠️ Feedback log characterization failed:', e);
            }
        } else if (!project?.llm_provider) {
            console.warn('⚠️ No llm_provider found for this project — skipping AI synthesis.');
        }
    } catch (e) {
        console.error('❌ Report synthesis outer error:', e);
    }

    // 4. Store in DB
    const { error: rError } = await (supabase.from('reports') as any).upsert({
        test_run_id: testRunId,
        product_opportunity_score: averageScore,
        // Only overwrite executive_summary if synthesis ran (avoids clobbering stored value)
        executive_summary: summaryAlreadyExists ? existingReport!.executive_summary : aiSynthesis,
        funnel_completion_rate: funnelRate,
        report_data: {
            emotionStats,
            sessionScores,
            totalLogs: Array.from(allUserFeedback).length,
            feedbackSummary: (emotionStats as any).feedbackSummary || null,
            actionItems: (emotionStats as any).actionItems || [],
            dropOffStats: sessions.reduce((acc: any, s: any) => {
                if (s.status !== 'completed' && s.session_logs?.length > 0) {
                    const lastLog = s.session_logs.sort((a: any, b: any) => b.step_number - a.step_number)[0];
                    const url = lastLog.current_url;
                    if (url) acc[url] = (acc[url] || 0) + 1;
                }
                return acc;
            }, {})
        },
        heatmap_data_url: null,
        created_at: new Date().toISOString()
    }, { onConflict: 'test_run_id' });

    if (rError) {
        console.error('❌ Error storing report:', rError);
        return;
    }

    // 5. Finalize Test Run
    const wasManuallyStopped = sessions.some(s => s.exit_reason === 'Manually stopped by user');
    const finalStatus = wasManuallyStopped ? 'stopped' : 'completed';

    await (supabase.from('test_runs') as any).update({
        status: finalStatus,
        completed_at: new Date().toISOString()
    }).eq('id', testRunId);

    console.log(`✅ Report successfully generated and persisted for Test Run ${testRunId}`);
}

export async function checkAndFinalizeTestRun(testRunId: string) {
    const supabase = createAdminClient();

    // 1. Fetch sessions with their last log time to detect staleness
    const { data: sessions, error } = await supabase
        .from('persona_sessions')
        .select('id, status, created_at, updated_at')
        .eq('test_run_id', testRunId);

    if (error || !sessions) {
        console.error('❌ Error checking sessions for finalization:', error);
        return;
    }

    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();
    let hasStaleSessions = false;

    for (const session of (sessions as any[])) {
        const isPending = session.status === 'running' || session.status === 'queued';
        if (isPending) {
            // Use created_at if updated_at isn't automatically maintained by Supabase
            const lastUpdate = new Date(session.updated_at || session.created_at).getTime();
            if (now - lastUpdate > STALE_THRESHOLD_MS) {
                console.warn(`⚠️ Session ${session.id} appears stale (last update ${Math.round((now - lastUpdate) / 60000)}m ago). Abandoning to unblock report.`);
                await (supabase.from('persona_sessions') as any)
                    .update({
                        status: 'abandoned',
                        exit_reason: 'Automatic abandonment due to inactivity (stale)'
                    })
                    .eq('id', session.id);
                hasStaleSessions = true;
            }
        }
    }

    // Refresh session data if we updated any
    let finalSessions = sessions;
    if (hasStaleSessions) {
        const { data: refreshed } = await supabase
            .from('persona_sessions')
            .select('status')
            .eq('test_run_id', testRunId);
        finalSessions = refreshed || sessions;
    }

    const activeSessions = (finalSessions as any[]).filter(s => s.status === 'running' || s.status === 'queued');

    if (activeSessions.length === 0) {
        console.log(`🎯 Final session completed for Test Run ${testRunId}. Triggering final report...`);
        await generateAndStoreReport(testRunId);
    } else {
        console.log(`⏳ ${activeSessions.length} sessions still active for Test Run ${testRunId}. Waiting...`);
    }
}
