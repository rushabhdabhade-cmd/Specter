import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Users, BrainCircuit, Target, UserCheck, Plus } from 'lucide-react';

export default async function PersonasPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    const { data: personas } = await supabase
        .from('persona_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return (
        <div className="animate-in fade-in space-y-8 duration-700">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">AI Personas</h1>
                    <p className="text-base text-slate-400 mt-1">
                        Simulated users that test your website. Each persona has a different goal and tech skill level.
                    </p>
                </div>

            </div>

            {/* ── Grid ── */}
            {personas && personas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personas.map((persona) => {
                        const literacy = persona.tech_literacy?.toLowerCase();
                        const accentColor = literacy === 'high' ? '#6366f1' : literacy === 'low' ? '#f59e0b' : '#10b981';
                        const literacyLabel = literacy === 'high' ? 'High' : literacy === 'low' ? 'Low' : 'Medium';

                        return (
                            <div
                                key={persona.id}
                                className="group relative flex flex-col rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all duration-300 hover:border-slate-600/60 hover:bg-slate-800/80 overflow-hidden"
                            >
                                {/* Top row: icon + created date */}
                                <div className="flex items-start justify-between mb-5">
                                    <div
                                        className="h-12 w-12 rounded-xl flex items-center justify-center border flex-shrink-0"
                                        style={{ background: accentColor + '15', borderColor: accentColor + '35' }}
                                    >
                                        <BrainCircuit className="h-6 w-6" style={{ color: accentColor }} />
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {new Date(persona.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                {/* Name */}
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
                                    {persona.name}
                                </h3>

                                {/* Goal */}
                                <div className="flex-1 mt-3 p-4 rounded-xl bg-slate-700/30 border border-slate-700/50">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Goal</p>
                                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                                        {persona.goal_prompt}
                                    </p>
                                </div>

                                {/* Meta row */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Target className="h-3 w-3 text-slate-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tech Level</span>
                                        </div>
                                        <span className="text-sm font-bold" style={{ color: accentColor }}>
                                            {literacyLabel}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <UserCheck className="h-3 w-3 text-slate-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Domain</span>
                                        </div>
                                        <span className="text-sm font-bold text-white truncate block">
                                            {persona.domain_familiarity || 'General'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Users className="h-7 w-7 text-indigo-400 opacity-60" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-base font-bold text-white">No personas yet</h3>
                        <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                            Create an AI persona to start testing your website with simulated users.
                        </p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-all">
                        <Plus className="h-4 w-4" />
                        Create your first persona
                    </button>
                </div>
            )}
        </div>
    );
}
