import { Cpu } from 'lucide-react';

export default function DashboardLoading() {
    return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center space-y-12 animate-in fade-in duration-1000">
            <div className="relative">
                <div className="absolute inset-0 h-24 w-24 animate-ping rounded-[32px] bg-indigo-500/10 duration-[3000ms]" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/10 bg-[#0a0a0a] backdrop-blur-3xl shadow-[0_0_50px_rgba(99,102,241,0.1)] transition-transform hover:scale-105">
                    <Cpu className="h-10 w-10 text-indigo-400 animate-pulse" />
                </div>
            </div>

            <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-400">
                        Loading...
                    </p>
                    <p className="text-xs text-slate-500">
                        Fetching your data
                    </p>
                </div>
            </div>
        </div>
    );
}
