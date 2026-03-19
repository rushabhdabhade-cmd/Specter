'use client';

import { useState, useEffect } from 'react';
import { Globe, Zap, Plus, ChevronRight, Check, ArrowLeft, User as UserIcon, Users, Loader2, Sparkles, X, ChevronDown, ShoppingCart, Home, Settings, Target } from 'lucide-react';
import Link from 'next/link';
import { createTestRun, generateAIPersonas, suggestAudienceArchetypes } from '../../actions';
import { SAMPLE_PERSONAS } from '@/lib/constants/personas';
import type { Persona as SamplePersona } from '@/lib/constants/personas';

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

interface DynamicArchetype {
  id: string;
  icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
  desc: string;
}

const ICON_MAP: Record<string, any> = {
  users: Users,
  zap: Zap,
  user: UserIcon,
  check: Check,
  globe: Globe,
  x: X,
  'shopping-cart': ShoppingCart,
  home: Home,
  settings: Settings,
};

export default function NewTestRunPage() {
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState('');

  // Auth state
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'openrouter' | 'ollama'>('gemini');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

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

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStep, setAiStep] = useState<'pending' | 'editor'>('pending');

  // Auto-generate cohort when entering Step 2
  useEffect(() => {
    if (step === 2 && aiStep === 'pending' && !isAnalyzing && !isGenerating) {
      autoGenerateCohort();
    }
  }, [step]);

  const autoGenerateCohort = async () => {
    setIsAnalyzing(true);
    setIsGenerating(false);
    setError(null);
    try {
      // Phase 1: scan site and get archetypes (always cached per URL)
      const archetypes = await suggestAudienceArchetypes({
        url,
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
      });
      const archetypeIds = (archetypes as any[]).map((a: any) => a.id);

      // Phase 2: generate personas
      setIsAnalyzing(false);
      setIsGenerating(true);
      const generated = await generateAIPersonas({
        url,
        archetypes: archetypeIds,
        userPrompt: '',
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
      });
      setPersonas(generated as any);
      setSelectedPersonaId((generated as any)[0]?.id || 1);
      setAiStep('editor');
    } catch (err: any) {
      setError(err.message || 'Auto-generation failed. You can add personas manually below.');
      setAiStep('editor');
    } finally {
      setIsAnalyzing(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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

  const addFromLibrary = (sample: SamplePersona) => {
    if (personas.length < 5) {
      const newId = Math.max(...personas.map((p) => p.id), 0) + 1;
      const newPersona: Persona = {
        id: newId,
        name: sample.name,
        geolocation: sample.geolocation,
        ageRange: sample.ageRange,
        techLiteracy: sample.techLiteracy,
        domainFamiliarity: sample.domainFamiliarity,
        prompt: sample.prompt,
        personaCount: 1,
      };
      setPersonas([...personas, newPersona]);
      setSelectedPersonaId(newId);
      setShowLibrary(false);
    }
  };

  const removePersona = (id: number) => {
    if (personas.length > 1) {
      const updatedPersonas = personas.filter((p) => p.id !== id);
      setPersonas(updatedPersonas);
      if (selectedPersonaId === id) {
        setSelectedPersonaId(updatedPersonas[0].id);
      }
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
        executionMode: 'autonomous',
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
        credentials: requiresAuth ? { username, password } : undefined,
        personas
      });
    } catch (err: any) {
      if (err.message === 'NEXT_REDIRECT' || err.digest?.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
      setError(err.message || 'Failed to launch test run. Please check your Supabase connection.');
      setIsLaunching(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex min-h-full flex-col items-center pt-8 pb-20 duration-700">
      {/* Progress Indicator */}
      <div className="relative mb-24 flex w-full max-w-2xl items-center justify-between px-8">
        {/* Connection Lines */}
        <div className="absolute left-[12%] right-[12%] top-5 -z-10 h-[1px] bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />
        </div>

        {/* Step 1 */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black transition-all duration-500 ${step >= 1
              ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-110'
              : 'border border-white/5 bg-white/[0.02] text-slate-600'
              }`}
          >
            {step > 1 ? <Check className="h-5 w-5" strokeWidth={3} /> : '01'}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${step >= 1 ? 'text-white' : 'text-slate-600'}`}>Target Domain</span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black transition-all duration-500 ${step >= 2
              ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-110'
              : 'border border-white/5 bg-white/[0.02] text-slate-600'
              }`}
          >
            {step > 2 ? <Check className="h-5 w-5" strokeWidth={3} /> : '02'}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${step >= 2 ? 'text-white' : 'text-slate-600'}`}>Persona Cohort</span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black transition-all duration-500 ${step >= 3
              ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-110'
              : 'border border-white/5 bg-white/[0.02] text-slate-600'
              }`}
          >
            <Zap className={`h-5 w-5 ${step >= 3 ? 'fill-current' : ''}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${step >= 3 ? 'text-white' : 'text-slate-600'}`}>Deployment</span>
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

          <div className="w-full space-y-10 rounded-[48px] border border-white/5 bg-[#0a0a0a] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />

            <div className="space-y-6 text-left relative focus-within:translate-y-[-4px] transition-transform duration-500">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                  <Globe className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Primary Domain URL <span className="text-red-500/50 ml-1 font-bold">*</span></span>
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#111111] backdrop-blur-md border border-white/10 rounded-3xl p-6 text-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                placeholder="https://yourapp.build"
              />
            </div>

            <div className="space-y-6 text-left relative group/scope">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                  <Target className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Testing Scope & Constraints</span>
              </div>
              <textarea
                rows={4}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-[#111111] backdrop-blur-md border border-white/10 rounded-3xl p-6 text-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/30 transition-all resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                placeholder="e.g. Focus on user onboarding and payment flows, ignore the help center."
              />
            </div>

            {/* Credentials Section */}
            {/* <div className="space-y-6 text-left pt-2 border-t border-white/5">
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
            </div> */}


            {/* AI Engine Section */}
            <div className="space-y-5 text-left pt-2 border-t border-white/5">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                  <Zap className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Engine</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setLlmProvider('gemini'); setLlmApiKey(''); setLlmModelName(''); }}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left ${llmProvider === 'gemini' ? 'bg-white/5 border-white/20 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'}`}
                >
                  <span className="text-sm font-bold">Gemini</span>
                  <span className="text-[10px] opacity-60 leading-tight">Google Flash 2.0 · Free tier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLlmProvider('openrouter')}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left ${llmProvider === 'openrouter' ? 'bg-white/5 border-white/20 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'}`}
                >
                  <span className="text-sm font-bold">OpenRouter</span>
                  <span className="text-[10px] opacity-60 leading-tight">100+ vision models</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLlmProvider('ollama'); setLlmModelName(''); }}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left ${llmProvider === 'ollama' ? 'bg-white/5 border-white/20 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'}`}
                >
                  <span className="text-sm font-bold">Local</span>
                  <span className="text-[10px] opacity-60 leading-tight">Ollama · No API needed</span>
                </button>
              </div>

              {llmProvider === 'openrouter' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Model ID</label>
                      <a
                        href="https://openrouter.ai/models?fmt=cards&input_modalities=image"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-bold uppercase tracking-widest"
                      >
                        Browse vision models ↗
                      </a>
                    </div>
                    <input
                      type="text"
                      value={llmModelName}
                      onChange={(e) => setLlmModelName(e.target.value)}
                      placeholder="e.g. anthropic/claude-3-5-sonnet"
                      className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30 transition-all shadow-inner font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">OpenRouter API Key</label>
                    <input
                      type="password"
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder="sk-or-v1-••••••••••••••••••••••••••••••"
                      className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

            </div>

            <button
              onClick={() => {
                let targetUrl = url.trim();
                if (!targetUrl) {
                  setError('Application URL is required.');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                // Add protocol if missing
                if (!targetUrl.startsWith('http')) {
                  targetUrl = `https://${targetUrl}`;
                }

                try {
                  const parsed = new URL(targetUrl);
                  if (!parsed.hostname.includes('.')) {
                    throw new Error('Invalid hostname');
                  }
                  setUrl(parsed.href); // Save the normalized URL (ensures consistent cache keys)
                } catch (e) {
                  setError('Please enter a valid URL (e.g., https://example.com)');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                if (llmProvider === 'openrouter') {
                  if (!llmModelName.trim()) {
                    setError('Please enter a model ID for OpenRouter (e.g. anthropic/claude-3-5-sonnet).');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  if (!llmApiKey.trim()) {
                    setError('Please enter your OpenRouter API key.');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                }

                setStep(2);
              }}
              className="relative w-full py-8 mt-4 rounded-[32px] bg-white text-black font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-[0_20px_40px_-12px_rgba(255,255,255,0.3)] group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Configure Persona Cohort</span>
              <ChevronRight className="relative h-5 w-5 group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-5xl flex flex-col items-center space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">Build your cohort</h1>
            <p className="text-slate-400 text-lg">
              {isAnalyzing || isGenerating ? 'Specter is scanning your site and generating personas...' : 'Review and refine the AI-generated personas. (Limit: 5)'}
            </p>
          </div>

          {(isAnalyzing || isGenerating) ? (
            <div className="w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-[32px] p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-white/20" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-white animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tighter">
                    {isAnalyzing ? 'Scanning your site...' : 'Crafting your cohort...'}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {isAnalyzing
                      ? `Analyzing ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} to understand your audience`
                      : 'Generating personas based on your site context'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full pt-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                ← Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="w-full flex gap-8 items-start">
                {/* Sidebar List */}
                <div className="w-72 flex flex-col gap-4 sticky top-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Your Cohort</div>
                  <div className="space-y-2">
                    {personas.map((p, idx) => (
                      <div key={p.id} className="group relative">
                        <button
                          onClick={() => setSelectedPersonaId(p.id)}
                          className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${selectedPersonaId === p.id
                            ? 'bg-[#1a1a1a] border-white/10 text-white shadow-lg'
                            : 'bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                            }`}
                        >
                          <span className={`min-w-[24px] h-6 px-1 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${selectedPersonaId === p.id ? 'bg-white text-black' : 'bg-[#151515] text-slate-600'
                            }`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm truncate">{p.name}</span>
                        </button>
                        {personas.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePersona(p.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="pt-2 space-y-2">
                      <button
                        onClick={() => setShowLibrary(true)}
                        className="w-full p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 flex flex-col items-center justify-center gap-2 group transition-all"
                      >
                        <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Browse Library</span>
                      </button>

                      {personas.length < 5 && (
                        <button
                          onClick={addPersona}
                          className="w-full p-4 rounded-xl border border-dashed border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Add Persona</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => { setAiStep('pending'); autoGenerateCohort(true); }}
                    className="w-full py-4 text-indigo-500/60 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors"
                  >
                    ↺ Regenerate Cohort
                  </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[32px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">Refine Category</h2>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Mindset & Attributes</p>
                    </div>
                    <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-white/5 uppercase">
                      ID: {selectedPersona.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-left">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category Name</label>
                      <input
                        type="text"
                        value={selectedPersona.name}
                        onChange={(e) => updatePersona(selectedPersona.id, 'name', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Geolocation</label>
                      <input
                        type="text"
                        value={selectedPersona.geolocation}
                        placeholder="e.g. United States / Region"
                        onChange={(e) => updatePersona(selectedPersona.id, 'geolocation', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Age Range</label>
                      <input
                        type="text"
                        value={selectedPersona.ageRange}
                        placeholder="e.g. 22-35"
                        onChange={(e) => updatePersona(selectedPersona.id, 'ageRange', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Technical Literacy</label>
                      <select
                        value={selectedPersona.techLiteracy}
                        onChange={(e) => updatePersona(selectedPersona.id, 'techLiteracy', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner appearance-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cohort Size</label>
                        <span className="text-[8px] text-slate-600 font-bold uppercase">Parallel Explorers</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selectedPersona.personaCount}
                          onChange={(e) => updatePersona(selectedPersona.id, 'personaCount', parseInt(e.target.value) || 1)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner"
                        />
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/5">
                          <Users className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Domain Familiarity</label>
                      <input
                        type="text"
                        value={selectedPersona.domainFamiliarity}
                        placeholder="e.g. Familiar with SaaS tools"
                        onChange={(e) => updatePersona(selectedPersona.id, 'domainFamiliarity', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all shadow-inner"
                      />
                    </div>
                    <div className="col-span-2 space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mindset / Prompt</label>
                      <textarea
                        rows={5}
                        value={selectedPersona.prompt}
                        placeholder="e.g. Skeptical budget-cutter looking for pricing first"
                        onChange={(e) => updatePersona(selectedPersona.id, 'prompt', e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 hover:border-white/20 transition-all resize-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-4 pt-2">
                {error && (
                  <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled={isLaunching}
                    onClick={() => { setStep(1); setAiStep('pending'); setError(null); }}
                    className="px-10 py-6 rounded-2xl bg-[#0a0a0a] border border-white/5 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={isLaunching}
                    onClick={handleLaunch}
                    className="py-6 rounded-2xl bg-white text-black font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.1)] group disabled:bg-slate-300 disabled:cursor-not-allowed"
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
            </>
          )}
        </div>
      )}

      {/* Persona Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Persona Library</h2>
                  <p className="text-xs text-slate-500 font-medium">Ready-to-use personas with distinct behaviors & expertise.</p>
                </div>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SAMPLE_PERSONAS.map((sample) => (
                  <div
                    key={sample.id}
                    className="group p-6 rounded-[28px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all cursor-pointer relative"
                    onClick={() => addFromLibrary(sample)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{sample.name}</h3>
                        <p className="text-[10px] text-slate-400 font-medium">{sample.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                        ${sample.techLiteracy === 'High' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                          sample.techLiteracy === 'Low' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                        {sample.techLiteracy} Literacy
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-slate-600" />
                        <span className="text-[10px] text-slate-400 font-medium">{sample.geolocation}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-700" />
                        <span className="text-[10px] text-slate-400 font-medium">{sample.ageRange} years</span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300 leading-relaxed italic">
                        &ldquo;{sample.prompt.slice(0, 120)}...&rdquo;
                      </div>
                    </div>

                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 bg-[#080808] text-center">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Select a persona to add it to your testing cohort
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
