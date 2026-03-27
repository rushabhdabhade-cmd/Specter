'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Target, ShieldCheck, BrainCircuit, Sparkles } from 'lucide-react';

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
    target: 0,
    isTransitioning: false,
    faceTarget: 0,
    faceBase: 0,
    isFaceTargetSet: false,
  });

  useFrame(() => {
    if (groupRef.current) {
      const p = scrollState.progress;
      const scrollY = scrollState.scrollY || window.scrollY;

      if (p < 0.33) {
        // Stage 1: Free rotation with scroll
        groupRef.current.rotation.y = scrollY * 0.004;
        rotationState.current.isTransitioning = false;
        rotationState.current.isFaceTargetSet = false;
      } else if (p < 0.66) {
        // Stage 2: Freeze at landing rotation
        if (!rotationState.current.isTransitioning) {
          rotationState.current.isTransitioning = true;
          rotationState.current.target = groupRef.current.rotation.y;
        }
        groupRef.current.rotation.y = rotationState.current.target;
      } else {
        // Stage 3: Smoothly rotate to face the user (odd multiple of PI)
        if (!rotationState.current.isFaceTargetSet) {
          rotationState.current.isFaceTargetSet = true;
          const currentY = groupRef.current.rotation.y;
          const currentSpins = Math.floor(currentY / (Math.PI * 2));
          // Target an odd multiple of PI to ensure it faces forward (standard orientation + 180 deg)
          rotationState.current.faceTarget = (currentSpins * Math.PI * 2) + (Math.PI * 3);
          rotationState.current.faceBase = currentY;
        }

        const s3Progress = Math.min((p - 0.66) / 0.1, 1); // Done by 76% scroll
        const ease = 1 - Math.pow(1 - s3Progress, 3);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          rotationState.current.faceBase,
          rotationState.current.faceTarget,
          ease
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
  const stickyContainerRef = useRef<HTMLDivElement>(null);

  // Stage Containers
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);

  // Logic Refs
  const textRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const bgCircleRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);
  const seqCanvasRef = useRef<HTMLCanvasElement>(null);
  const seqCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(TOTAL_FRAMES).fill(null));
  const loadedRef = useRef<boolean[]>(Array(TOTAL_FRAMES).fill(false));

  // Sequence Preload
  useEffect(() => {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      framesRef.current[i] = img;
      img.onload = () => { loadedRef.current[i] = true; };
      img.src = frameSrc(i);
    }
  }, []);

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
    
    // Restore full "cover" fit to fill the entire screen as requested
    const s = Math.max(cw / iw, ch / ih); 

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
  };

  useEffect(() => {
    const canvas = seqCanvasRef.current;
    if (!canvas) return;
    seqCtxRef.current = canvas.getContext('2d');
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
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
      if (!containerRef.current || !stickyContainerRef.current || !textRef.current || !canvasWrapperRef.current || !stage1Ref.current || !stage2Ref.current || !stage3Ref.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollableDistance = Math.max(1, rect.height - windowHeight);
      const scrolledPast = -rect.top;
      const progress = Math.max(0, Math.min(scrolledPast / scrollableDistance, 1));

      scrollState.progress = progress;
      scrollState.scrollY = window.scrollY;

      // ── Stage 1: Text behind Lego (0.0 - 0.33) ──
      const s1 = Math.min(progress / 0.33, 1);
      const s1Text = Math.min(s1 / 0.9, 1);
      textRef.current.style.transform = `translate3d(-${s1Text * 100}%, 0, 0)`;
      
      // Scroll out Stage 1
      const s1Exit = Math.max(0, (s1 - 0.9) / 0.1);
      stage1Ref.current.style.transform = `translate3d(0, -${s1Exit * 100}vh, 0)`;

      // ── Stage 2: Crawler Full Screen (0.33 - 0.66) ──
      const s2 = Math.max(0, Math.min((progress - 0.33) / 0.33, 1));
      const s2Entry = Math.min(s2 / 0.1, 1);
      const s2Exit = Math.max(0, (s2 - 0.9) / 0.1);
      
      stage2Ref.current.style.transform = `translate3d(0, ${(1 - s2Entry) * 100 - (s2Exit * 100)}vh, 0)`;
      stage2Ref.current.style.opacity = s2 > 0 && s2 < 1 ? '1' : '0';

      if (s2 > 0 && s2 < 1) {
        const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(s2 * (TOTAL_FRAMES - 1)));
        drawAt(frameIndex);
      }

      // ── Stage 3: Portal & Thoughts (0.66 - 1.0) ──
      const s3 = Math.max(0, Math.min((progress - 0.66) / 0.34, 1));
      const s3Entry = Math.min(s3 / 0.1, 1);
      stage3Ref.current.style.transform = `translate3d(0, ${(1 - s3Entry) * 100}vh, 0)`;
      stage3Ref.current.style.opacity = s3 > 0 ? '1' : '0';

      // Background color for stage 3
      const r = 238 + s3 * (114 - 238);
      const g = 244 + s3 * (178 - 244);
      const b = 250 + s3 * (204 - 250);
      stickyContainerRef.current.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

      if (bgCircleRef.current) {
        const circleEase = 1 - Math.pow(1 - s3, 4);
        bgCircleRef.current.style.transform = `translate(-50%, -50%) scale(${circleEase * 40})`;
        bgCircleRef.current.style.opacity = s3 > 0 ? '1' : '0';
      }

      // ── Lego Model Management ──
      if (s1 < 0.95) {
        canvasWrapperRef.current.style.opacity = '1';
        canvasWrapperRef.current.style.transform = `translate3d(0, -${s1Exit * 100}vh, 0)`;
      } else if (s3 > 0.05) {
        canvasWrapperRef.current.style.opacity = '1';
        canvasWrapperRef.current.style.transform = 'translate3d(0, 0, 0)';
      } else {
        canvasWrapperRef.current.style.opacity = '0';
      }

      // ── Thoughts (Stage 3) ──
      bubblesRef.current.forEach((bubble, i) => {
        if (!bubble) return;
        const popStart = 0.2 + (i * 0.1);
        const popEnd = popStart + 0.15;
        if (s3 <= popStart) {
          bubble.style.opacity = '0';
          bubble.style.transform = 'scale(0.8) translateY(20px)';
        } else if (s3 >= popEnd) {
          bubble.style.opacity = '1';
          bubble.style.transform = 'scale(1) translateY(0px)';
        } else {
          const norm = (s3 - popStart) / (popEnd - popStart);
          const ease = 1 - Math.pow(1 - norm, 3);
          bubble.style.opacity = norm.toString();
          bubble.style.transform = `scale(${0.8 + 0.2 * ease}) translateY(${20 - 20 * ease}px)`;
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
    <section ref={containerRef} className="h-[300vh] relative">
      <div ref={stickyContainerRef} className="sticky top-0 h-screen w-full overflow-hidden border-t border-slate-200 bg-[#eef4fa]">
        
        {/* STAGE 1: Text */}
        <div ref={stage1Ref} className="absolute inset-0 z-0 flex items-center justify-center will-change-transform">
          <div className="absolute inset-0 flex items-center justify-start pointer-events-none overflow-hidden">
            <div ref={textRef} className="inline-block whitespace-nowrap text-[16vw] font-black tracking-tighter will-change-transform" style={{ color: '#4f46e5', opacity: 0.6, paddingLeft: '100vw', wordSpacing: '4vw' }}>
              PERSONA GETTING READY TO ANALYZE
            </div>
          </div>
        </div>

        {/* STAGE 2: Crawler Sequence */}
        <div ref={stage2Ref} className="absolute inset-0 z-10 w-full h-full pointer-events-none will-change-transform opacity-0" style={{ transform: 'translate3d(0, 100vh, 0)' }}>
          <canvas ref={seqCanvasRef} className="absolute inset-0 block w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#72b2cc]/80 via-transparent to-transparent mix-blend-multiply" />
        </div>

        {/* STAGE 3: Portal & Thoughts */}
        <div ref={stage3Ref} className="absolute inset-0 z-20 pointer-events-none will-change-transform opacity-0" style={{ transform: 'translate3d(0, 100vh, 0)' }}>
          <div ref={bgCircleRef} className="absolute top-1/2 left-1/2 w-[10vw] h-[10vw] rounded-full bg-[#72b2cc] will-change-transform z-0 origin-center pointer-events-none" style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }} />
          <div className="relative w-full h-full flex items-center justify-center max-w-6xl mx-auto px-6">
            {[
              { icon: BrainCircuit, text: "Wait, where is the pricing?", top: '15%', left: '10%' },
              { icon: Sparkles, text: "Found it! Super intuitive UI.", top: '35%', right: '20%' },
              { icon: ShieldCheck, text: "Checkout finished in 20s!", bottom: '35%', left: '15%' },
              { icon: Target, text: "Friction Point: Confusion at Step 3", bottom: '25%', right: '15%' },
            ].map((bubble, i) => (
              <div key={i} ref={(el) => { if (el) bubblesRef.current[i] = el; }} className="absolute z-50 hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white shadow-xl text-sm font-bold text-slate-700 will-change-transform" style={{ top: bubble.top, bottom: bubble.bottom, left: bubble.left, right: bubble.right, opacity: 0, transform: 'scale(0.8) translateY(20px)' }}>
                <bubble.icon className="h-4 w-4 text-indigo-500" />
                {bubble.text}
              </div>
            ))}
          </div>
        </div>

        {/* PERSISTENT LEGO MODEL (Stage 1 and 3) */}
        <div ref={canvasWrapperRef} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none will-change-transform">
          <div className="w-full h-full max-h-[800px] max-w-6xl px-6">
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
              <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.8} />
            </Canvas>
          </div>
        </div>

      </div>
    </section>
  );
}
