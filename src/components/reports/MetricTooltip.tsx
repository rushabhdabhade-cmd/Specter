'use client';

export function MetricTooltip({
    text,
    direction = 'up',
    align = 'center',
}: {
    text: string;
    direction?: 'up' | 'down' | 'left';
    align?: 'center' | 'left' | 'right';
}) {
    if (direction === 'left') {
        return (
            <div className="relative group/tip inline-flex items-center">
                <button className="h-3.5 w-3.5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[8px] font-bold text-slate-500 hover:bg-white/20 hover:text-slate-300 transition-all leading-none">
                    i
                </button>
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-56 rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-[11px] text-slate-200 leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl text-left">
                    {text}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-700" />
                </div>
            </div>
        );
    }

    const isDown = direction === 'down';
    const posX = align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';
    const arrowX = align === 'right' ? 'right-2' : align === 'left' ? 'left-2' : 'left-1/2 -translate-x-1/2';

    return (
        <div className="relative group/tip inline-flex items-center">
            <button className="h-3.5 w-3.5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[8px] font-bold text-slate-500 hover:bg-white/20 hover:text-slate-300 transition-all leading-none">
                i
            </button>
            <div className={`absolute ${isDown ? 'top-full mt-2' : 'bottom-full mb-2'} ${posX} w-56 rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-[11px] text-slate-200 leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl text-left`}>
                {text}
                <div className={`absolute ${arrowX} ${isDown ? 'bottom-full border-b-slate-700' : 'top-full border-t-slate-700'} border-4 border-transparent`} />
            </div>
        </div>
    );
}
