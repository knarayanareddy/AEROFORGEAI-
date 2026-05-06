import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AeroForgeNavbar from './components/layout/AeroForgeNavbar';
import AeroForgeSidebar from './components/layout/AeroForgeSidebar';
import MissionControlDashboard from './components/dashboard/MissionControlDashboard';
import CADAgentPanel from './components/cad/CADAgentPanel';
import CFDAgentPanel from './components/cfd/CFDAgentPanel';
import GeometryEnginePanel from './components/geometry/GeometryEnginePanel';
import KnowledgeGraphPanel from './components/knowledge/KnowledgeGraphPanel';
import ValidationEnginePanel from './components/validation/ValidationEnginePanel';
import OptimizationPanel from './components/optimization/OptimizationPanel';
import ExportHandoffPanel from './components/export/ExportHandoffPanel';
import type { AppSection } from './types/aeroforge';

// ── Loading Screen ─────────────────────────────────────────────────────────────
const AeroForgeLoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const bootSteps = [
    'Initializing AeroForge AI kernel...',
    'Loading aerospace knowledge graph (14,820 nodes)...',
    'Connecting to Ollama llama3.2:70b (local)...',
    'Loading FreeCAD geometry engine...',
    'Initializing OpenFOAM CFD solver interface...',
    'Loading AIAA standard constraints (2,847 papers)...',
    'Calibrating validation engine (AS9100D, MIL-E-5007D)...',
    'AeroForge AI v1.0.0 — Ready.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        const next = p + 1.8;
        const step = Math.min(Math.floor(next / 13), bootSteps.length - 1);
        setCurrentStep(step);
        return Math.min(next, 100);
      });
    }, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(0,30,60,0.6) 0%, #050810 100%)',
      }}
    >
      {/* Grid bg */}
      <div className="absolute inset-0 af-grid-bg" />

      {/* Scanline */}
      <div
        className="absolute inset-x-0 h-px opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
          animation: 'af-scan 3s linear infinite',
          top: `${progress}%`,
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative mb-8 text-center"
      >
        {/* Hexagonal logo mark */}
        <div className="relative mx-auto w-20 h-20 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0066ff" />
              </linearGradient>
              <filter id="logoGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Hexagon */}
            <polygon
              points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
              fill="rgba(0,212,255,0.08)"
              stroke="url(#logoGrad)"
              strokeWidth="2"
              filter="url(#logoGlow)"
            />
            {/* Inner lines */}
            <polygon
              points="50,15 83,32.5 83,67.5 50,85 17,67.5 17,32.5"
              fill="none"
              stroke="rgba(0,212,255,0.2)"
              strokeWidth="1"
            />
            {/* Aircraft symbol */}
            <path
              d="M 50 30 L 65 55 L 58 52 L 58 70 L 50 68 L 42 70 L 42 52 L 35 55 Z"
              fill="url(#logoGrad)"
              filter="url(#logoGlow)"
            />
          </svg>
          {/* Rotating ring */}
          <div
            className="absolute inset-0"
            style={{ animation: 'af-rotate 8s linear infinite' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="rgba(0,212,255,0.3)"
                strokeWidth="1"
                strokeDasharray="10 5"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-wider af-gradient-text mb-1">AEROFORGE AI</h1>
        <p className="text-sm" style={{ color: '#4a6080' }}>
          AI-Native Aerospace Design & Simulation Platform
        </p>
        <p className="text-xs mt-1" style={{ color: '#2a3a50' }}>
          Natural Language → CAD → CFD → Validated Aerospace Design
        </p>
      </motion.div>

      {/* Boot log */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="af-terminal rounded-xl overflow-hidden mb-4">
          <div className="af-terminal-header">
            <div className="af-terminal-dot" style={{ background: '#ff5f57' }} />
            <div className="af-terminal-dot" style={{ background: '#febc2e' }} />
            <div className="af-terminal-dot" style={{ background: '#28c840' }} />
            <span className="text-xs ml-2" style={{ color: '#4a6080' }}>aeroforge-kernel · boot sequence</span>
          </div>
          <div className="p-4 space-y-1">
            {bootSteps.slice(0, currentStep + 1).map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-xs font-mono"
              >
                <span style={{ color: i === currentStep ? '#00d4ff' : '#00ff88' }}>
                  {i === currentStep ? '▶' : '✓'}
                </span>
                <span style={{ color: i === currentStep ? '#a8d8ff' : '#4a6080' }}>
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="af-progress-bar h-1.5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00d4ff, #0066ff, #7c3aed)',
              boxShadow: '0 0 12px rgba(0,212,255,0.5)',
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono" style={{ color: '#4a6080' }}>Loading system...</span>
          <span className="text-xs font-mono" style={{ color: '#00d4ff' }}>{progress.toFixed(0)}%</span>
        </div>
      </motion.div>

      {/* Version */}
      <div className="absolute bottom-4 text-xs font-mono" style={{ color: '#2a3a50' }}>
        v1.0.0-MVP · Multi-Agent AI Platform · BYOK + Local LLM · AS9100D
      </div>
    </div>
  );
};

// ── Section Renderer ───────────────────────────────────────────────────────────
const SectionRenderer: React.FC<{
  section: AppSection;
  onNavigate: (s: AppSection) => void;
}> = ({ section, onNavigate }) => {
  const sections: Record<AppSection, React.ReactNode> = {
    dashboard: <MissionControlDashboard onNavigate={onNavigate} />,
    'cad-agent': <CADAgentPanel />,
    'cfd-agent': <CFDAgentPanel />,
    'geometry-engine': <GeometryEnginePanel />,
    'knowledge-graph': <KnowledgeGraphPanel />,
    validation: <ValidationEnginePanel />,
    optimization: <OptimizationPanel />,
    export: <ExportHandoffPanel />,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
      >
        {sections[section]}
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');

  return (
    <>
      {/* Loading screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AeroForgeLoadingScreen onComplete={() => setLoading(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main application */}
      {!loading && (
        <div className="min-h-screen af-grid-bg" style={{ background: '#050810' }}>
          {/* Navbar */}
          <AeroForgeNavbar activeSection={activeSection} />

          {/* Sidebar */}
          <AeroForgeSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* Main content */}
          <main
            className="pt-14 pl-56"
            style={{ minHeight: '100vh' }}
          >
            <div className="p-5">
              <SectionRenderer
                section={activeSection}
                onNavigate={setActiveSection}
              />
            </div>
          </main>

          {/* Ambient background effects */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: -1 }}
          >
            {/* Top-left glow */}
            <div
              className="absolute w-96 h-96 rounded-full opacity-5"
              style={{
                background: 'radial-gradient(circle, #00d4ff, transparent)',
                top: '-100px',
                left: '100px',
              }}
            />
            {/* Bottom-right glow */}
            <div
              className="absolute w-80 h-80 rounded-full opacity-5"
              style={{
                background: 'radial-gradient(circle, #7c3aed, transparent)',
                bottom: '0',
                right: '0',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
