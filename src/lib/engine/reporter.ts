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

export async function generateSessionReport(sessionId: string): Promise<ReportSummary> {
    const supabase = createAdminClient();

    // 1. Fetch Session and Persona Info
    const { data: session, error: sError } = await supabase
        .from('persona_sessions')
        .select(`
            *,
            persona_configs!inner (*)
        `)
        .eq('id', sessionId)
        .single();

    if (sError || !session) throw new Error('Session not found');

    // 2. Fetch Logs
    const { data: logs, error: lError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('step_number', { ascending: true });

    if (lError) throw new Error('Logs not found');

    const persona = session.persona_configs;

    // 3. Synthesize
    // In a real scenario, we might use LLM to summarize. 
    // For Phase 1, we'll do a basic aggregation.

    const journey = (logs || []).map(log => ({
        step: log.step_number,
        action: (log.action_taken as any)?.type || 'unknown',
        emotions: log.emotion_tag || 'neutral',
        monologue: log.inner_monologue || ''
    }));

    return {
        personaName: persona.name,
        goal: persona.goal_prompt,
        status: session.status as any,
        steps: logs?.length || 0,
        summary: session.exit_reason || 'Autonomous agent exploration completed.',
        keyFindings: logs?.filter(l => l.emotion_tag === 'frustration').map(l => `Frustration encountered at step ${l.step_number}: "${l.inner_monologue?.slice(0, 50)}..."`) || [],
        journey
    };
}
