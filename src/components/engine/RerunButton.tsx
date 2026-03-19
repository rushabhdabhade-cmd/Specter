'use client';

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { rerunTestRun } from '@/app/(dashboard)/test-runs/actions';

interface RerunButtonProps {
    runId: string;
}

export function RerunButton({ runId }: RerunButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleRerun = async () => {
        if (!confirm('Are you sure you want to rerun this test cohort? This will create a fresh set of sessions.')) return;

        setLoading(true);
        try {
            await rerunTestRun(runId);
        } catch (err: any) {
            if (err.message === 'NEXT_REDIRECT' || err.message?.includes('NEXT_REDIRECT')) {
                return;
            }
            console.error(err);
            alert('Failed to rerun test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRerun}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 border border-white/10"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Initializing Rerun...' : 'Rerun Cohort'}
        </button>
    );
}
