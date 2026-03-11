'use client';

import { useState } from 'react';
import { Share2, Download, Check, Loader2 } from 'lucide-react';

export function ReportActions() {
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.querySelector('.report-container');

            // Temporary styles for capture to ensure 100% fidelity
            if (element instanceof HTMLElement) {
                element.style.background = '#050505';
            }

            const opt = {
                margin: 0,
                filename: `specter-report-${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg' as const, quality: 1.0 },
                html2canvas: {
                    scale: 3, // Higher scale for ultra-sharp snapshot
                    useCORS: true,
                    letterRendering: true,
                    backgroundColor: '#050505',
                    logging: false,
                    windowWidth: 1280 // Ensure consistent layout capture
                },
                jsPDF: { unit: 'px' as const, format: 'a4' as const, orientation: 'portrait' as const, hotfixes: ['px_lines'] }
            };

            await html2pdf().set(opt).from(element).save();

            if (element instanceof HTMLElement) {
                element.style.background = ''; // Restore
            }
        } catch (err) {
            console.error('PDF Export failed:', err);
            // Fallback to native print if library fails
            window.print();
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-2 no-print">
            <button
                onClick={handleShare}
                className="flex h-11 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-6 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 min-w-[100px] justify-center"
            >
                {copied ? (
                    <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                    </>
                ) : (
                    <>
                        <Share2 className="h-4 w-4" /> Share
                    </>
                )}
            </button>
            <button
                disabled={isExporting}
                onClick={handleExport}
                className="flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5 min-w-[140px] justify-center disabled:opacity-50"
            >
                {isExporting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" /> Export PDF
                    </>
                )}
            </button>
        </div>
    );
}
