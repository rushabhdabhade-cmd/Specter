'use client';

import { useEffect, useRef, useState } from 'react';
import { Flame, Globe, ChevronDown, ChevronUp } from 'lucide-react';

interface HeatmapStep {
    step_number: number;
    emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight';
    current_url: string;
    screenshot_url?: string;
    action_taken?: {
        type?: string;
        selector?: string;
    };
}

interface WebsiteHeatmapProps {
    steps: HeatmapStep[];
    dropOffStats?: Record<string, number>;
    totalSessions?: number;
}

// Deterministic position hash from a string seed
function selectorToPos(selector: string, salt: number, w: number, h: number) {
    let h1 = salt * 2654435761;
    for (let i = 0; i < selector.length; i++) h1 = ((h1 << 5) - h1 + selector.charCodeAt(i)) | 0;
    const u = Math.abs(h1 >>> 0);

    let h2 = u ^ 0xDEADBEEF;
    for (let i = 0; i < selector.length; i++) h2 = ((h2 << 5) - h2 + selector.charCodeAt(i + 1 || 0)) | 0;
    const v = Math.abs(h2 >>> 0);

    // Keep within central 80% of canvas so dots are on the content area
    return {
        x: Math.round(w * 0.1 + (u % (w * 0.8))),
        y: Math.round(h * 0.1 + (v % (h * 0.8))),
    };
}

const HEAT_RGBA: Record<string, [number, number, number]> = {
    frustration: [239, 68, 68],
    confusion: [59, 130, 246],
    delight: [16, 185, 129],
    neutral: [100, 116, 139],
};

interface HeatmapCanvasProps {
    steps: HeatmapStep[];
    width: number;
    height: number;
    showPotential?: boolean;
}

function HeatmapCanvas({ steps, width, height, showPotential = false }: HeatmapCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const clickSteps = steps.filter(
            s => s.action_taken?.type === 'click' || s.action_taken?.type === 'type'
        );

        // Pass 1: Draw potential clicks (Ambient heat map layer)
        if (showPotential) {
            steps.forEach(step => {
                const potentials = (step.action_taken as any)?.potential_clicks || [];
                potentials.forEach((click: any) => {
                    if (typeof click.x === 'number' && typeof click.y === 'number') {
                        const scale = width / 1280;
                        const px = Math.round(click.x * scale);
                        const py = Math.round(click.y * scale);
                        const radius = 20; // Ambient radius
                        const alphaWeight = 0.06; // Highly blendable

                        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
                        grad.addColorStop(0, `rgba(0,0,0,${alphaWeight})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');

                        ctx.beginPath();
                        ctx.arc(px, py, radius, 0, Math.PI * 2);
                        ctx.fillStyle = grad;
                        ctx.fill();
                    }
                });
            });
        }

        // Pass 2: Draw actual clicks
        clickSteps.forEach((step, i) => {
            const selector = step.action_taken?.selector || `step-${step.step_number}`;
            const coords = (step.action_taken as any)?.coordinates;

            let pos;
            if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
                const scale = width / 1280;
                pos = { x: Math.round(coords.x * scale), y: Math.round(coords.y * scale) };
            } else {
                pos = selectorToPos(selector, i, width, height);
            }

            // Frustration triggers bigger radius & higher weight
            const radius = step.emotion_tag === 'frustration' ? 65 : step.emotion_tag === 'confusion' ? 50 : 40;
            const alphaWeight = step.emotion_tag === 'frustration' ? 0.6 : step.emotion_tag === 'confusion' ? 0.45 : 0.35;

            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
            grad.addColorStop(0, `rgba(0,0,0,${alphaWeight})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        });

        // Pass 3: Colorize pixels based on total alpha accumulation
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3]; // Alpha accumulation
            if (alpha > 0) {
                let r = 0, g = 0, b = 0;
                if (alpha <= 64) {
                    b = 255; g = alpha * 4; r = 0;
                } else if (alpha <= 128) {
                    b = 255 - (alpha - 64) * 4; g = 255; r = 0;
                } else if (alpha <= 192) {
                    b = 0; g = 255; r = (alpha - 128) * 4;
                } else {
                    b = 0; g = 255 - (alpha - 192) * 4; r = 255;
                }

                pixels[i] = r;
                pixels[i + 1] = g;
                pixels[i + 2] = b;
                pixels[i + 3] = Math.min(220, alpha * 1.5); // Visual density scale
            }
        }
        ctx.putImageData(imgData, 0, 0);

        // Optional step markers
        ctx.font = 'bold 7px monospace';
        clickSteps.forEach((step, i) => {
            const coords = (step.action_taken as any)?.coordinates;
            const scale = width / 1280;
            const pos = coords?.x && typeof coords.x === 'number' ? { x: Math.round(coords.x * scale), y: Math.round(coords.y * scale) } : selectorToPos(step.action_taken?.selector || `step-${step.step_number}`, i, width, height);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });
    }, [steps, width, height, showPotential]);

    return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 w-full h-full" />;
}

interface PageGroup {
    url: string;
    steps: HeatmapStep[];
    screenshot?: string;
    frictionScore: number;
    totalClicks: number;
}

export function WebsiteHeatmap({ steps, dropOffStats = {}, totalSessions = 1 }: WebsiteHeatmapProps) {
    const [expandedPage, setExpandedPage] = useState<string | null>(null);
    const [showPotential, setShowPotential] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 });

    useEffect(() => {
        if (containerRef.current) {
            const w = containerRef.current.offsetWidth;
            setCanvasSize({ w, h: Math.round(w * 0.5625) }); // 16:9
        }
    }, [expandedPage]);

    // Group by URL
    const groups = Object.values(
        steps.reduce<Record<string, PageGroup>>((acc, step) => {
            const key = step.current_url || 'unknown';
            if (!acc[key]) {
                acc[key] = { url: key, steps: [], screenshot: undefined, frictionScore: 0, totalClicks: 0 };
            }
            acc[key].steps.push(step);
            if (!acc[key].screenshot && step.screenshot_url) acc[key].screenshot = step.screenshot_url;
            if (step.emotion_tag === 'frustration') acc[key].frictionScore += 20;
            else if (step.emotion_tag === 'confusion') acc[key].frictionScore += 10;
            if (step.action_taken?.type === 'click' || step.action_taken?.type === 'type') acc[key].totalClicks++;
            return acc;
        }, {})
    ).sort((a, b) => b.frictionScore - a.frictionScore);

    if (groups.length === 0) {
        return (
            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-12 flex items-center justify-center text-slate-700 text-xs uppercase tracking-widest font-bold">
                No interaction data
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groups.map(group => {
                const isOpen = expandedPage === group.url;
                const pathname = (() => { try { return new URL(group.url).pathname || '/'; } catch { return group.url; } })();
                const frictionPct = Math.min(100, group.frictionScore);
                const frictionColor = frictionPct === 0 ? '#10b981' : frictionPct < 30 ? '#f59e0b' : '#ef4444';

                const dropOffCount = dropOffStats[group.url] || 0;
                const dropOffPct = Math.round((dropOffCount / Math.max(1, totalSessions)) * 100);

                const emotionCounts = group.steps.reduce<Record<string, number>>((a, s) => {
                    a[s.emotion_tag] = (a[s.emotion_tag] || 0) + 1; return a;
                }, {});

                return (
                    <div key={group.url} className="rounded-3xl border border-white/5 bg-[#0a0a0a] overflow-hidden">

                        {/* Header bar */}
                        <button
                            onClick={() => setExpandedPage(isOpen ? null : group.url)}
                            className="w-full flex items-center gap-4 p-6 hover:bg-white/[0.02] transition-all text-left"
                        >
                            <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Globe className="h-5 w-5 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{pathname}</p>
                                <p className="text-[9px] text-slate-600 font-mono truncate mt-0.5">{group.url}</p>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 flex-shrink-0">
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Clicks</p>
                                    <p className="text-lg font-black text-white">{group.totalClicks}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Drop-off</p>
                                    <p className="text-lg font-black text-red-500">{dropOffPct}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Friction</p>
                                    <p className="text-lg font-black" style={{ color: frictionColor }}>{frictionPct}%</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {Object.entries(emotionCounts).map(([tag, count]) => {
                                        const rgb = HEAT_RGBA[tag as keyof typeof HEAT_RGBA] || HEAT_RGBA.neutral;
                                        return (
                                            <span
                                                key={tag}
                                                className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                                style={{ background: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)`, color: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }}
                                            >
                                                {tag.slice(0, 3)} {count}
                                            </span>
                                        );
                                    })}
                                </div>
                                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
                            </div>
                        </button>

                        {/* Expanded heatmap */}
                        {isOpen && (
                            <div ref={containerRef} className="border-t border-white/5 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                        <Flame className="h-3 w-3 text-orange-400" />
                                        Heat visualization — dot size and color reflect interaction intensity and emotion
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPotential(!showPotential);
                                        }}
                                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${showPotential
                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                                                : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                                            }`}
                                    >
                                        {showPotential ? 'Hide Potential' : 'Show Potential Clicks'}
                                    </button>
                                </div>

                                <div
                                    className="relative w-full rounded-2xl overflow-hidden border border-white/5 bg-[#080808] shadow-inner"
                                    style={{ height: canvasSize.h || 450 }}
                                >
                                    {/* Screenshot under-layer */}
                                    {group.screenshot ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={group.screenshot}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover object-top opacity-90 transition-opacity"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black" />
                                    )}

                                    {/* Dark gradient overlay to raise contrast if needed */}
                                    <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />

                                    {/* Heatmap canvas */}
                                    <HeatmapCanvas
                                        steps={group.steps}
                                        width={canvasSize.w}
                                        height={canvasSize.h}
                                        showPotential={showPotential}
                                    />
                                </div>

                                {/* Legend */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-bold text-slate-600">Density</span>
                                        <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-400 to-red-500 max-w-[200px]" />
                                        <span className="text-[9px] font-bold text-slate-600">High</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(HEAT_RGBA).map(([tag, rgb]) => (
                                            <div key={tag} className="flex items-center gap-1.5 opacity-60">
                                                <div className="h-2 w-2 rounded-full" style={{ background: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }} />
                                                <span className="text-[9px] font-bold text-slate-500 capitalize">{tag.slice(0, 3)}</span>
                                            </div>
                                        ))}
                                        <span className="text-[9px] text-slate-700 ml-2 border-l border-white/5 pl-2">White dots = step actions.</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
