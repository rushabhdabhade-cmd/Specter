import { Plus, CheckCircle2, Play, Clock, Zap } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        {
            label: 'Active Projects',
            value: '1',
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10'
        },
        {
            label: 'Total Test Runs',
            value: '1',
            icon: Play,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            label: 'Personas Deployed',
            value: '1',
            icon: Clock,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10'
        },
    ];

    const recentRuns = [
        {
            url: 'https://google.com',
            date: '5/3/2026',
            status: 'QUEUED',
            statusColor: 'bg-red-500',
        }
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                    <p className="text-slate-500 font-medium">
                        Welcome back. Here's what's happening with your synthetic users.
                    </p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <Plus className="h-4 w-4" />
                    New Test Run
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] p-8 transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-white/[0.02]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                                {stat.label}
                            </span>
                            <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
                        </div>
                        <div className="text-4xl font-bold text-white tracking-tight">
                            {stat.value}
                        </div>

                        {/* Subtle Gradient Glow */}
                        <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${stat.bgColor} blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white tracking-tight">Recent Test Runs</h2>

                <div className="space-y-3">
                    {recentRuns.map((run) => (
                        <div
                            key={run.url}
                            className="group flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f0f0f] p-5 transition-all hover:border-white/10 hover:bg-[#121212] px-6"
                        >
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className={`h-2.5 w-2.5 rounded-full ${run.statusColor} shadow-[0_0_10px_rgba(239,68,68,0.5)]`} />
                                    <div className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${run.statusColor} animate-ping opacity-20`} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                        {run.url}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                                        {run.date}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold tracking-tighter text-red-500 border border-red-500/20">
                                    {run.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State Hint if many items were missing */}
            <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.01] p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                    <Zap className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Ready for more?</p>
                    <p className="text-xs text-slate-500 max-w-[200px]">Configure your personas to start analyzing your user journey.</p>
                </div>
            </div>
        </div>
    );
}
