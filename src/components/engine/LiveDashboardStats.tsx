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
            label: 'Active Projects',
            value: stats.projectsCount.toString(),
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            label: 'Total Test Runs',
            value: stats.runsCount.toString(),
            icon: Play,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            label: 'Personas Deployed',
            value: stats.personasCount.toString(),
            icon: Clock,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
        },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {statConfig.map((stat) => (
                <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] p-8 transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-white/[0.02]"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400 transition-colors group-hover:text-slate-300">
                            {stat.label}
                        </span>
                        <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-white">{stat.value}</div>

                    <div
                        className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${stat.bgColor} opacity-0 blur-[50px] transition-opacity duration-700 group-hover:opacity-100`}
                    />
                </div>
            ))}
        </div>
    );
}
