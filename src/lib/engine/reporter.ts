import { createAdminClient } from '../supabase/admin';

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

interface SessionWithDetails {
    id: string;
    status: string;
    persona_configs: { name: string; goal_prompt: string };
    session_logs: { emotion_tag: string; inner_monologue: string }[];
}

export async function generateAndStoreReport(testRunId: string) {
    const supabase = createAdminClient();

    // 1. Fetch all sessions for this test run
    const { data, error: sError } = await supabase
        .from('persona_sessions')
        .select(`
            id,
            status,
            persona_configs (name, goal_prompt),
            session_logs (emotion_tag, inner_monologue)
        `)
        .eq('test_run_id', testRunId);

    const sessions = data as unknown as SessionWithDetails[];

    if (sError || !sessions || sessions.length === 0) {
        console.error('Failed to fetch sessions for report:', sError);
        return;
    }

    // 2. Synthesize Metrics
    let totalScore = 0;
    let totalLogs = 0;
    let completedCount = 0;

    sessions.forEach(session => {
        if (session.status === 'completed') completedCount++;

        let sessionScore = 100;
        session.session_logs?.forEach((log) => {
            totalLogs++;
            if (log.emotion_tag === 'frustration') {
                sessionScore -= 10;
            }
            if (log.emotion_tag === 'confusion') sessionScore -= 5;
            if (log.emotion_tag === 'delight') sessionScore += 2;
        });

        if (session.status === 'abandoned' || session.status === 'error') {
            sessionScore -= 30;
        }

        totalScore += Math.max(0, Math.min(100, sessionScore));
    });

    const averageScore = Math.round(totalScore / sessions.length);
    const funnelRate = (completedCount / sessions.length) * 100;

    // 3. Generate Summary (Simple for now, LLM later)
    const executiveSummary = `This test run involved ${sessions.length} synthetic personas. 
    ${completedCount} sessions reached their objectives successfully. 
    The overall usability score is ${averageScore}/100 with a funnel completion rate of ${funnelRate.toFixed(1)}%.`;

    // 4. Store in DB
    const { error: rError } = await (supabase.from('reports') as any).upsert({
        test_run_id: testRunId,
        product_opportunity_score: averageScore,
        executive_summary: executiveSummary,
        funnel_completion_rate: funnelRate,
        heatmap_data_url: null // Future phase
    }, { onConflict: 'test_run_id' });

    if (rError) {
        console.error('Error storing report:', rError);
        return;
    }

    // 5. Finalize Test Run
    await (supabase.from('test_runs') as any).update({
        status: 'completed',
        completed_at: new Date().toISOString()
    }).eq('id', testRunId);

    console.log(`✅ Report generated and persisted for Test Run ${testRunId}`);
}

export async function checkAndFinalizeTestRun(testRunId: string) {
    const supabase = createAdminClient();

    // Fetch all sessions for this test run
    const { data, error } = await supabase
        .from('persona_sessions')
        .select('status')
        .eq('test_run_id', testRunId);

    if (error || !data) {
        console.error('Error checking sessions for finalization:', error);
        return;
    }

    const sessions = data as { status: string }[];

    // Check if any session is still active
    const activeSessions = sessions.filter(s => s.status === 'running' || s.status === 'queued');

    if (activeSessions.length === 0) {
        console.log(`🎯 All sessions finished for Test Run ${testRunId}. Finalizing report...`);
        await generateAndStoreReport(testRunId);
    } else {
        console.log(`⏳ ${activeSessions.length} sessions still active for Test Run ${testRunId}. Waiting...`);
    }
}
