'use client';

import { useState } from 'react';
import { Square, Loader2 } from 'lucide-react';
import { stopTestRun } from '@/app/(dashboard)/test-runs/actions';
import { useRouter } from 'next/navigation';

interface StopButtonProps {
    runId: string;
    status: string;
}

export function StopButton({ runId, status }: StopButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isRunning = status === 'running' || status === 'pending';
    if (!isRunning) return null;

    const handleStop = async () => {
        if (!confirm('Are you sure you want to stop this test? This will terminate all active sessions and generate a partial report.')) return;

        setLoading(true);
        try {
            await stopTestRun(runId);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to stop test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleStop}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 text-sm font-bold transition-all border border-red-500/20 active:scale-95"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Square className="h-3 w-3 fill-current" />
            )}
            {loading ? 'Stopping...' : 'Stop Test'}
        </button>
    );
}
