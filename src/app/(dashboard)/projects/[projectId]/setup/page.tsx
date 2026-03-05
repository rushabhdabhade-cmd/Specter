'use client';

import { useState } from 'react';
import { Globe, Zap, Plus, ChevronRight, Check, ArrowLeft, User as UserIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createTestRun } from '@/app/(dashboard)/projects/actions';

type Step = 1 | 2 | 3;

interface Persona {
  id: number;
  name: string;
  geolocation: string;
  ageRange: string;
  techLiteracy: string;
  domainFamiliarity: string;
  prompt: string;
}

export default function NewTestRunPage() {
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('https://yourapp.build');
  const [scope, setScope] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: 1,
      name: 'Skeptical Founder',
      geolocation: 'United States',
      ageRange: '25-40',
      techLiteracy: 'High (Power user / Dev)',
      domainFamiliarity: 'SaaS & DevTools',
      prompt: 'Looking for pricing first, skeptical of marketing claims.',
    },
  ]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(1);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const updatePersona = (id: number, field: keyof Persona, value: string) => {
    setPersonas(personas.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addPersona = () => {
    if (personas.length < 5) {
      const newId = Math.max(...personas.map((p) => p.id), 0) + 1;
      const newPersona: Persona = {
        id: newId,
        name: 'New Persona',
        geolocation: '',
        ageRange: '',
        techLiteracy: 'Medium',
        domainFamiliarity: '',
        prompt: '',
      };
      setPersonas([...personas, newPersona]);
      setSelectedPersonaId(newId);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      await createTestRun({
        url,
        scope,
        personas
      });
    } catch (err: any) {
      setError(err.message || 'Failed to launch test run. Please check your Supabase connection.');
      setIsLaunching(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex min-h-full flex-col items-center pt-8 pb-20 duration-700">
      {/* Progress Indicator */}
      <div className="relative mb-16 flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step >= 1 ? 'bg-white text-black' : 'border border-white/5 bg-[#151515] text-slate-600'
            }`}
        >
          1
        </div>
        <div
          className={`h-[2px] w-16 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-white/20' : 'bg-white/5'}`}
        />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step >= 2 ? 'bg-white text-black' : 'border border-white/5 bg-[#151515] text-slate-600'
            }`}
        >
          2
        </div>
        <div
          className={`h-[2px] w-16 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-white/20' : 'bg-white/5'}`}
        />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step >= 3 ? 'bg-white text-black' : 'border border-white/5 bg-[#151515] text-slate-600'
            }`}
        >
          <Check className="h-4 w-4" />
        </div>
      </div>

      {step === 1 && (
        <div className="flex w-full max-w-2xl flex-col items-center space-y-10 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">Where are we going?</h1>
            <p className="text-lg text-slate-400">
              Enter the URL of the web application you want Specter to explore.
            </p>
          </div>

          <div className="w-full space-y-8 rounded-[32px] border border-white/5 bg-[#0a0a0a] p-10 shadow-2xl">
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="h-4 w-4" />
                <span className="text-xs font-bold tracking-widest uppercase">Application URL</span>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-[#111111] p-5 text-lg text-white shadow-inner transition-all placeholder:text-slate-700 focus:border-white/10 focus:outline-none"
                placeholder="https://yourapp.build"
              />
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Testing Scope (Optional)
                </span>
              </div>
              <textarea
                rows={4}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full resize-none rounded-2xl border border-white/5 bg-[#111111] p-5 text-lg text-white shadow-inner transition-all placeholder:text-slate-700 focus:border-white/10 focus:outline-none"
                placeholder="e.g. Focus on the checkout flow, ignore the blog section."
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="group flex w-full items-center justify-center gap-3 rounded-[20px] border border-white/5 bg-[#222] py-6 font-bold text-white shadow-lg transition-all hover:bg-[#2a2a2a] active:scale-[0.98]"
            >
              Configure Persona Cohort
              <ChevronRight className="h-5 w-5 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex w-full max-w-5xl flex-col items-center space-y-10">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">Build your cohort</h1>
            <p className="text-lg text-slate-400">
              Define who will be testing your application. (Limit: 5 personas)
            </p>
          </div>

          <div className="flex w-full items-start gap-8">
            {/* Sidebar List */}
            <div className="sticky top-8 flex w-72 flex-col gap-4">
              <div className="px-1 text-xs font-bold tracking-widest text-slate-500 uppercase">
                Your Cohort
              </div>
              <div className="space-y-2">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${selectedPersonaId === p.id
                      ? 'border-white/10 bg-[#1a1a1a] text-white shadow-lg'
                      : 'border-white/5 bg-transparent text-slate-500 hover:border-white/10 hover:text-slate-300'
                      }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${selectedPersonaId === p.id
                        ? 'bg-white text-black'
                        : 'bg-[#151515] text-slate-600'
                        }`}
                    >
                      {p.id}
                    </span>
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                  </button>
                ))}

                {personas.length < 5 && (
                  <button
                    onClick={addPersona}
                    className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/5 p-4 text-slate-500 transition-all hover:border-white/10 hover:text-slate-300"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-bold tracking-tighter uppercase">
                      Add Persona
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="relative flex-1 space-y-8 overflow-hidden rounded-[32px] border border-white/5 bg-[#0a0a0a] p-10 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Modify Persona</h2>
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Details & Attributes
                  </p>
                </div>
                <div className="rounded border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">
                  ID: {selectedPersona.id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Persona Name
                  </label>
                  <input
                    type="text"
                    value={selectedPersona.name}
                    onChange={(e) => updatePersona(selectedPersona.id, 'name', e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Geolocation
                  </label>
                  <input
                    type="text"
                    value={selectedPersona.geolocation}
                    onChange={(e) =>
                      updatePersona(selectedPersona.id, 'geolocation', e.target.value)
                    }
                    className="w-full rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Age Range
                  </label>
                  <input
                    type="text"
                    value={selectedPersona.ageRange}
                    onChange={(e) => updatePersona(selectedPersona.id, 'ageRange', e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Technical Literacy
                  </label>
                  <input
                    type="text"
                    value={selectedPersona.techLiteracy}
                    onChange={(e) =>
                      updatePersona(selectedPersona.id, 'techLiteracy', e.target.value)
                    }
                    className="w-full rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Domain Familiarity
                  </label>
                  <input
                    type="text"
                    value={selectedPersona.domainFamiliarity}
                    onChange={(e) =>
                      updatePersona(selectedPersona.id, 'domainFamiliarity', e.target.value)
                    }
                    className="w-full rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Mindset / Prompt
                  </label>
                  <textarea
                    rows={5}
                    value={selectedPersona.prompt}
                    onChange={(e) => updatePersona(selectedPersona.id, 'prompt', e.target.value)}
                    className="w-full resize-none rounded-xl border border-white/5 bg-[#111111] p-4 text-white shadow-inner transition-all hover:border-white/10 focus:border-white/10 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 pt-10">
            {error && (
              <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            <div className="flex w-full gap-4">
              <button
                disabled={isLaunching}
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-[#0a0a0a] px-10 py-6 font-bold text-white shadow-lg transition-all hover:bg-white/5 disabled:opacity-50"
              >
                Back
              </button>
              <button
                disabled={isLaunching}
                onClick={handleLaunch}
                className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-6 font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all hover:bg-slate-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Launching Workers...
                  </>
                ) : (
                  <>
                    Confirm Cohort & Launch
                    <Zap className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
