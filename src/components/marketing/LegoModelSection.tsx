'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Target, Users, Clock, ShieldCheck, BrainCircuit, Activity, Code2, Sparkles } from 'lucide-react';

const TOTAL_FRAMES = 120;
function frameSrc(i: number) {
  return `/crawler/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;
}

const scrollState = { progress: 0, scrollY: 0 };

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

  const rotationState = useRef({
    base: 0,
    target: 0,
    isTransitioning: false,
  });

  useFrame(() => {
    if (groupRef.current) {
      const p = scrollState.progress;
      const scrollY = scrollState.scrollY || window.scrollY;

      if (p < 0.4) {
        groupRef.current.rotation.y = scrollY * 0.004;
        rotationState.current.isTransitioning = false;
      } else {
        if (!rotationState.current.isTransitioning) {
          rotationState.current.isTransitioning = true;
          rotationState.current.base = groupRef.current.rotation.y;
          const currentSpins = Math.floor(rotationState.current.base / (Math.PI * 2));
          // Target an odd multiple of PI so the model faces forward (180 degrees from its default back-facing orientation)
          // Adding 3 * PI ensures it always spins forward at least 180 degrees before stopping
          rotationState.current.target = (currentSpins * Math.PI * 2) + (Math.PI * 3);
        }

        // Complete the rotation transition almost instantly at the very start of moving left
        const transitionProgress = Math.min((p - 0.4) / 0.02, 1);
        const easeOut = 1 - Math.pow(1 - transitionProgress, 3);

        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          rotationState.current.base,
          rotationState.current.target,
          easeOut
        );
      }
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

  const stickyContainerRef = useRef<HTMLDivElement>(null);
  const bgCircleRef = useRef<HTMLDivElement>(null);

  // ── SEQUENCE CANVAS REFS ──
  const seqCanvasRef = useRef<HTMLCanvasElement>(null);
  const seqCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(TOTAL_FRAMES).fill(null));
  const loadedRef = useRef<boolean[]>(Array(TOTAL_FRAMES).fill(false));

  // ── sequence preload ──
  useEffect(() => {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      framesRef.current[i] = img;
      img.onload = () => {
        loadedRef.current[i] = true;
      };
      img.src = frameSrc(i);
    }
  }, []);

  // ── sequence draw logic ──
  const drawAt = (index: number) => {
    const ctx = seqCtxRef.current;
    const canvas = seqCanvasRef.current;
    if (!ctx || !canvas) return;

    let fi = index;
    if (!loadedRef.current[fi]) {
      for (let d = 1; d < 30; d++) {
        if (fi - d >= 0 && loadedRef.current[fi - d]) { fi = fi - d; break; }
        if (fi + d < TOTAL_FRAMES && loadedRef.current[fi + d]) { fi = fi + d; break; }
      }
    }
    const img = framesRef.current[fi];
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;
    const s = Math.max(cw / iw, ch / ih);

    // Create a subtle blue/navy tint overall by drawing the image
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
  };

  useEffect(() => {
    const canvas = seqCanvasRef.current;
    if (!canvas) return;
    seqCtxRef.current = canvas.getContext('2d');
    const resize = () => {
      // Get exact container dimensions for the canvas to draw crisply
      const parent = canvas.parentElement;
      if (parent) {
        // High DPI canvas support
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        seqCtxRef.current?.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !textRef.current || !canvasWrapperRef.current || !statsRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const scrollableDistance = Math.max(1, rect.height - windowHeight);
      const scrolledPast = -rect.top;
      const progress = Math.max(0, Math.min(scrolledPast / scrollableDistance, 1));

      scrollState.progress = progress;
      scrollState.scrollY = window.scrollY;

      // Phase 1 (0 -> 0.4): Move text left until offscreen
      const phase1 = Math.min(progress / 0.4, 1);
      textRef.current.style.transform = `translate3d(-${phase1 * 100}%, 0, 0)`;
      textRef.current.style.opacity = phase1 === 1 ? '0' : '0.6';

      // Phase 2 (0.4 -> 1.0): Translate model left, fade in Stats
      const phase2 = Math.max(0, (progress - 0.4) / 0.6);
      const easeOutMove = 1 - Math.pow(1 - phase2, 4);  // Quartic for translation
      const easeOutScale = 1 - Math.pow(1 - phase2, 2); // Quadratic for scale (smoother feeling)
      const easeOutGeneral = 1 - Math.pow(1 - phase2, 3); // Standard ease for rest

      const isDesktop = window.innerWidth >= 1024;

      if (isDesktop) {
        // Move model left seamlessly and make it slightly smaller with split ease curves
        canvasWrapperRef.current.style.transform = `translate3d(-${easeOutMove * 32}vw, 0, 0) scale(${1 - (easeOutScale * 0.15)})`;
      } else {
        // On mobile, just scale down slightly and push it up
        canvasWrapperRef.current.style.transform = `translate3d(0, -${easeOutGeneral * 20}vh, 0) scale(${1 - (easeOutGeneral * 0.2)})`;
      }

      // Fade in Stats block dynamically
      statsRef.current.style.opacity = easeOutGeneral.toString();
      statsRef.current.style.transform = `translate3d(0, ${40 - (easeOutGeneral * 40)}px, 0)`;
      // Sync Image Sequence (drawn when phase 2 is active)
      if (phase2 > 0) {
        const frameIndex = Math.min(
          TOTAL_FRAMES - 1,
          Math.max(0, Math.floor(phase2 * (TOTAL_FRAMES - 1)))
        );
        drawAt(frameIndex);
      } else {
        drawAt(0); // Before it enters, show frame 0
      }

      // Smoothly transition background color from #eef4fa (238, 244, 250) to #72b2cc (114, 178, 204)
      if (stickyContainerRef.current) {
        const r = 238 + phase2 * (114 - 238);
        const g = 244 + phase2 * (178 - 244);
        const b = 250 + phase2 * (204 - 250);
        stickyContainerRef.current.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      }

      // Expand a light-blue circle from behind the Lego model to cover the entire screen
      if (bgCircleRef.current) {
        // Start expanding aggressively as phase2 begins
        const circleProgress = Math.min(phase2 * 2.5, 1); // Fully expanded by phase2 = 0.4
        const circleEase = 1 - Math.pow(1 - circleProgress, 4); // Quartic ease out
        // Track the Lego model's leftward movement to keep the circle anchored behind it perfectly
        const leftOffset = isDesktop ? (easeOutMove * 32) : 0;
        bgCircleRef.current.style.transform = `translate(-50%, -50%) scale(${circleEase * 30})`;
        bgCircleRef.current.style.left = `calc(50% - ${leftOffset}vw)`;
        bgCircleRef.current.style.opacity = circleProgress > 0 ? '1' : '0';
      }

      // Animate Thought Bubbles (Fade in and stay visible)
      bubblesRef.current.forEach((bubble, i) => {
        if (!bubble) return;

        const popStart = 0.45 + (i * 0.1);
        const popEnd = popStart + 0.15;

        if (progress <= popStart) {
          bubble.style.opacity = '0';
          bubble.style.transform = 'scale(0.8) translateY(20px)';
        } else if (progress >= popEnd) {
          bubble.style.opacity = '1';
          bubble.style.transform = 'scale(1) translateY(0px)';
        } else {
          const normalized = (progress - popStart) / (popEnd - popStart);
          const easeOut = 1 - Math.pow(1 - normalized, 3);
          bubble.style.opacity = normalized.toString();
          bubble.style.transform = `scale(${0.8 + 0.2 * easeOut}) translateY(${20 - 20 * easeOut}px)`;
        }
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
    <section ref={containerRef} className="h-[400vh] relative">
      {/* Extended to 400vh to fit both the scroll text phase and the destination transition phase */}
      <div
        ref={stickyContainerRef}
        className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden border-t border-slate-200"
        style={{ backgroundColor: '#eef4fa' }}
      >

        {/* Animated Background Circle (Anchored completely behind ALL content) */}
        <div
          ref={bgCircleRef}
          className="absolute top-1/2 left-1/2 w-[10vw] h-[10vw] rounded-full bg-[#72b2cc] will-change-transform z-0 origin-center pointer-events-none"
          style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
        />

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
        <div ref={canvasWrapperRef} className="relative z-30 w-full h-full max-h-[800px] max-w-6xl px-6 flex flex-col items-center justify-center will-change-transform">

          {/* Animated Background Circle (Behind Lego Model, moves with it) */}
          <div
            ref={bgCircleRef}
            className="absolute top-1/2 left-1/2 w-[10vw] h-[10vw] rounded-full bg-[#72b2cc] will-change-transform z-0 origin-center pointer-events-none"
            style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
          />

          {/* ── FLOATING THOUGHT BUBBLES ── */}
          {[
            { icon: BrainCircuit, text: "Wait, where is the pricing?", top: '15%', left: '10%' },
            { icon: Sparkles, text: "Found it! Super intuitive UI.", top: '35%', right: '20%' },
            { icon: ShieldCheck, text: "Checkout finished in 20s!", bottom: '35%', left: '15%' },
            { icon: Target, text: "Friction Point: Confusion at Step 3", bottom: '25%', right: '15%' },
          ].map((bubble, i) => (
            <div
              key={i}
              ref={(el) => { if (el) bubblesRef.current[i] = el; }}
              className="absolute z-1000 hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-indigo-500/10 text-sm font-bold text-slate-700 pointer-events-none will-change-transform"
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

        <div
          ref={statsRef}
          className="absolute inset-y-0 right-0 z-40 flex flex-col justify-center w-full lg:w-[65vw] pointer-events-none h-full"
          style={{ opacity: 0 }}
        >
          {/* Canvas Wrapper - Full height right side */}
          <div className="absolute inset-0 w-full h-full">
            <canvas ref={seqCanvasRef} className="absolute inset-0 block w-full h-full" />

            {/* Very subtle gradient to ensure text readability if overlaid */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#72b2cc]/80 via-transparent to-transparent mix-blend-multiply" />
          </div>


        </div>

      </div>
    </section>
  );
}
