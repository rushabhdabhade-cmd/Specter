import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Users, Search, Filter, MoreHorizontal, UserCheck, BrainCircuit, Target } from 'lucide-react';

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
        <div className="animate-in fade-in space-y-10 duration-700">
            {/* Header */}
            <div className="flex flex-col space-y-6 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Persona Library</h1>
                    <p className="font-medium text-slate-500">
                        Define and manage synthetic user blueprints for your test cohorts.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group max-w-xs">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search blueprints..."
                            className="h-11 w-[300px] rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                        />
                    </div>
                    <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
                        <Filter className="h-4.5 w-4.5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personas && personas.length > 0 ? (
                    personas.map((persona) => (
                        <div
                            key={persona.id}
                            className="group relative flex flex-col rounded-[28px] border border-white/5 bg-[#0d0d0d] p-6 transition-all hover:border-white/10 hover:bg-[#111111] hover:shadow-2xl hover:shadow-white/[0.01]"
                        >
                            <div className="mb-6 flex items-start justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/5 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                                    <BrainCircuit className="h-7 w-7" />
                                </div>
                                <button className="h-10 w-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-white/5 hover:text-white transition-all">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {persona.name}
                                    </h3>
                                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                                        Target Goal
                                    </p>
                                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-400 italic">
                                        "{persona.goal_prompt}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Target className="h-3 w-3" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Literacy</span>
                                        </div>
                                        <span className={`text-[11px] font-bold uppercase ${persona.tech_literacy === 'high' ? 'text-emerald-400' :
                                                persona.tech_literacy === 'low' ? 'text-amber-400' : 'text-blue-400'
                                            }`}>
                                            {persona.tech_literacy}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <UserCheck className="h-3 w-3" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Familiarity</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-white uppercase truncate block">
                                            {persona.domain_familiarity || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-[10px] font-medium text-slate-600">
                                    Created {new Date(persona.created_at).toLocaleDateString()}
                                </div>
                                <button className="rounded-xl bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold text-slate-400 transition-all hover:bg-white/5 hover:text-white">
                                    Use Blueprint
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[40px] border border-dashed border-white/5 bg-white/[0.01] py-32 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-slate-700 mb-8 border border-white/5">
                            <Users className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Your library is empty</h3>
                        <p className="max-w-[360px] text-sm text-slate-500 leading-relaxed mb-10">
                            Blueprints store persona traits so you can deploy consistent synthetic users across multiple test cohorts.
                        </p>
                        <button className="bg-white/5 border border-white/10 px-8 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-2xl">
                            Create First Blueprint
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
