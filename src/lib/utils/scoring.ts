/**
 * Shared utility for calculating UX scores consistently across backend (reporter) 
 * and frontend (UI).
 */

export interface ScoringLog {
    emotion_tag: 'delight' | 'satisfaction' | 'curiosity' | 'surprise' | 'neutral' | 'confusion' | 'boredom' | 'frustration' | 'disappointment' | string;
    action_taken?: {
        emotional_intensity?: number;
        heuristic_finding?: string | null;
        technical_metrics?: {
            latency_ms?: number;
            has_errors?: boolean;
        };
    };
}

export interface ScoringSession {
    status: 'completed' | 'abandoned' | 'error' | string;
    session_logs?: ScoringLog[];
    persona?: {
        tech_literacy: 'low' | 'medium' | 'high';
    };
}

export const EMOTION_WEIGHTS: Record<string, number> = {
    delight: 15,
    satisfaction: 6,
    curiosity: 4,
    surprise: 8,
    neutral: 0,
    confusion: -10,
    boredom: -6,
    frustration: -20,
    disappointment: -12,
};

export interface DetailedScore {
    mainScore: number;
    emotionScores: Record<string, number>;
}

/**
 * Calculates a robust UX health score (0-100).
 * Implements Recovery Bonuses, Stagnation Penalties, and Intensity-Weighted Impact.
 */
export function calculateSessionScore(session: ScoringSession): DetailedScore {
    const logs = session.session_logs || [];
    if (logs.length === 0) {
        return { mainScore: 100, emotionScores: {} };
    }

    let totalWeight = 0;
    const counts: Record<string, number> = {};

    logs.forEach(log => {
        const emotion = log.emotion_tag || 'neutral';
        const weight = EMOTION_WEIGHTS[emotion] || 0;
        
        const i_val = log.action_taken?.emotional_intensity;
        const intensity = typeof i_val === 'number' && !isNaN(i_val)
            ? (i_val > 1 ? i_val / 1000 : Math.max(0, Math.min(1, i_val)))
            : 0.5;

        totalWeight += weight * intensity;
        counts[emotion] = (counts[emotion] || 0) + 1;
    });

    const totalSteps = logs.length;
    const averageWeight = totalSteps > 0 ? totalWeight / totalSteps : 0;

    // Map AverageWeight to 0-100 score
    // MinWeight = -20 (frustration), MaxWeight = 15 (delight)
    // Neutral (0) -> 80
    let mainScore = 80;
    if (averageWeight >= 0) {
        // 0 -> 80, 15 -> 100
        mainScore = 80 + (averageWeight / 15) * 20;
    } else {
        // 0 -> 80, -20 -> 0
        // averageWeight is negative, so (averageWeight / 20) is negative
        mainScore = 80 + (averageWeight / 20) * 80;
    }

    mainScore = Math.max(0, Math.min(100, Math.round(mainScore)));

    // Calculate percentage-of-steps for each emotion for UI display
    const emotionScores: Record<string, number> = {};
    for (const [emotion, count] of Object.entries(counts)) {
        emotionScores[emotion] = Math.round((count / totalSteps) * 100);
    }

    return {
        mainScore,
        emotionScores
    };
}

/**
 * Calculates the average score across multiple sessions.
 */
export function calculateAverageScore(sessions: ScoringSession[]): number {
    if (!sessions || sessions.length === 0) return 0;

    const total = sessions.reduce((acc, s) => acc + calculateSessionScore(s).mainScore, 0);
    return Math.round(total / sessions.length);
}
