'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, RoundedBox, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Zap, Target, BrainCircuit, Sparkles, AlertCircle, CheckCircle2, Layout, MousePointer2, ArrowRight } from 'lucide-react';

// ─── Tetris Constants ─────────────────────────────────────────────────────────

const COLS = 10;
const ROWS = 20;

type Shape = number[][];

const TETROMINOS: Record<string, { shape: Shape; color: string; label: string; icon: any }> = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#0ea5e9', // Sky Blue
    label: 'Speed Fix',
    icon: Zap
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1]],
    color: '#6366f1', // Indigo
    label: 'Access Fix',
    icon: AlertCircle
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1]],
    color: '#8b5cf6', // Violet
    label: 'Sentiment Fix',
    icon: BrainCircuit
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: '#38bdf8', // Light Sky
    label: 'ROI Fix',
    icon: Target
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0]],
    color: '#a78bfa', // Light Violet
    label: 'Friction Fix',
    icon: MousePointer2
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1]],
    color: '#818cf8', // Soft Indigo
    label: 'Layout Fix',
    icon: Layout
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1]],
    color: '#7dd3fc', // Very Light Blue
    label: 'Logic Fix',
    icon: Sparkles
  },
};

const RANDOM_LABELS = [
  "Fix LCP Peak", "Contrast Fix", "Positive Signal", "Flow Optimized",
  "Nav Improved", "DOM Lean", "Alt Added", "Load Boost",
  "User Delight", "Error Fixed", "Responsive Fix", "CTA Boost"
];

// ─── Component: Cube ──────────────────────────────────────────────────────────

function BlockCube({ position, color, isGhost = false }: { position: [number, number, number], color: string, isGhost?: boolean }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.1} smoothness={4}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isGhost ? 0.2 : 0.8}
          transparent={true}
          opacity={isGhost ? 0.2 : 0.85}
          transmission={0.6}
          thickness={0.5}
          roughness={0.1}
        />
      </RoundedBox>
    </group>
  );
}

// ─── Component: Main Section ──────────────────────────────────────────────────

export default function ReportTetrisSection() {
  const [grid, setGrid] = useState<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [activePiece, setActivePiece] = useState<{
    pos: { x: number; y: number };
    type: string;
    shape: Shape;
    label: string;
  } | null>(null);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [synthesizeFlash, setSynthesizeFlash] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  // ── Helper: Collision Detection ───────────────────────────────────────────
  const checkCollision = useCallback((pos: { x: number; y: number }, shape: Shape) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && grid[newY][newX])
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, [grid]);

  // ── Helper: Rotation ──────────────────────────────────────────────────────
  const rotate = (shape: Shape) => {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  };

  // ── Action: Spawn Piece ───────────────────────────────────────────────────
  const spawnPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    const proto = TETROMINOS[type];

    const newPiece = {
      pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
      type,
      shape: proto.shape,
      label: RANDOM_LABELS[Math.floor(Math.random() * RANDOM_LABELS.length)]
    };

    if (checkCollision(newPiece.pos, newPiece.shape)) {
      setGameOver(true);
      return;
    }
    setActivePiece(newPiece);
  }, [checkCollision]);

  // ── Action: Lock Piece ────────────────────────────────────────────────────
  const lockPiece = useCallback(() => {
    if (!activePiece) return;
    const newGrid = [...grid.map(row => [...row])];
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const gridY = activePiece.pos.y + y;
          const gridX = activePiece.pos.x + x;
          if (gridY >= 0) {
            newGrid[gridY][gridX] = activePiece.type;
          }
        }
      });
    });

    // Clear lines
    let linesCleared = 0;
    const finalGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (finalGrid.length < ROWS) {
      finalGrid.unshift(Array(COLS).fill(null));
    }

    if (linesCleared > 0) {
      setScore(s => s + linesCleared * 100);
      setSynthesizeFlash(true);
      setTimeout(() => setSynthesizeFlash(false), 500);
    }

    setGrid(finalGrid);
    spawnPiece();
  }, [activePiece, grid, spawnPiece]);

  // ── Action: Move Piece ────────────────────────────────────────────────────
  const movePiece = useCallback((dx: number, dy: number) => {
    if (!activePiece || gameOver || isPaused) return false;
    const newPos = { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy };
    if (!checkCollision(newPos, activePiece.shape)) {
      setActivePiece({ ...activePiece, pos: newPos });
      return true;
    }
    return false;
  }, [activePiece, gameOver, isPaused, checkCollision]);

  // ── Action: Handle Rotation ───────────────────────────────────────────────
  const handleRotate = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    const newShape = rotate(activePiece.shape);
    if (!checkCollision(activePiece.pos, newShape)) {
      setActivePiece({ ...activePiece, shape: newShape });
    }
  }, [activePiece, gameOver, isPaused, checkCollision]);

  // ── Helper: Ghost Position ────────────────────────────────────────────────
  const getGhostPos = useCallback(() => {
    if (!activePiece) return null;
    let ghostY = activePiece.pos.y;
    while (!checkCollision({ x: activePiece.pos.x, y: ghostY + 1 }, activePiece.shape)) {
      ghostY++;
    }
    return { x: activePiece.pos.x, y: ghostY };
  }, [activePiece, checkCollision]);

  // 1. Initial Spawn
  useEffect(() => {
    if (isInView && !activePiece && !gameOver) {
      spawnPiece();
    }
  }, [isInView, activePiece, gameOver, spawnPiece]);

  // 2. Gravity Loop
  useEffect(() => {
    if (gameOver || isPaused || !isInView) return;
    const interval = setInterval(() => {
      if (!movePiece(0, 1)) {
        lockPiece();
      }
    }, Math.max(100, 800 - (score / 5)));
    return () => clearInterval(interval);
  }, [gameOver, isPaused, isInView, movePiece, lockPiece, score]);

  // 3. Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isPaused) return;

      const keysToPrevent = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];
      if (keysToPrevent.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0); break;
        case 'ArrowRight': movePiece(1, 0); break;
        case 'ArrowDown': movePiece(0, 1); break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': while (movePiece(0, 1)); lockPiece(); break;
        case 'p': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isPaused, movePiece, handleRotate, lockPiece]);

  return (
    <section ref={sectionRef} className="relative h-screen min-h-[800px] w-full bg-[#f8fafc] overflow-hidden flex flex-col items-center justify-center py-20">

      {/* ── Background Glow ── */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-200 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center h-full">

        {/* ── Left: Copy & Instructions ── */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="h-3 w-3" />
              Final Stage
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
              We find the leaks.<br />
              <span className="text-indigo-600">You fix the flow.</span>
            </h2>
            <p className="text-slate-600 text-lg">
              Specter provides the exact fixes and feedback needed for your product.
              <br />All you have to do is place them in the right spot.
            </p>
          </div>

          {/* <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Controls</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: '← →', d: 'Move Fixes' },
                { k: '↑', d: 'Rotate' },
                { k: '↓', d: 'Soft Drop' },
                { k: 'Space', d: 'Final Placement' },
              ].map(item => (
                <div key={item.d} className="flex flex-col gap-1">
                  <span className="text-indigo-600 font-mono text-lg">{item.k}</span>
                  <span className="text-slate-500 text-xs">{item.d}</span>
                </div>
              ))}
            </div>
          </div> */}

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Optimized Score</p>
              <p className="text-3xl font-black text-slate-900">{Math.min(100, Math.floor(score / 50))}%</p>
            </div>
            <div className="hidden md:block h-12 w-px bg-slate-200" />

            {/* Active Insight Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative px-6 py-4 bg-white ring-1 ring-slate-900/5 rounded-2xl leading-none flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  {(() => {
                    const Icon = activePiece ? TETROMINOS[activePiece.type].icon : BrainCircuit;
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Active Insight</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activePiece?.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="text-xl font-black text-slate-900 truncate min-w-[140px]"
                    >
                      {activePiece?.label || 'Analysing...'}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: 3D Game Area ── */}
        <div className="lg:col-span-8 relative aspect-[4/5] lg:aspect-auto h-full min-h-[600px] rounded-[2.5rem] border-4 border-slate-100 bg-white/50 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-indigo-500/5">
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={35} />
            <ambientLight intensity={1.5} />
            <pointLight position={[10, 10, 10]} intensity={2.5} color="#6366f1" />
            <pointLight position={[-10, 5, 5]} intensity={1.5} color="#0ea5e9" />

            <Suspense fallback={null}>
              <group position={[-COLS / 2 + 0.5, ROWS / 2 - 1.5, 0]}>
                {/* Board Boundary - visual constraint */}
                <mesh position={[COLS / 2 - 0.5, -ROWS / 2 + 0.5, -0.52]}>
                  <planeGeometry args={[COLS + 0.4, ROWS + 0.4]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[COLS / 2 - 0.5, -ROWS / 2 + 0.5, -0.51]}>
                  <planeGeometry args={[COLS, ROWS]} />
                  <meshBasicMaterial color="#f1f5f9" />
                </mesh>

                {/* Visual Floor */}
                <mesh position={[COLS / 2 - 0.5, -ROWS + 0.40, 0]}>
                  <boxGeometry args={[COLS, 0.2, 1]} />
                  <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
                </mesh>

                {/* Grid Lines */}
                <gridHelper
                  args={[ROWS, ROWS, 0xdddddd, 0xeeeeee]}
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[COLS / 2 - 0.5, -ROWS / 2 + 0.5, -0.5]}
                />

                {/* Fixed Blocks */}
                {grid.map((row, y) => row.map((cell, x) => (
                  cell && <BlockCube key={`${x}-${y}`} position={[x, -y, 0]} color={TETROMINOS[cell].color} />
                )))}

                {/* Active Piece */}
                {activePiece && activePiece.shape.map((row, y) => row.map((value, x) => (
                  value && <BlockCube
                    key={`active-${x}-${y}`}
                    position={[activePiece.pos.x + x, -(activePiece.pos.y + y), 0]}
                    color={TETROMINOS[activePiece.type].color}
                  />
                )))}

                {/* Ghost Piece */}
                {activePiece && (() => {
                  const ghostPos = getGhostPos();
                  return ghostPos && activePiece.shape.map((row, y) => row.map((value, x) => (
                    value && <BlockCube
                      key={`ghost-${x}-${y}`}
                      position={[ghostPos.x + x, -(ghostPos.y + y), 0]}
                      color={TETROMINOS[activePiece.type].color}
                      isGhost={true}
                    />
                  )));
                })()}
              </group>

              <Environment preset="night" />
            </Suspense>

            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} />
          </Canvas>

          {/* ── Mobile Controls Overlay ── */}
          <div className="absolute bottom-8 left-0 right-0 z-30 flex md:hidden flex-col items-center gap-4 px-6">
            <div className="flex items-center gap-4">
              <button
                onPointerDown={(e) => { e.preventDefault(); movePiece(-1, 0); }}
                className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 active:bg-indigo-50 transition-all shadow-lg"
              >
                <ArrowRight className="h-6 w-6 rotate-180" />
              </button>

              <div className="flex flex-col gap-4">
                <button
                  onPointerDown={(e) => { e.preventDefault(); handleRotate(); }}
                  className="w-16 h-16 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center text-white active:scale-90 shadow-xl shadow-indigo-200"
                >
                  <Sparkles className="h-6 w-6" />
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); movePiece(0, 1); }}
                  className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 active:bg-indigo-50 transition-all shadow-lg"
                >
                  <ArrowRight className="h-6 w-6 rotate-90" />
                </button>
              </div>

              <button
                onPointerDown={(e) => { e.preventDefault(); movePiece(1, 0); }}
                className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 active:bg-indigo-50 transition-all shadow-lg"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>

            <button
              onPointerDown={(e) => { e.preventDefault(); while (movePiece(0, 1)); lockPiece(); }}
              className="w-full py-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
            >
              Instant Drop
            </button>
          </div>

          {/* ── Overlay: Game Over/Pause ── */}
          <AnimatePresence>
            {(gameOver || isPaused) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-12"
              >
                <h3 className="text-4xl font-black text-slate-900 mb-4">
                  {gameOver ? 'Report Finalized' : 'Paused'}
                </h3>
                <p className="text-slate-500 mb-8 max-w-sm font-medium">
                  {gameOver
                    ? `You successfully placed ${score / 100} critical fixes and feedback items at the right place.`
                    : 'The AI is generating more feedback...'}
                </p>
                <button
                  onClick={() => {
                    if (gameOver) {
                      setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
                      setScore(0);
                      setGameOver(false);
                      spawnPiece();
                    } else {
                      setIsPaused(false);
                    }
                  }}
                  className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/20"
                >
                  {gameOver ? 'Build Next Report' : 'Resume'}
                  <Zap className="h-5 w-5 fill-current" />
                </button>
              </motion.div>
            )}

            {synthesizeFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 pointer-events-none border-4 border-indigo-500 rounded-[2.5rem] flex items-center justify-center bg-indigo-500/10"
              >
                <div className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-2xl">
                  INSIGHT SYNTHESIZED!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
