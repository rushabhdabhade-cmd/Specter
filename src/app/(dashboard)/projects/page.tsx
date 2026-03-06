import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Globe, Plus, ArrowRight, ExternalLink, Settings2, BarChart3 } from 'lucide-react';

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await createClient();

  // Fetch all projects for the user
  const { data: projectsRaw } = await supabase
    .from('projects')
    .select(`
      *,
      test_runs (
        count
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const projects = (projectsRaw || []).map((p: any) => ({
    ...p,
    testRunsCount: p.test_runs?.[0]?.count || 0,
  }));

  return (
    <div className="animate-in fade-in space-y-10 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Your Projects</h1>
          <p className="font-medium text-slate-500">
            Manage the web applications and authentication environments under test.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </Link>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col rounded-[32px] border border-white/5 bg-[#0d0d0d] p-8 transition-all hover:border-white/10 hover:bg-[#111111] hover:shadow-2xl"
            >
              <div className="mb-8 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                  <Globe className="h-7 w-7" />
                </div>
                <button className="h-10 w-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-white/5 hover:text-white transition-all">
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 mb-8">
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 text-slate-500">
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-xs font-medium truncate max-w-[200px]">{project.target_url}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Test Runs</p>
                  <p className="text-lg font-bold text-white">{project.testRunsCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Engine</p>
                  <p className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">{project.llm_provider || 'ollama'}</p>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3">
                <Link
                  href={`/dashboard`} // Projects detail page to be built
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-xs font-bold text-white hover:bg-white/10 transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Overview
                </Link>
                <Link
                  href={`/projects/${project.id}/setup`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white text-black py-3 text-xs font-bold transition-all hover:bg-slate-200"
                >
                  New Run
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[40px] border border-dashed border-white/5 bg-white/[0.01] py-32 text-center">
            <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center text-slate-700 mb-8 border border-white/5">
              <Globe className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No projects yet</h3>
            <p className="max-w-[320px] text-sm text-slate-500 leading-relaxed mb-10">
              Add your first web application to start deploying autonomous synthetic testing cohorts.
            </p>
            <Link
              href="/projects/new/setup"
              className="bg-white px-8 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all shadow-xl shadow-white/5"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
