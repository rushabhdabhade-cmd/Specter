/**
 * Shared utility for calculating UX scores consistently across backend (reporter) 
 * and frontend (UI).
 */

export interface ScoringLog {
    emotion_tag: 'delight' | 'satisfaction' | 'curiosity' | 'surprise' | 'neutral' | 'confusion' | 'boredom' | 'frustration' | 'disappointment' | string;
    action_taken?: {
        emotional_intensity?: number;
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

/**
 * Calculates a robust UX health score (0-100).
 * Implements Recovery Bonuses, Stagnation Penalties, and Intensity-Weighted Impact.
 */
export function calculateSessionScore(session: ScoringSession): number {
    let currentScore = 100;
    let minScore = 100;
    let lowPointsInRow = 0;

    const logs = session.session_logs || [];
    if (logs.length === 0) return 100;

    const literacyMultiplier = session.persona?.tech_literacy === 'low' ? 1.4 : session.persona?.tech_literacy === 'high' ? 0.8 : 1.0;

    logs.forEach((log, i) => {
        const weight = EMOTION_WEIGHTS[log.emotion_tag] || 0;
        const intensity = log.action_taken?.emotional_intensity ?? 0.5;

        // Base Impact
        let impact = weight * intensity * literacyMultiplier;

        // Recovery Bonus: If the user was frustrated but is now curious/delighted, give an extra lift.
        const prevLog = logs[i - 1];
        if (prevLog && impact > 0) {
            const prevWeight = EMOTION_WEIGHTS[prevLog.emotion_tag] || 0;
            if (prevWeight < 0) {
                impact *= 1.5; // 50% recovery bonus
            }
        }

        currentScore = Math.max(0, Math.min(100, currentScore + impact));

        // Stagnation Penalty: If score stays below 40 for too long, accelerate decay.
        if (currentScore < 40) {
            lowPointsInRow++;
            if (lowPointsInRow > 2) {
                currentScore = Math.max(0, currentScore - (lowPointsInRow * 2));
            }
        } else {
            lowPointsInRow = 0;
        }

        if (currentScore < minScore) minScore = currentScore;
    });

    if (session.status === 'abandoned' || session.status === 'error') {
        currentScore = Math.max(0, currentScore - 25);
        if (currentScore < minScore) minScore = currentScore;
    }

    // Perceived score is the average of the "Peak" (lowest) and "End" (current)
    const finalScore = (minScore + currentScore) / 2;
    return Math.round(finalScore);
}

/**
 * Calculates the average score across multiple sessions.
 */
export function calculateAverageScore(sessions: ScoringSession[]): number {
    if (!sessions || sessions.length === 0) return 0;

    const total = sessions.reduce((acc, s) => acc + calculateSessionScore(s), 0);
    return Math.round(total / sessions.length);
}
