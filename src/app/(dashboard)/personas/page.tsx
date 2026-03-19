import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Users, Search, Filter, MoreHorizontal, UserCheck, BrainCircuit, Target, Sparkles, Plus, ArrowRight } from 'lucide-react';

export default async function PersonasPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    // Fetch all personas for the user
    const { data: personas } = await supabase
        .from('persona_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return (
        <div className="animate-in fade-in space-y-20 duration-1000">
            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <div className="flex flex-col space-y-8 md:flex-row md:items-end md:justify-between md:space-y-0">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        Human Simulation Library
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">Persona <br /> <span className="italic opacity-50">Synthesis.</span></h1>
                    <p className="max-w-md text-sm font-medium text-slate-500 italic leading-relaxed">
                        Design and manage the psychological blueprints that drive your synthetic cohorts.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter Blueprints..."
                            className="h-14 w-full md:w-72 rounded-2xl border border-white/5 bg-[#0a0a0a] pl-12 pr-6 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-slate-700 focus:border-indigo-500/50 focus:outline-none focus:bg-white/[0.02] transition-all"
                        />
                    </div>
                    <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-[#0a0a0a] text-slate-500 hover:text-white transition-all hover:bg-white/5">
                        <Plus className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* ── BLUEPRINT GRID ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {personas && personas.length > 0 ? (
                    personas.map((persona) => (
                        <div
                            key={persona.id}
                            className="group relative flex flex-col rounded-[48px] border border-white/5 bg-[#0a0a0a] p-10 transition-all duration-500 hover:border-white/10 hover:translate-y-[-4px] overflow-hidden"
                        >
                            {/* Accent Glow */}
                            <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20 ${persona.tech_literacy === 'high' ? 'bg-indigo-500' :
                                    persona.tech_literacy === 'low' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />

                            <div className="mb-10 flex items-start justify-between relative z-10">
                                <div className={`flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 transition-all group-hover:scale-110 ${persona.tech_literacy === 'high' ? 'text-indigo-400' :
                                        persona.tech_literacy === 'low' ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                    <BrainCircuit className="h-10 w-10" />
                                </div>
                                <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    ID: {persona.id.slice(0, 8)}
                                </div>
                            </div>

                            <div className="space-y-8 flex-1 relative z-10">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                                        {persona.name}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">Behavioral Archetype</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-800" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v1.0</span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Primary Objective</p>
                                    <p className="line-clamp-3 text-sm font-medium leading-relaxed text-slate-400 italic">
                                        &ldquo;{persona.goal_prompt}&rdquo;
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-8 pt-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Target className="h-3.5 w-3.5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Cognitive Literacy</span>
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest ${persona.tech_literacy === 'high' ? 'text-indigo-400' :
                                            persona.tech_literacy === 'low' ? 'text-amber-400' : 'text-emerald-400'
                                            }`}>
                                            {persona.tech_literacy}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <UserCheck className="h-3.5 w-3.5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Domain Intent</span>
                                        </div>
                                        <span className="text-xs font-black text-white uppercase truncate block tracking-widest">
                                            {persona.domain_familiarity || 'General'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8 relative z-10">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700 italic">
                                    Synced {new Date(persona.created_at).toLocaleDateString()}
                                </span>
                                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white hover:translate-x-1 transition-all">
                                    Launch Module <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[64px] border border-white/10 bg-white/[0.01] p-32 text-center">
                        <div className="relative mb-12">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl animate-pulse" />
                            <div className="relative h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-slate-700">
                                <Users className="h-10 w-10 opacity-30" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white italic mb-4">Library Empty</h3>
                        <p className="max-w-[320px] mx-auto text-sm font-medium text-slate-600 italic leading-relaxed mb-12">
                            Specter requires synthesized human blueprints to orchestrate cohorts. Design your first persona to begin.
                        </p>
                        <button className="flex items-center gap-4 rounded-2xl bg-white px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] active:scale-95">
                            <Plus className="h-5 w-5" />
                            Create New Synthesis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
