/**
 * Shared utility for calculating UX scores consistently across backend (reporter) 
 * and frontend (UI).
 */

export interface ScoringLog {
    emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight' | string;
}

export interface ScoringSession {
    status: 'completed' | 'abandoned' | 'error' | string;
    session_logs?: ScoringLog[];
}

export const SCORE_MODIFIERS = {
    FRUSTRATION: -10,
    CONFUSION: -5,
    DELIGHT: 2,
    ABANDONED_OR_ERROR: -30,
};

/**
 * Calculates a score (0-100) for a single session based on its logs and status.
 */
export function calculateSessionScore(session: ScoringSession): number {
    let score = 100;

    const logs = session.session_logs || [];
    logs.forEach((log) => {
        if (log.emotion_tag === 'frustration') score += SCORE_MODIFIERS.FRUSTRATION;
        else if (log.emotion_tag === 'confusion') score += SCORE_MODIFIERS.CONFUSION;
        else if (log.emotion_tag === 'delight') score += SCORE_MODIFIERS.DELIGHT;
    });

    if (session.status === 'abandoned' || session.status === 'error') {
        score += SCORE_MODIFIERS.ABANDONED_OR_ERROR;
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculates the average score across multiple sessions.
 */
export function calculateAverageScore(sessions: ScoringSession[]): number {
    if (!sessions || sessions.length === 0) return 0;

    const total = sessions.reduce((acc, s) => acc + calculateSessionScore(s), 0);
    return Math.round(total / sessions.length);
}
