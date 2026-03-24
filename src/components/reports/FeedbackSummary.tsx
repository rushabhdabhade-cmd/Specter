'use client';

import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, LabelList,
} from 'recharts';
import {
    TrendingUp, TrendingDown, Minus, Info, Sparkles
} from 'lucide-react';

interface FeedbackLog {
    step_number: number;
    emotion_tag: string;
    inner_monologue: string;
    action_taken?: {
        ux_feedback?: string;
        emotional_intensity?: number;
    };
}

interface FeedbackSummaryProps {
    logs: FeedbackLog[];
    summary?: string;
    id?: string;
}

const EMOTION_COLORS: Record<string, string> = {
    delight: '#10b981',
    satisfaction: '#34d399',
    curiosity: '#818cf8',
    surprise: '#fbbf24',
    neutral: '#475569',
    confusion: '#3b82f6',
    boredom: '#94a3b8',
    frustration: '#ef4444',
    disappointment: '#f87171',
};

import { EMOTION_WEIGHTS } from '@/lib/utils/scoring';

/* Extract significant words from feedback strings */
function topPhrases(logs: FeedbackLog[], limit = 8): { phrase: string; count: number; tag: string }[] {
    const STOPWORDS = new Set([
        'the', 'a', 'an', 'is', 'it', 'of', 'to', 'and', 'in', 'on', 'for',
        'with', 'this', 'that', 'i', 'me', 'my', 'we', 'our', 'not', 'but',
        'be', 'are', 'was', 'have', 'has', 'from', 'at', 'by', 'do', 'does',
        'its', 'their', 'if', 'more', 'also', 'just', 'they', 'or', 'so',
        'can', 'there', 'what', 'about', 'he', 'she', 'which', 'all', 'very',
        'much', 'into', 'up', 'out', 'would', 'could', 'should', 'than', 'too',
        'site', 'page', 'website', 'button', 'click', 'way', 'like', 'find',
        'still', 'trying', 'really', 'don\'t', 'didn\'t', 'doesn\'t', 'i\'m',
        'it\'s', 'make', 'made', 'see', 'one', 'no', 'any',
    ]);

    const freq: Record<string, { count: number; tags: string[] }> = {};

    logs.forEach(log => {
        let text: any = log.action_taken?.ux_feedback || '';
        if (!text || text === 'undefined') return;

        // If it's an object (happened in some LLM runs), try to extract 'overall' or just stringify
        if (typeof text === 'object') {
            text = text.overall || text.feedback || JSON.stringify(text);
        }

        if (typeof text !== 'string') return;

        const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
        // Use 2-gram and 1-gram
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (w.length < 4 || STOPWORDS.has(w)) continue;
            if (!freq[w]) freq[w] = { count: 0, tags: [] };
            freq[w].count++;
            if (!freq[w].tags.includes(log.emotion_tag)) freq[w].tags.push(log.emotion_tag);
        }
    });

    return Object.entries(freq)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([phrase, data]) => ({
            phrase,
            count: data.count,
            tag: data.tags.includes('frustration') ? 'frustration'
                : data.tags.includes('confusion') ? 'confusion'
                    : data.tags.includes('delight') ? 'delight' : 'neutral',
        }));
}


/* Custom tooltip for pie */
const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] p-3 shadow-xl text-xs font-bold" style={{ color: d.payload.fill }}>
            {d.name}: {d.value} steps ({d.payload.pct}%)
        </div>
    );
};

/* Custom tooltip for line chart */
const HealthTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const health = payload[0]?.value;
    const color = health > 70 ? '#10b981' : health > 40 ? '#f59e0b' : '#ef4444';
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] p-3 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">Step {label}</p>
            <p className="font-black" style={{ color }}>UX Health: {health}%</p>
        </div>
    );
};

const WaterfallTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const color = d.isPositive ? '#10b981' : '#ef4444';
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] p-3 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">Step {label} (Impact)</p>
            <p className="font-black" style={{ color }}>
                {d.isPositive ? '+' : '-'}{d.displayDelta} pts ({d.emotion})
            </p>
        </div>
    );
};

const ScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const isFriction = d.x > 0;
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] p-3 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">Step {d.step}: {d.name}</p>
            <p className="font-black" style={{ color: isFriction ? '#ef4444' : '#10b981' }}>
                {isFriction ? 'Friction' : 'Delight'}: {isFriction ? d.x : d.y}%
            </p>
        </div>
    );
};


export function FeedbackSummary({ logs, summary, id }: FeedbackSummaryProps) {
    // Emotion distribution for pie chart
    const emotionCounts = { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
    logs.forEach(l => { if (l.emotion_tag in emotionCounts) emotionCounts[l.emotion_tag as keyof typeof emotionCounts]++; });
    const total = logs.length || 1;
    const pieData = Object.entries(emotionCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            pct: Math.round((value / total) * 100),
            fill: EMOTION_COLORS[name as keyof typeof EMOTION_COLORS],
        }));

    // Sentiment Radar Data
    const sentimentGroups = ['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment'];
    const radarData = sentimentGroups.map(emo => {
        const matchingLogs = logs.filter(l => l.emotion_tag === emo);
        const count = matchingLogs.length;
        const avgIntensity = count > 0
            ? matchingLogs.reduce((acc, l) => {
                const i = l.action_taken?.emotional_intensity;
                const intensity = typeof i === 'number' && !isNaN(i) ? i : 0.5;
                return acc + intensity;
            }, 0) / count
            : 0;
        return {
            subject: emo.charAt(0).toUpperCase() + emo.slice(1),
            A: Math.round(avgIntensity * 100 * (count > 0 ? 1 : 0)), // Only show if count > 0
            fullMark: 100,
            color: EMOTION_COLORS[emo]
        };
    });

    // Waterfall Data (Score Drain)
    let waterfallScore = 100;
    const waterfallData = [...logs]
        .sort((a, b) => a.step_number - b.step_number)
        .map(l => {
            const w = EMOTION_WEIGHTS[l.emotion_tag];
            const weight = typeof w === 'number' ? w : 0;
            const i = l.action_taken?.emotional_intensity;
            const intensity = typeof i === 'number' && !isNaN(i) ? i : 0.5;
            const delta = weight * intensity;
            const prev = waterfallScore;
            waterfallScore = Math.max(0, Math.min(100, waterfallScore + delta));

            return {
                step: l.step_number,
                displayDelta: Math.abs(Math.round(delta)),
                isPositive: delta >= 0,
                // Waterfall logic: [start, end]
                value: delta >= 0 ? [prev, waterfallScore] : [waterfallScore, prev],
                emotion: l.emotion_tag
            };
        });

    // Cumulative Health score for Area chart
    let currentHealth = 100;
    const healthData = [...logs]
        .sort((a, b) => a.step_number - b.step_number)
        .map(l => {
            const w = EMOTION_WEIGHTS[l.emotion_tag];
            const weight = typeof w === 'number' ? w : 0;
            const i = l.action_taken?.emotional_intensity;
            const intensity = typeof i === 'number' && !isNaN(i) ? i : 0.5;
            const delta = weight * intensity;
            currentHealth = Math.max(0, Math.min(100, currentHealth + delta));
            return { step: l.step_number, health: Math.round(currentHealth), emotion: l.emotion_tag };
        });



    // Top UX feedback phrases
    const phrases = topPhrases(logs);

    // All UX feedback quotes (non-empty, deduplicated)
    const feedbackQuotes = Array.from(
        new Set(
            logs
                .map(l => l.action_taken?.ux_feedback)
                .filter((f): f is string => !!f && f !== 'undefined' && f.length > 10)
        )
    ).slice(0, 12);

    return (
        <div className="space-y-10">

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Radar chart */}
                <div className="lg:col-span-5 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">Sentiment Pulse</h3>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">Emotional intensity mapping</p>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }}
                                    tickLine={false}
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Pulse"
                                    dataKey="A"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="#6366f1"
                                    fillOpacity={0.35}
                                    dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>



                {/* Waterfall Impact chart */}
                <div className="lg:col-span-5 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">UX Health Impact (Waterfall)</h3>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">Step-by-step score contribution</p>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="step" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<WaterfallTooltip />} />
                                <Bar dataKey="value" strokeWidth={0}>
                                    {waterfallData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#ef4444'} opacity={0.8} />
                                    ))}
                                    <LabelList dataKey="displayDelta" position="top" style={{ fill: '#475569', fontSize: 9, fontWeight: 800 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Health Area chart */}
                <div className="lg:col-span-3 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">UX Health Journey</h3>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">Cumulative satisfaction trend</p>
                    </div>

                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={healthData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="healthColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis
                                    dataKey="step"
                                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<HealthTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="health"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#healthColor)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Min/max annotations */}
                <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 flex flex-col justify-center space-y-8">
                    {[
                        { label: 'Initial Health', value: '100', color: '#6366f1', sub: 'Baseline start' },
                        { label: 'Current Level', value: String(healthData[healthData.length - 1]?.health ?? 100), color: (healthData[healthData.length - 1]?.health ?? 100) > 70 ? '#10b981' : '#f59e0b', sub: 'Calculated Perception' },
                        { label: 'Worst Point', value: healthData.length > 0 ? String(Math.min(...healthData.map(d => d.health))) : '100', color: '#ef4444', sub: 'The "Peak" Friction' },
                    ].map(({ label, value, color, sub }) => (
                        <div key={label} className="border-l-2 pl-4" style={{ borderColor: color + '40' }}>
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black leading-none">{label}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <p className="text-3xl font-black" style={{ color }}>{value}%</p>
                                <p className="text-[10px] text-slate-500 font-bold">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* AI-Generated Feedback Summary — Concise Executive Insight */}
            {summary && (
                <div className="group relative rounded-3xl border border-indigo-500/10 bg-indigo-500/[0.02] p-8 overflow-hidden transition-all hover:bg-indigo-500/[0.04]">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <Sparkles className="h-20 w-20 text-indigo-400" />
                    </div>

                    <div className="relative flex items-center gap-3 mb-4">
                        <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">AI Observation Summary</h3>
                    </div>

                    <p className="relative z-10 text-lg md:text-xl font-medium text-slate-200 leading-relaxed tracking-tight italic">
                        &ldquo;{summary}&rdquo;
                    </p>
                </div>
            )}


            {/* All UX Feedback Quotes */}
            {feedbackQuotes.length > 0 && (
                <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">UX Feedback Log</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">All persona observations — unfiltered</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
                        {feedbackQuotes.map((quote, i) => {
                            // Find the matching log to get emotion
                            const matchedLog = logs.find(l => l.action_taken?.ux_feedback === quote);
                            const emotion = matchedLog?.emotion_tag || 'neutral';
                            const color = EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS];
                            return (
                                <div
                                    key={i}
                                    className="rounded-2xl p-4 border text-sm italic text-slate-200 leading-relaxed"
                                    style={{ borderColor: color + '25', background: color + '08' }}
                                >
                                    <span style={{ color }} className="not-italic font-black mr-1">&ldquo;</span>
                                    {quote}
                                    <span style={{ color }} className="not-italic font-black ml-1">&rdquo;</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
