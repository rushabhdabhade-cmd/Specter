'use client';

import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine
} from 'recharts';
import {
    TrendingUp, TrendingDown, Minus, Info, Sparkles
} from 'lucide-react';

interface FeedbackLog {
    step_number: number;
    emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight';
    inner_monologue: string;
    action_taken?: { ux_feedback?: string };
}

interface FeedbackSummaryProps {
    logs: FeedbackLog[];
    summary?: string;
}

const EMOTION_COLORS = {
    delight: '#10b981',
    neutral: '#475569',
    confusion: '#3b82f6',
    frustration: '#ef4444',
};

const SCORE_MAP = { delight: 2, neutral: 0, confusion: -5, frustration: -10 };

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
        const text = log.action_taken?.ux_feedback || '';
        if (!text || text === 'undefined') return;

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
const LineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const score = payload[0]?.value;
    const color = score > 0 ? '#10b981' : score < -5 ? '#ef4444' : '#f59e0b';
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] p-3 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">Step {label}</p>
            <p className="font-black" style={{ color }}>Score: {score > 0 ? '+' : ''}{score}</p>
        </div>
    );
};

export function FeedbackSummary({ logs, summary }: FeedbackSummaryProps) {
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

    // Cumulative score over steps for line chart
    let cumulativeScore = 100;
    const lineData = [...logs]
        .sort((a, b) => a.step_number - b.step_number)
        .map(l => {
            const delta = SCORE_MAP[l.emotion_tag] ?? 0;
            cumulativeScore = Math.max(0, Math.min(100, cumulativeScore + delta));
            return { step: l.step_number, score: cumulativeScore, emotion: l.emotion_tag };
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

                {/* Donut chart */}
                <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">Emotion Distribution</h3>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">Across all steps</p>
                    </div>

                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={50} outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} opacity={0.9} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2">
                        {pieData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{d.name}</p>
                                    <p className="text-[9px] text-slate-600">{d.pct}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Line chart */}
                <div className="lg:col-span-3 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white">UX Score Over Journey</h3>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">Cumulative score trend</p>
                    </div>

                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
                                <Tooltip content={<LineTooltip />} />
                                <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="url(#scoreGradient)"
                                    strokeWidth={2.5}
                                    dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        const color = EMOTION_COLORS[payload.emotion as keyof typeof EMOTION_COLORS] || '#475569';
                                        return <circle key={props.key} cx={cx} cy={cy} r={3.5} fill={color} stroke="none" />;
                                    }}
                                />
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Min/max annotations */}
                    <div className="flex gap-6">
                        {[
                            { label: 'Start Score', value: '100', color: '#6366f1' },
                            { label: 'Final Score', value: String(lineData[lineData.length - 1]?.score ?? 100), color: '#10b981' },
                            { label: 'Drop', value: String(100 - (lineData[lineData.length - 1]?.score ?? 100)), color: '#ef4444' },
                        ].map(({ label, value, color }) => (
                            <div key={label}>
                                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">{label}</p>
                                <p className="text-xl font-black mt-0.5" style={{ color }}>{value}</p>
                            </div>
                        ))}
                    </div>
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
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">All persona observations — unfiltered</p>
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
                                    className="rounded-2xl p-4 border text-sm italic text-slate-300 leading-relaxed"
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
