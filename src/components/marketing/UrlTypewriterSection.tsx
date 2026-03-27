'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, Wand2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

const URLS = [
  'www.airbnb.com',
  'www.notion.so',
  'www.linear.app',
  'www.uber.com',
  'www.figma.com',
  'www.stripe.com'
];

export default function UrlTypewriterSection() {
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: false, margin: '-10% 0px' });
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Typewriter effect
  useEffect(() => {
    if (subIndex === URLS[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 2000);
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % URLS.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 50 : 100, parseInt(Math.random() * 150 + '')));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse]);

  // Cursor blink
  useEffect(() => {
    const timeout2 = setTimeout(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

  return (
    <section className="relative py-20 flex flex-col items-center justify-center bg-[#f8fafc] overflow-hidden">
      {/* Animated Curved SVG Line */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0" />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#7dd3fc" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Main wavy path: enters top-center, curves left then right then exits bottom-center */}
        <motion.path
          d="M 500 -20 C 500 80, 280 120, 320 200 C 360 280, 680 300, 660 390 C 640 460, 420 480, 500 620"
          stroke="url(#lineGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />
        {/* Glowing dot that travels along the path */}
        <motion.circle
          r="4"
          fill="#38bdf8"
          filter="url(#dotGlow)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <animateMotion
            dur="2.2s"
            begin={inView ? '0.1s' : 'indefinite'}
            fill="freeze"
            path="M 500 -20 C 500 80, 280 120, 320 200 C 360 280, 680 300, 660 390 C 640 460, 420 480, 500 620"
          />
        </motion.circle>
        <defs>
          <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl w-full px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl mb-10 md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#0f172a] to-[#312e81] leading-[1.2] py-2">
            Test Your Product.
          </h2>

        </motion.div>

        {/* Premium Browser Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="relative group mx-auto max-w-3xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

          <div className="relative flex items-center bg-white/70 border border-white/50 rounded-[2rem] p-2 md:p-3 overflow-hidden">
            {/* World Icon - added translate-y-[1px] for optical centering with bold text */}
            <div className="flex-shrink-0 ml-4 mr-3 text-slate-400 group-hover:text-indigo-500 transition-colors translate-y-[1px]">
              <Globe className="h-5 w-5 md:h-6 md:w-6" />
            </div>

            {/* URL Input Area (Mock) */}
            <div className="flex-grow text-left py-2 md:py-3 px-1 flex items-center overflow-hidden">
              <span className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight flex items-center leading-none">
                https://{URLS[index].substring(0, subIndex)}
                <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity inline-block w-0.5 h-5 md:h-7 bg-indigo-500 ml-1`} />
              </span>
            </div>

            {/* Scan Button */}
            <button className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 md:py-4 px-6 md:px-10 rounded-[1.5rem] shadow-lg shadow-indigo-600/20 transition-all active:scale-95 group/btn overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              <span className="hidden sm:inline">Start Analysis</span>
              <Wand2 className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
            </button>
          </div>


        </motion.div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
