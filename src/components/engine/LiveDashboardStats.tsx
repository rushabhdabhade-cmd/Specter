'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Play, Clock } from 'lucide-react';

interface LiveDashboardStatsProps {
    initialStats: {
        projectsCount: number;
        runsCount: number;
        personasCount: number;
    };
    userId: string;
}

export function LiveDashboardStats({ initialStats, userId }: LiveDashboardStatsProps) {
    const [stats, setStats] = useState(initialStats);
    const supabase = createClient();

    useEffect(() => {
        // Subscribe to relevant tables to refresh stats
        // Note: Supabase Realtime 'postgres_changes' doesn't give counts directly, 
        // so we refetch counts when changes happen or just increment/decrement locally.
        // For precision, refetching is safer for aggregate stats.

        const fetchLatestStats = async () => {
            const { count: projectsCount } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const { count: runsCount } = await supabase
                .from('test_runs')
                .select('*, projects!inner(*)', { count: 'exact', head: true })
                .eq('projects.user_id', userId);

            const { count: personasCount } = await supabase
                .from('persona_sessions')
                .select('*, test_runs!inner(*, projects!inner(*))', { count: 'exact', head: true })
                .eq('test_runs.projects.user_id', userId);

            setStats({
                projectsCount: projectsCount || 0,
                runsCount: runsCount || 0,
                personasCount: personasCount || 0
            });
        };

        const projectsSub = supabase
            .channel('dashboard_projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` }, fetchLatestStats)
            .subscribe();

        const runsSub = supabase
            .channel('dashboard_runs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'test_runs' }, fetchLatestStats)
            .subscribe();

        const sessionsSub = supabase
            .channel('dashboard_sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persona_sessions' }, fetchLatestStats)
            .subscribe();

        return () => {
            supabase.removeChannel(projectsSub);
            supabase.removeChannel(runsSub);
            supabase.removeChannel(sessionsSub);
        };
    }, [userId, supabase]);

    const statConfig = [
        {
            label: 'Network Projects',
            value: stats.projectsCount.toString(),
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            trait: 'Architecture'
        },
        {
            label: 'Protocol Executions',
            value: stats.runsCount.toString(),
            icon: Play,
            color: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10',
            trait: 'Live Stream'
        },
        {
            label: 'Synthetic Cohorts',
            value: stats.personasCount.toString(),
            icon: Clock,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            trait: 'Behavioral'
        },
    ];

    return (
        <div className="grid gap-8 md:grid-cols-3">
            {statConfig.map((stat) => (
                <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-[40px] border border-white/5 bg-[#0a0a0a] p-10 transition-all duration-500 hover:border-white/10 hover:translate-y-[-4px]"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                {stat.label}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">
                                {stat.trait}
                            </span>
                        </div>
                        <div className={`h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${stat.color} transition-transform group-hover:scale-110`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <div className="text-6xl font-black tracking-tighter text-white">{stat.value}</div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-800">Units</span>
                    </div>

                    {/* Ambient Glow */}
                    <div
                        className={`absolute -right-10 -bottom-10 h-32 w-32 rounded-full ${stat.bgColor} opacity-0 blur-[60px] transition-opacity duration-1000 group-hover:opacity-100`}
                    />
                </div>
            ))}
        </div>
    );
}
