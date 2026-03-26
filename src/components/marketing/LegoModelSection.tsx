'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Target, Users, Clock, ShieldCheck, BrainCircuit, Activity, Code2, Sparkles } from 'lucide-react';

function LegoModel() {
  const obj = useLoader(OBJLoader, '/lego-man/source/mrletsgo.obj');
  const [colorMap, normalMap, metalnessMap] = useLoader(THREE.TextureLoader, [
    '/lego-man/textures/mrletsgo_Albedo.tga.png',
    '/lego-man/textures/mrletsgo_Normal.tga.png',
    '/lego-man/textures/mrletsgo_Metallic.tga.png',
  ]);

  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    let cloned = obj.clone(true);
    colorMap.colorSpace = THREE.SRGBColorSpace;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          normalMap: normalMap,
          roughnessMap: metalnessMap,
          metalnessMap: metalnessMap,
          roughness: 0.8,
        });
      }
    });

    return cloned;
  }, [obj, colorMap, normalMap, metalnessMap]);

  useFrame(() => {
    if (groupRef.current) {
      // Rotate strictly based on page scroll position
      groupRef.current.rotation.y = window.scrollY * 0.004;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      <Center scale={1.2}>
        <primitive object={geometry} />
      </Center>
    </group>
  );
}

export default function LegoModelSection() {
  const containerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !textRef.current || !canvasWrapperRef.current || !statsRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const scrollableDistance = Math.max(1, rect.height - windowHeight);
      const scrolledPast = -rect.top;
      const progress = Math.max(0, Math.min(scrolledPast / scrollableDistance, 1));
      
      // Phase 1 (0 -> 0.4): Move text left until offscreen
      const phase1 = Math.min(progress / 0.4, 1);
      textRef.current.style.transform = `translate3d(-${phase1 * 100}%, 0, 0)`;
      textRef.current.style.opacity = phase1 === 1 ? '0' : '0.6';
      
      // Phase 2 (0.4 -> 1.0): Translate model left, fade in Stats
      const phase2 = Math.max(0, (progress - 0.4) / 0.6);
      const easeOut = 1 - Math.pow(1 - phase2, 3);
      
      const isDesktop = window.innerWidth >= 1024;
      
      if (isDesktop) {
        // Move model left seamlessly
        canvasWrapperRef.current.style.transform = `translate3d(-${easeOut * 25}vw, 0, 0)`;
      } else {
        // On mobile, just scale down slightly and push it up
        canvasWrapperRef.current.style.transform = `translate3d(0, -${easeOut * 20}vh, 0) scale(${1 - (easeOut * 0.2)})`;
      }
      
      // Fade in Stats block dynamically
      statsRef.current.style.opacity = easeOut.toString();
      statsRef.current.style.transform = `translate3d(0, ${40 - (easeOut * 40)}px, 0)`;
      statsRef.current.style.pointerEvents = phase2 > 0.8 ? 'auto' : 'none';

      // Animate Thought Bubbles (Shifted entirely to Phase 2)
      const intervals = [
        [0.42, 0.62],
        [0.52, 0.72],
        [0.65, 0.85],
        [0.78, 0.98]
      ];
      
      bubblesRef.current.forEach((bubble, i) => {
        if (!bubble) return;
        const [start, end] = intervals[i];
        if (progress < start || progress > end) {
          bubble.style.opacity = '0';
          bubble.style.transform = 'scale(0.8) translateY(20px)';
          return;
        }
        
        const normalized = (progress - start) / (end - start);
        const curve = Math.sin(normalized * Math.PI); 
        
        const opacity = Math.min(curve * 1.5, 1);
        const scale = 0.9 + (curve * 0.1);
        const yOffset = curve * -15;
        
        bubble.style.opacity = opacity.toString();
        bubble.style.transform = `scale(${scale}) translateY(${yOffset}px)`;
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll(); 
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <section ref={containerRef} className="h-[400vh] bg-[#eef4fa] relative">
      {/* Extended to 400vh to fit both the scroll text phase and the destination transition phase */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden border-t border-slate-200">
        
        {/* ── BACKGROUND SCROLL-SYNCED TEXT (Phase 1) ── */}
        <div className="absolute inset-0 flex items-center justify-start select-none z-0 overflow-hidden pointer-events-none">
          <div 
            ref={textRef}
            className="inline-block whitespace-nowrap text-[16vw] font-black tracking-tighter will-change-transform" 
            style={{ color: '#4f46e5', opacity: 0.6, paddingLeft: '100vw', wordSpacing: '4vw' }}
          >
            PERSONA GETTING READY TO ANALYZE
          </div>
        </div>

        {/* ── 3D CANVAS & THOUGHT BUBBLES ── */}
        <div ref={canvasWrapperRef} className="relative z-10 w-full h-full max-h-[800px] max-w-6xl px-6 flex flex-col items-center justify-center will-change-transform">
          
          {/* ── FLOATING THOUGHT BUBBLES ── */}
          {[
            { icon: BrainCircuit, text: "Scanning DOM tree...", top: '25%', left: '20%' },
            { icon: Activity, text: "Measuring layout shifts", top: '35%', right: '20%' },
            { icon: Code2, text: "Evaluating a11y labels", bottom: '35%', left: '15%' },
            { icon: Sparkles, text: "Friction identified", bottom: '25%', right: '15%' },
          ].map((bubble, i) => (
            <div
              key={i}
              ref={(el) => { if (el) bubblesRef.current[i] = el; }}
              className="absolute z-20 hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-indigo-500/10 text-sm font-bold text-slate-700 pointer-events-none will-change-transform"
              style={{
                top: bubble.top,
                bottom: bubble.bottom,
                left: bubble.left,
                right: bubble.right,
                opacity: 0,
                transform: 'scale(0.8) translateY(20px)'
              }}
            >
              <bubble.icon className="h-4 w-4 text-indigo-500" />
              {bubble.text}
            </div>
          ))}

          <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} className="cursor-grab active:cursor-grabbing w-full h-full">
            <ambientLight intensity={1.8} />
            <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" />
            <directionalLight position={[-10, 10, -5]} intensity={1} color="#6366f1" />
            <pointLight position={[0, -2, 2]} intensity={1.5} color="#0ea5e9" />

            <Suspense fallback={null}>
              <LegoModel />
              <Environment preset="city" />
              <ContactShadows position={[0, -1.8, 0]} opacity={0.3} scale={12} blur={2.5} far={4} color="#0f172a" />
            </Suspense>

            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        </div>

        {/* ── STATS SECTION (Fades in correctly right side in Phase 2) ── */}
        <div 
          ref={statsRef}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center lg:items-end lg:pr-[8vw] pointer-events-none will-change-transform"
          style={{ opacity: 0 }}
        >
          <div className="w-full px-6 lg:px-0 lg:w-[40vw] max-w-lg mt-32 lg:mt-0 space-y-12 shrink-0">
            
            <div className="text-center lg:text-left space-y-4">
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                AI users scaling<br/>like humans.
              </h3>
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                Specter identifies friction instantly across thousands of parallel sessions, providing you with actionable confidence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-center lg:text-left">
              {[
                { label: 'Issues found', value: '852k+', icon: Target },
                { label: 'AI users created', value: '42k+', icon: Users },
                { label: 'Testing hours saved', value: '125k', icon: Clock },
                { label: 'Accuracy rate', value: '99.4%', icon: ShieldCheck },
              ].map((stat, i) => (
                <div key={i} className="space-y-4 group cursor-default">
                  <div className="mx-auto lg:mx-0 h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-xl group-hover:shadow-indigo-500/25 transition-all shadow-sm">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-4xl font-black tracking-tighter text-slate-800">{stat.value}</p>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>

      </div>
    </section>
  );
}
