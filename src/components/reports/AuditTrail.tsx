'use client';

import { useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import { StepFeedbackCard } from './StepFeedbackCard';

interface AuditTrailProps {
  logs: any[];
  personaName: string;
}

export function AuditTrail({ logs, personaName }: AuditTrailProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-300">Step-by-step Audit</span>
          <span className="text-xs text-slate-600 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
            {logs.length} steps
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-white/5">
          {logs.map((log: any) => (
            <StepFeedbackCard key={log.id} step={log} personaName={personaName} />
          ))}
        </div>
      )}
    </div>
  );
}
