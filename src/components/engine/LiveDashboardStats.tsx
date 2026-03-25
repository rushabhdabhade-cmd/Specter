'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FolderOpen, FlaskConical, Users } from 'lucide-react';

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
            label: 'Projects',
            sub: 'Websites being tested',
            value: stats.projectsCount,
            icon: FolderOpen,
            color: '#6366f1',
        },
        {
            label: 'Test Runs',
            sub: 'Total tests executed',
            value: stats.runsCount,
            icon: FlaskConical,
            color: '#10b981',
        },
        {
            label: 'AI Personas',
            sub: 'Simulated users run',
            value: stats.personasCount,
            icon: Users,
            color: '#f59e0b',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {statConfig.map((stat) => (
                <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all duration-300 hover:border-slate-600/60 hover:bg-slate-800/80"
                >
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm font-bold text-white">{stat.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                        </div>
                        <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: stat.color + '18', border: `1px solid ${stat.color}30` }}
                        >
                            <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                        </div>
                    </div>

                    <div className="text-4xl font-black tracking-tight" style={{ color: stat.color }}>
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
