'use client';

import { useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import { StepFeedbackCard } from './StepFeedbackCard';

interface AuditTrailProps {
  logs: any[];
  personaName: string;
}

const EMOTION_COLORS: Record<string, string> = {
  delight:       '#10b981',
  satisfaction:  '#34d399',
  curiosity:     '#818cf8',
  surprise:      '#fbbf24',
  neutral:       '#64748b',
  confusion:     '#3b82f6',
  boredom:       '#94a3b8',
  frustration:   '#ef4444',
  disappointment:'#f87171',
};

export function AuditTrail({ logs, personaName }: AuditTrailProps) {
  const [open, setOpen]           = useState(false);
  const [activeFilter, setFilter] = useState<string>('all');

  // Unique emotions present in this session, preserving insertion order
  const emotions = Array.from(new Set(logs.map(l => l.emotion_tag).filter(Boolean)));

  const filtered = activeFilter === 'all'
    ? logs
    : logs.filter(l => l.emotion_tag === activeFilter);

  return (
    <div className="rounded-2xl border border-slate-700/50 overflow-hidden">

      {/* ── Header / toggle ── */}
      <button
        data-audit-trail={personaName}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-300">Step-by-step Audit</span>
          <span className="text-xs text-slate-500 bg-white/5 border border-slate-700/50 rounded-full px-2 py-0.5">
            {logs.length} steps
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-700/50 bg-slate-800/30">

          {/* ── Emotion filters ── */}
          {emotions.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
              {/* All */}
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  activeFilter === 'all'
                    ? 'bg-slate-600/60 border-slate-500 text-white'
                    : 'bg-white/[0.03] border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                All
                <span className="ml-1.5 opacity-60">{logs.length}</span>
              </button>

              {emotions.map(emo => {
                const color = EMOTION_COLORS[emo] || '#94a3b8';
                const count = logs.filter(l => l.emotion_tag === emo).length;
                const isActive = activeFilter === emo;
                return (
                  <button
                    key={emo}
                    onClick={() => setFilter(emo)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold capitalize border transition-all"
                    style={{
                      borderColor: isActive ? color + '80' : color + '25',
                      background:  isActive ? color + '20' : color + '08',
                      color:       isActive ? color        : '#64748b',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {emo}
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Steps ── */}
          <div className="px-4 pb-4 pt-2 space-y-4">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No steps match this filter.</p>
            ) : (
              filtered.map((log: any) => (
                <StepFeedbackCard key={log.id} step={log} personaName={personaName} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
