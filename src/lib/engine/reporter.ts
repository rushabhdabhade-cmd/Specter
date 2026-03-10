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

    const summaryAlreadyExists = !force && existingReport?.executive_summary &&
        !existingReport.executive_summary.includes('*AI synthesis unavailable*') &&
        !existingReport.executive_summary.includes('*AI synthesis failed');

    if (summaryAlreadyExists) {
        console.log('✅ AI summary already exists — skipping synthesis. Use force=true to regenerate.');
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
            persona_configs (name, goal_prompt),
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

        const sessionScore = calculateSessionScore(session);
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
            qualitativeData.push(`S${log.step_number}[${log.emotion_tag}]: ${String(log.inner_monologue || '').slice(0, 150)}${feedback}`);
        });
    });

    const averageScore = Math.round(totalScore / sessions.length);
    const funnelRate = (completedCount / sessions.length) * 100;

    // 3. AI Synthesis — uses project fetched directly from test_run above
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
Goal: Provide a SIMPLE, easy-to-understand executive conclusion.

Stats: ${sessions.length} personas, ${funnelRate.toFixed(1)}% success rate, usability score ${averageScore}/100.

Raw qualitative feedback from all sessions:
${Array.from(allUserFeedback).map(f => `- ${f}`).join('\n')}

Key session logs detail:
${qualitativeData.join('\n')}

Write a professional UX report in Markdown with:
# SIMPLE CONCLUSION
(Write a 2-3 sentence extremely simple summary of if the site worked or failed for users)

## Overall UX Health
## Friction Points
## Persona Sentiment
## Recommendations (3-5 bullets)`;

            try {
                aiSynthesis = await llm.generateSummary(prompt);
                console.log('✅ Main synthesis complete.');
            } catch (e) {
                console.error('❌ Synthesis LLM call failed:', e);
                aiSynthesis = `### 📋 Summary\n${sessions.length} personas. ${completedCount} succeeded. Score: **${averageScore}/100**, funnel: **${funnelRate.toFixed(1)}%**.\n\n*AI synthesis failed. Raw data available in session logs.*`;
            }

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
            feedbackSummary: (emotionStats as any).feedbackSummary || null
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

    const { data, error } = await supabase
        .from('persona_sessions')
        .select('status')
        .eq('test_run_id', testRunId);

    if (error || !data) {
        console.error('Error checking sessions for finalization:', error);
        return;
    }

    const sessions = data as { status: string }[];
    const activeSessions = sessions.filter(s => s.status === 'running' || s.status === 'queued');

    if (activeSessions.length === 0) {
        console.log(`🎯 Final session completed for Test Run ${testRunId}. Triggering final report...`);
        await generateAndStoreReport(testRunId);
    } else {
        console.log(`⏳ ${activeSessions.length} sessions still active for Test Run ${testRunId}. Waiting...`);
    }
}
