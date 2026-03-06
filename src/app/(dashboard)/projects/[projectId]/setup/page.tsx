'use client';

import { useState } from 'react';
import { Globe, Zap, Plus, ChevronRight, Check, ArrowLeft, User as UserIcon, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createTestRun } from '../../actions';

type Step = 1 | 2 | 3;

interface Persona {
  id: number;
  name: string;
  geolocation: string;
  ageRange: string;
  techLiteracy: string;
  domainFamiliarity: string;
  prompt: string;
  personaCount: number;
}

export default function NewTestRunPage() {
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('https://yourapp.build');
  const [scope, setScope] = useState('');

  // Auth state
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [executionMode, setExecutionMode] = useState<'autonomous' | 'manual'>('autonomous');

  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: 1,
      name: 'Skeptical Founder',
      geolocation: 'United States',
      ageRange: '25-40',
      techLiteracy: 'High',
      domainFamiliarity: 'SaaS & DevTools',
      prompt: 'Looking for pricing first, skeptical of marketing claims.',
      personaCount: 1,
    },
  ]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(1);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const updatePersona = (id: number, field: keyof Persona, value: string | number) => {
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
        personaCount: 1,
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
        requiresAuth,
        executionMode,
        credentials: requiresAuth ? { username, password } : undefined,
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
      <div className="relative mb-20 flex w-full max-w-xl items-center justify-between px-4">
        {/* Connection Lines */}
        <div className="absolute left-[10%] top-5 -z-10 h-[2px] w-[80%] bg-white/5">
          <div
            className="h-full bg-white/40 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />
        </div>

        {/* Step 1 */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${step >= 1
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110'
              : 'border border-white/10 bg-[#0a0a0a] text-slate-500'
              }`}
          >
            {step > 1 ? <Check className="h-5 w-5" /> : '1'}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${step >= 1 ? 'text-white' : 'text-slate-600'}`}>Target</span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${step >= 2
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110'
              : 'border border-white/10 bg-[#0a0a0a] text-slate-500'
              }`}
          >
            {step > 2 ? <Check className="h-5 w-5" /> : '2'}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${step >= 2 ? 'text-white' : 'text-slate-600'}`}>Cohort</span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${step >= 3
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110'
              : 'border border-white/10 bg-[#0a0a0a] text-slate-500'
              }`}
          >
            <Zap className={`h-5 w-5 ${step >= 3 ? 'fill-current' : ''}`} />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${step >= 3 ? 'text-white' : 'text-slate-600'}`}>Launch</span>
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
                <span className="text-xs font-bold uppercase tracking-widest">Application URL</span>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#111111] border border-white/5 rounded-2xl p-5 text-lg text-white placeholder:text-slate-700 focus:outline-none focus:border-white/10 transition-all shadow-inner"
                placeholder="https://yourapp.build"
              />
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Testing Scope (Optional)</span>
              </div>
              <textarea
                rows={4}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-[#111111] border border-white/5 rounded-2xl p-5 text-lg text-white placeholder:text-slate-700 focus:outline-none focus:border-white/10 transition-all resize-none shadow-inner"
                placeholder="e.g. Focus on the checkout flow, ignore the blog section."
              />
            </div>

            {/* Credentials Section */}
            <div className="space-y-6 text-left pt-2 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Access Control</span>
                </div>
                <p className="text-sm text-slate-500">
                  Does this application require a login to access certain pages or features?
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setRequiresAuth(false)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${!requiresAuth
                    ? 'bg-white/5 border-white/20 text-white shadow-lg'
                    : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10'
                    }`}
                >
                  <span className="text-sm font-bold">Public App</span>
                  <span className="text-[10px] uppercase opacity-60">No login required</span>
                </button>
                <button
                  onClick={() => setRequiresAuth(true)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${requiresAuth
                    ? 'bg-white/5 border-white/20 text-white shadow-lg'
                    : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10'
                    }`}
                >
                  <span className="text-sm font-bold">Protected App</span>
                  <span className="text-[10px] uppercase opacity-60">Credentials needed</span>
                </button>
              </div>

              {requiresAuth && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-medium">
                      Specter will use these credentials to bypass the login wall during testing.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Username / Email</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-white/10 transition-all shadow-inner"
                        placeholder="test@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-white/10 transition-all shadow-inner"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Execution Strategy Section */}
            <div className="space-y-6 text-left pt-6 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Execution Strategy</span>
                </div>
                <p className="text-sm text-slate-500">
                  Choose how Specter explores your application.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setExecutionMode('autonomous')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${executionMode === 'autonomous'
                    ? 'bg-white/5 border-white/20 text-white shadow-lg'
                    : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10'
                    }`}
                >
                  <Zap className={`h-5 w-5 ${executionMode === 'autonomous' ? 'fill-current' : ''}`} />
                  <span className="text-sm font-bold">Autonomous</span>
                  <span className="text-[10px] uppercase opacity-60">Hands-free testing</span>
                </button>
                <button
                  onClick={() => setExecutionMode('manual')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${executionMode === 'manual'
                    ? 'bg-white/5 border-white/20 text-white shadow-lg'
                    : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10'
                    }`}
                >
                  <div className="flex h-5 w-5 items-center justify-center">
                    <div className="h-4 w-4 border-2 border-current rounded-sm" />
                  </div>
                  <span className="text-sm font-bold">Manual Step</span>
                  <span className="text-[10px] uppercase opacity-60">Approve every action</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-6 rounded-[20px] bg-[#000] hover:bg-[#2a2a2a] text-white font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg group border border-white/5"
            >
              Configure Persona Cohort
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-5xl flex flex-col items-center space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">Build your cohort</h1>
            <p className="text-slate-400 text-lg">Define who will be testing your application. (Limit: 5 personas)</p>
          </div>

          <div className="w-full flex gap-8 items-start">
            {/* Sidebar List */}
            <div className="w-72 flex flex-col gap-4 sticky top-8">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Your Cohort</div>
              <div className="space-y-2">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${selectedPersonaId === p.id
                      ? 'bg-[#1a1a1a] border-white/10 text-white shadow-lg'
                      : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                      }`}
                  >
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${selectedPersonaId === p.id ? 'bg-white text-black' : 'bg-[#151515] text-slate-600'
                      }`}>
                      {p.id}
                    </span>
                    <span className="font-semibold text-sm truncate">{p.name}</span>
                  </button>
                ))}

                {personas.length < 5 && (
                  <button
                    onClick={addPersona}
                    className="w-full p-4 rounded-xl border border-dashed border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300 flex flex-col items-center justify-center gap-2 group transition-all"
                  >
                    <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Add Persona</span>
                  </button>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[32px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Modify Persona</h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Details & Attributes</p>
                </div>
                <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-white/5 uppercase">
                  ID: {selectedPersona.id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Persona Name</label>
                  <input
                    type="text"
                    value={selectedPersona.name}
                    onChange={(e) => updatePersona(selectedPersona.id, 'name', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Geolocation</label>
                  <input
                    type="text"
                    value={selectedPersona.geolocation}
                    placeholder="e.g. United States / Region"
                    onChange={(e) => updatePersona(selectedPersona.id, 'geolocation', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Age Range</label>
                  <input
                    type="text"
                    value={selectedPersona.ageRange}
                    placeholder="e.g. 22-35"
                    onChange={(e) => updatePersona(selectedPersona.id, 'ageRange', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Technical Literacy</label>
                  <select
                    value={selectedPersona.techLiteracy}
                    onChange={(e) => updatePersona(selectedPersona.id, 'techLiteracy', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Number of Users</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={selectedPersona.personaCount}
                      onChange={(e) => updatePersona(selectedPersona.id, 'personaCount', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/5">
                      <Users className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Domain Familiarity</label>
                  <input
                    type="text"
                    value={selectedPersona.domainFamiliarity}
                    placeholder="e.g. Familiar with SaaS tools"
                    onChange={(e) => updatePersona(selectedPersona.id, 'domainFamiliarity', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all shadow-inner"
                  />
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mindset / Prompt</label>
                  <textarea
                    rows={5}
                    value={selectedPersona.prompt}
                    placeholder="e.g. Skeptical budget-cutter looking for pricing first"
                    onChange={(e) => updatePersona(selectedPersona.id, 'prompt', e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-white/10 hover:border-white/10 transition-all resize-none shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-4 pt-10">
            {error && (
              <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            <div className="flex w-full gap-4">
              <button
                disabled={isLaunching}
                onClick={() => setStep(1)}
                className="px-10 py-6 rounded-2xl bg-[#0a0a0a] border border-white/5 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                Back
              </button>
              <button
                disabled={isLaunching}
                onClick={handleLaunch}
                className="flex-1 py-6 rounded-2xl bg-white text-black font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.1)] group disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Launching Workers...
                  </>
                ) : (
                  <>
                    Confirm Cohort & Launch
                    <Zap className="h-4 w-4 fill-current group-hover:scale-110 transition-transform" />
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
