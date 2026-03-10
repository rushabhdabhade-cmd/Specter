'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { triggerReportRefresh } from '@/app/actions/reports';
import { useRouter } from 'next/navigation';

export function RefreshButton({ testRunId }: { testRunId: string }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const router = useRouter();

    const handleRefresh = async (force: boolean) => {
        if (force) setIsRegenerating(true); else setIsRefreshing(true);
        try {
            const result = await triggerReportRefresh(testRunId, force);
            if (result.success) {
                router.refresh();
            } else {
                alert('Failed: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsRefreshing(false);
            setIsRegenerating(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Normal refresh — just reloads DB data, no AI call */}
            <button
                onClick={() => handleRefresh(false)}
                disabled={isRefreshing || isRegenerating}
                title="Reload latest session data (no AI call)"
                className="flex h-11 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-5 text-xs font-bold text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Force AI regeneration — explicitly re-runs the LLM */}
            <button
                onClick={() => handleRefresh(true)}
                disabled={isRefreshing || isRegenerating}
                title="Force re-generate AI Strategic Conclusion (uses LLM tokens)"
                className="flex h-11 items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
            >
                <Sparkles className={`h-4 w-4 ${isRegenerating ? 'animate-pulse' : ''}`} />
                {isRegenerating ? 'Synthesizing...' : 'Regenerate AI'}
            </button>
        </div>
    );
}
