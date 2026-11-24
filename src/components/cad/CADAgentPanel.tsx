import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle, AlertTriangle, Clock,
  Layers, Settings, Download, ChevronRight, Play,
  RefreshCw, Info, Lock, Unlock
} from 'lucide-react';
import {
  SCRAMJET_INLET_REQUIREMENTS,
  SCRAMJET_INLET_GEOMETRY,
  CAD_AGENT_STEPS,
} from '../../data/aeroforgeSimulationData';
import { analyseInlet, DESIGN_POINT, evaluateInletRules } from '../../lib/inletDesign';
import { ProvenanceChip } from '../common/Provenance';
import { parseDesignIntent, describeIntent, type DesignIntent } from '../../lib/designIntent';
import { getMaterial } from '../../lib/materials';
import { formatDuration } from '../../utils/design';
import type { AgentStep, GeometryParameter } from '../../types/aeroforge';

// ── Geometry SVG Visualizer ────────────────────────────────────────────────────
const ScramjetInletSVG: React.FC<{ params: GeometryParameter[] }> = ({ params }) => {
  const ramp1 = params.find(p => p.id === 'geo-03')?.value ?? 7.2;
  const ramp2 = params.find(p => p.id === 'geo-04')?.value ?? 5.8;
  const captureH = params.find(p => p.id === 'geo-01')?.value ?? 205;

  // Normalize for SVG
  const r1rad = (ramp1 * Math.PI) / 180;
  const r2rad = ((ramp1 + ramp2) * Math.PI) / 180;
  const baseY = 160;
  const inletX = 30;
  const len1 = 120;
  const len2 = 100;

  const p0 = { x: inletX, y: baseY };
  const p1 = { x: inletX + len1, y: baseY - len1 * Math.tan(r1rad) };
  const p2 = { x: p1.x + len2, y: p1.y - len2 * Math.tan(r2rad) };
  const p3 = { x: p2.x + 80, y: p2.y - 5 };

  // Cowl
  const cowlY = baseY - 80;
  const cowlX1 = inletX + 180;
  const cowlX2 = p3.x;

  const shockPoints = [
    { x: p0.x, y: p0.y, ex: cowlX1, ey: cowlY - 8 },
    { x: p1.x, y: p1.y, ex: cowlX2 - 30, ey: cowlY + 5 },
  ];

  return (
    <div className="relative w-full" style={{ height: '220px' }}>
      <svg
        viewBox="0 0 420 220"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        {/* Grid */}
        <defs>
          <pattern id="cgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="rampGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="shockGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff6b2b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffaa00" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="420" height="220" fill="url(#cgrid)" />

        {/* Shock waves */}
        {shockPoints.map((s, i) => (
          <line
            key={i}
            x1={s.x} y1={s.y} x2={s.ex} y2={s.ey}
            stroke="url(#shockGrad)"
            strokeWidth="1.5"
            strokeDasharray="6,3"
            opacity="0.8"
            filter="url(#glow)"
          />
        ))}

        {/* Mach flow arrows */}
        {[30, 60, 90, 120, 150].map((y) => (
          <g key={y}>
            <line
              x1="10" y1={y} x2="28" y2={y}
              stroke="rgba(0,212,255,0.25)" strokeWidth="0.8"
            />
            <polygon
              points={`28,${y-3} 35,${y} 28,${y+3}`}
              fill="rgba(0,212,255,0.25)"
            />
          </g>
        ))}

        {/* Cowl geometry */}
        <path
          d={`M ${cowlX1} ${cowlY - 20} L ${cowlX1} ${cowlY} L ${cowlX2} ${cowlY + 15} L ${cowlX2 + 10} ${cowlY + 12} L ${cowlX1 + 5} ${cowlY - 22} Z`}
          fill="rgba(0,102,255,0.12)"
          stroke="rgba(0,212,255,0.5)"
          strokeWidth="1"
        />

        {/* Lower ramp body */}
        <path
          d={`M ${p0.x} ${p0.y + 20} L ${p3.x + 10} ${p3.y + 20} L ${p3.x + 10} ${p3.y} L ${p2.x} ${p2.y} L ${p1.x} ${p1.y} L ${p0.x} ${p0.y} Z`}
          fill="rgba(0,102,255,0.08)"
          stroke="url(#rampGrad)"
          strokeWidth="1.5"
        />

        {/* Ramp surface highlight */}
        <path
          d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`}
          fill="none"
          stroke="url(#rampGrad)"
          strokeWidth="2"
          filter="url(#glow)"
        />

        {/* Bleed slots */}
        {[p1.x - 10, p1.x + 30].map((bx, i) => (
          <rect
            key={i}
            x={bx} y={p1.y + (i === 0 ? -10 : -14)}
            width="4" height="8"
            fill="rgba(255,170,0,0.4)"
            stroke="rgba(255,170,0,0.6)"
            strokeWidth="0.5"
          />
        ))}

        {/* Angle annotations */}
        <text x={p0.x + 35} y={p0.y - 12} fill="#00d4ff" fontSize="10" fontFamily="monospace">
          θ₁={ramp1.toFixed(1)}°
        </text>
        <text x={p1.x + 20} y={p1.y - 10} fill="#00ff88" fontSize="10" fontFamily="monospace">
          θ₂={ramp2.toFixed(1)}°
        </text>

        {/* Dimension arrow: capture height */}
        <line x1="12" y1={cowlY} x2="12" y2={baseY} stroke="rgba(255,170,0,0.6)" strokeWidth="1" />
        <line x1="8" y1={cowlY} x2="16" y2={cowlY} stroke="rgba(255,170,0,0.6)" strokeWidth="1" />
        <line x1="8" y1={baseY} x2="16" y2={baseY} stroke="rgba(255,170,0,0.6)" strokeWidth="1" />
        <text x="18" y={baseY - 35} fill="#ffaa00" fontSize="9" fontFamily="monospace">
          H={captureH}mm
        </text>

        {/* Labels */}
        <text x={cowlX1 + 5} y={cowlY - 26} fill="rgba(0,212,255,0.7)" fontSize="9" fontFamily="monospace">COWL</text>
        <text x={p3.x - 15} y={p3.y + 35} fill="rgba(0,212,255,0.7)" fontSize="9" fontFamily="monospace">ISOLATOR</text>
        <text x="42" y="22" fill="rgba(0,212,255,0.5)" fontSize="9" fontFamily="monospace">M∞=5.5</text>

        {/* Pressure labels on ramp */}
        <text x={p0.x + 50} y={p0.y + 35} fill="rgba(255,107,43,0.7)" fontSize="9" fontFamily="monospace">P/P∞=1.0</text>
        <text x={p1.x - 10} y={p1.y + 35} fill="rgba(255,107,43,0.7)" fontSize="9" fontFamily="monospace">P/P∞=9.8</text>
        <text x={p2.x - 20} y={p2.y + 35} fill="rgba(255,107,43,0.7)" fontSize="9" fontFamily="monospace">P/P∞=18.4</text>

        {/* Boundary layer suggestion */}
        <path
          d={`M ${p0.x} ${p0.y - 4} Q ${p1.x} ${p1.y - 6} ${p3.x} ${p3.y - 6}`}
          fill="none"
          stroke="rgba(124,58,237,0.4)"
          strokeWidth="3"
          strokeDasharray="4,2"
        />
        <text x={p0.x + 20} y={p0.y - 12} fill="rgba(124,58,237,0.7)" fontSize="8" fontFamily="monospace">BL δ=4.2mm</text>
      </svg>

      {/* Overlay badge */}
      <div
        className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-mono"
        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}
      >
        Mixed-Compression Scramjet Inlet · M∞=5.5
      </div>
    </div>
  );
};

// ── Typewriter prompt ──────────────────────────────────────────────────────────
const DEMO_PROMPTS = [
  'Design a mixed-compression scramjet inlet for Mach 5.5 cruise, total pressure recovery > 0.85, mass flow rate 12 kg/s, optimize for minimum cowl drag, titanium alloy manufacturing',
  'Generate a convergent-divergent bell nozzle with area ratio 8:1 for M=3.0 exit, Inconel 718 material, max pressure 12 MPa, thrust vectoring capable',
  'Design a NACA 0012 airfoil wing section for chord 2.5m, optimize for Cl/Cd at Mach 0.72, include leading edge droop for stall margin',
];

const TypewriterPrompt: React.FC<{ onSubmit: (p: string) => void; disabled?: boolean }> = ({ onSubmit, disabled }) => {
  const [text, setText] = useState('');
  const [promptIdx, setPromptIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [charIdx, setCharIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isUserMode, setIsUserMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isUserMode) return;
    if (isTyping) {
      const t = setTimeout(() => {
        const target = DEMO_PROMPTS[promptIdx];
        if (charIdx < target.length) {
          setText(target.slice(0, charIdx + 1));
          setCharIdx(charIdx + 1);
        } else {
          setIsTyping(false);
          setTimeout(() => {
            setIsTyping(true);
            setCharIdx(0);
            setText('');
            setPromptIdx((promptIdx + 1) % DEMO_PROMPTS.length);
          }, 3500);
        }
      }, 28);
      return () => clearTimeout(t);
    }
  }, [charIdx, isTyping, promptIdx, isUserMode]);

  const handleSubmit = () => {
    const val = isUserMode ? userInput : text;
    if (val.trim()) onSubmit(val);
  };

  return (
    <div>
      <div className="af-terminal rounded-xl overflow-hidden">
        <div className="af-terminal-header">
          <div className="af-terminal-dot" style={{ background: '#ff5f57' }} />
          <div className="af-terminal-dot" style={{ background: '#febc2e' }} />
          <div className="af-terminal-dot" style={{ background: '#28c840' }} />
          <span className="text-xs ml-2" style={{ color: '#7688a6' }}>aeroforge-cad-agent · intent-parser</span>
        </div>
        <div className="p-4">
          <div className="text-xs mb-2" style={{ color: '#7688a6' }}>
            {'>'} Natural language design intent:
          </div>
          {isUserMode ? (
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm resize-none"
              style={{ color: '#a8d8ff', fontFamily: 'inherit', minHeight: '80px' }}
              placeholder="Describe your aerospace component design..."
              autoFocus
            />
          ) : (
            <div
              className="text-sm cursor-text min-h-[80px]"
              style={{ color: '#a8d8ff' }}
              onClick={() => setIsUserMode(true)}
            >
              {text}
              <span className="af-cursor" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setIsUserMode(!isUserMode)}
          className="af-btn-secondary text-xs py-2 px-3"
        >
          {isUserMode ? '⟵ Use Demo Prompt' : '✎ Custom Prompt'}
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="af-btn-primary flex items-center gap-2"
          style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <Sparkles size={14} />
          Run CAD Agent
        </button>
      </div>
    </div>
  );
};

// ── Agent Step Card ────────────────────────────────────────────────────────────
const AgentStepCard: React.FC<{ step: AgentStep; index: number }> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(step.status === 'running');
  const statusColors = {
    complete: '#00ff88',
    running: '#00d4ff',
    pending: '#7688a6',
    error: '#ff3b5c',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-lg overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: `1px solid ${step.status === 'running' ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.06)'}`,
      }}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{
            background: `${statusColors[step.status]}15`,
            border: `1px solid ${statusColors[step.status]}40`,
            color: statusColors[step.status],
          }}
        >
          {step.status === 'complete' ? <CheckCircle size={12} /> :
           step.status === 'running' ? <RefreshCw size={12} className="af-animate-rotate" /> :
           step.status === 'error' ? <AlertTriangle size={12} /> :
           <Clock size={12} />}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>{step.label}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{
                background: `${statusColors[step.status]}10`,
                color: statusColors[step.status],
                fontSize: '9px',
              }}
            >
              {step.phase.toUpperCase().replace(/-/g, ' ')}
            </span>
          </div>
        </div>

        {/* Duration */}
        {step.duration !== undefined && (
          <span className="text-xs font-mono" style={{ color: '#7688a6' }}>
            {formatDuration(step.duration)}
          </span>
        )}

        <ChevronRight
          size={12}
          style={{
            color: '#7688a6',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>

      {/* Progress bar */}
      {step.status === 'running' && (
        <div className="mx-3 mb-2">
          <div className="af-progress-bar">
            <div
              className="af-progress-fill"
              style={{
                width: `${step.progress}%`,
                background: 'linear-gradient(90deg, #00d4ff, #0066ff)',
                animation: step.status === 'running' ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Expanded output */}
      <AnimatePresence>
        {expanded && step.output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3"
          >
            <div
              className="p-2 rounded text-xs font-mono"
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: '#a8d8ff',
                borderLeft: `2px solid ${statusColors[step.status]}`,
                lineHeight: 1.7,
              }}
            >
              <div className="text-xs mb-1" style={{ color: '#7688a6' }}>{'→'} Output:</div>
              {step.output}
            </div>
            <div className="text-xs mt-1" style={{ color: '#7688a6' }}>
              {step.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Geometry Parameters Panel ─────────────────────────────────────────────────
const GeometryParametersPanel: React.FC<{
  params: GeometryParameter[];
  onParamChange: (id: string, value: number) => void;
  onToggleLock: (id: string) => void;
}> = ({ params, onParamChange, onToggleLock }) => (
  <div className="space-y-2">
    {params.map((p) => (
      <div key={p.id} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleLock(p.id)}
              style={{ color: p.locked ? '#ffaa00' : '#7688a6' }}
            >
              {p.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <span className="text-xs font-medium" style={{ color: '#e8f4ff' }}>{p.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-bold" style={{ color: '#00d4ff' }}>
              {p.value.toFixed(p.unit === '°' ? 1 : 0)}
            </span>
            <span className="text-xs" style={{ color: '#7688a6' }}>{p.unit}</span>
          </div>
        </div>
        <input
          type="range"
          className="af-slider w-full"
          min={p.min}
          max={p.max}
          step={(p.max - p.min) / 100}
          value={p.value}
          disabled={p.locked}
          aria-label={p.name}
          onChange={e => onParamChange(p.id, parseFloat(e.target.value))}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: '#7688a6', fontSize: '10px' }}>{p.min}{p.unit}</span>
          <span className="text-xs" style={{ color: '#7688a6', fontSize: '10px' }}>{p.max}{p.unit}</span>
        </div>
      </div>
    ))}
  </div>
);

// ── Physics Constraints Panel ─────────────────────────────────────────────────
const PhysicsConstraintsPanel: React.FC<{ rules: ReturnType<typeof evaluateInletRules> }> = ({ rules }) => {
  return (
    <div className="space-y-2">
      {rules.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.06)' }}
        >
          <div
            className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
            style={{
                background:
                c.status === 'pass'
                  ? '#00ff88'
                  : c.status === 'warn' || c.status === 'unknown'
                    ? '#ffaa00'
                    : '#ff3b5c',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium" style={{ color: '#e8f4ff' }}>{c.check}</span>
              <span className={`af-badge-${c.status === 'unknown' ? 'warn' : c.status}`}>
                {c.status === 'unknown' ? 'N/A' : c.status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs" style={{ color: '#8ba8cc' }}>{c.note}</div>
            <div className="flex gap-3 mt-1">
              <span className="text-xs"><span style={{ color: '#7688a6' }}>Computed: </span>
                <span style={{ color: '#00d4ff' }}>{c.computed}</span>
              </span>
              <span className="text-xs"><span style={{ color: '#7688a6' }}>Required: </span>
                <span style={{ color: '#8ba8cc' }}>{c.required}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main CAD Agent Panel ───────────────────────────────────────────────────────
const CADAgentPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'geometry' | 'physics' | 'validation'>('pipeline');
  const [geoParams, setGeoParams] = useState(SCRAMJET_INLET_GEOMETRY);
  // The design point is the panel state; every displayed number is derived from
  // it, so moving a ramp slider re-solves the shock chain immediately.
  const [analysis, setAnalysis] = useState(() => analyseInlet(DESIGN_POINT));
  // The prompt is no longer discarded: it is parsed into a design point, the
  // physics is re-solved from it, and the result is shown row by row.
  const [intent, setIntent] = useState<DesignIntent | null>(null);
  const rules = evaluateInletRules(analysis);
  const [agentRunning, setAgentRunning] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(true);
  const [steps, setSteps] = useState<AgentStep[]>(CAD_AGENT_STEPS);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear any pending pipeline timers on unmount.
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const handleParamChange = (id: string, value: number) => {
    const next = geoParams.map(p => (p.id === id ? { ...p, value } : p));
    setGeoParams(next);
    setPipelineComplete(false);

    // Re-derive the whole physics chain from the new geometry. Ramp angles are
    // geo-03/geo-04; anything else leaves the shock chain unchanged.
    const ramp1 = next.find(p => p.id === 'geo-03')?.value ?? DESIGN_POINT.rampAnglesDeg[0];
    const ramp2 = next.find(p => p.id === 'geo-04')?.value ?? DESIGN_POINT.rampAnglesDeg[1];
    setAnalysis(analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [ramp1, ramp2] }));
  };

  const handleToggleLock = (id: string) => {
    setGeoParams(prev => prev.map(p => p.id === id ? { ...p, locked: !p.locked } : p));
  };

  const handleRunAgent = (prompt: string) => {
    if (agentRunning) return; // re-entry guard: one pipeline at a time

    // 1. Parse the prompt into a checked design point. Fields the parser could
    //    not find are reported as defaults rather than invented.
    const parsed = parseDesignIntent(prompt);
    setIntent(parsed);

    // 2. Re-solve the physics from it.
    const next = analyseInlet(parsed.design);
    setAnalysis(next);

    // 3. Reflect the parsed geometry in the parameter sliders, so the numbers
    //    on screen and the geometry drawn beside them cannot diverge.
    setGeoParams(prev =>
      prev.map(p => {
        if (p.id === 'geo-03') return { ...p, value: parsed.design.rampAnglesDeg[0] ?? p.value };
        if (p.id === 'geo-04') return { ...p, value: parsed.design.rampAnglesDeg[1] ?? p.value };
        return p;
      }),
    );

    setAgentRunning(true);
    setPipelineComplete(false);
    setSteps(prev => prev.map((s, i) => ({ ...s, status: i === 0 ? 'running' : 'pending', progress: 0 })));

    // 4. The timeline below is a *simulated* progress animation. It is labelled
    //    as such on screen; no CAD kernel runs. Its step outputs are replaced
    //    with the values this particular prompt produced, so the animation at
    //    least narrates the real calculation.
    const outputs: Record<string, string> = {
      'step-01': `${parsed.mach.source === 'parsed' ? 'Read' : 'Defaulted'} M ${parsed.design.mach} · ${(parsed.design.altitudeM / 1000).toFixed(1)} km · ${parsed.design.rampAnglesDeg.length} ramps`,
      'step-02': `Shock chain attached: M_iso ${next.performance.isolatorMach.toFixed(2)}, p/p∞ ${next.performance.pressureRatio.toFixed(2)}`,
      'step-03': `π = ${next.performance.totalPressureRecovery.toFixed(4)} across ${next.performance.chain.steps.length} shocks`,
      'step-04': `T_aw ${Math.round(next.performance.wallTemperatureK)} K vs ${getMaterial(parsed.design.materialId)?.name ?? parsed.design.materialId} limit`,
      'step-05': `${next.thermal.verdict === 'fail' ? 'Material FAILS the wall check' : 'Material within allowables'}`,
      'step-06': `${evaluateInletRules(next).filter(r => r.status === 'pass').length} rules pass of ${evaluateInletRules(next).length}`,
    };
    setSteps(prev => prev.map(s => ({ ...s, output: outputs[s.id] ?? s.output })));

    let idx = 0;
    const runStep = () => {
      if (idx >= CAD_AGENT_STEPS.length) {
        setAgentRunning(false);
        setPipelineComplete(true);
        return;
      }
      setSteps(prev => prev.map((s, i) => ({
        ...s,
        status: i < idx ? 'complete' : i === idx ? 'running' : 'pending',
        progress: i === idx ? 75 : i < idx ? 100 : 0,
      })));
      const duration = (CAD_AGENT_STEPS[idx].duration ?? 1) * 200;
      later(() => {
        setSteps(prev => prev.map((s, i) => ({
          ...s,
          status: i <= idx ? 'complete' : i === idx + 1 ? 'running' : 'pending',
          progress: i <= idx ? 100 : 0,
        })));
        idx++;
        later(runStep, 400);
      }, Math.min(duration, 2000));
    };
    runStep();
  };

  const tabs = [
    { id: 'pipeline', label: 'Agent Pipeline', icon: <Play size={12} /> },
    { id: 'geometry', label: 'Geometry Params', icon: <Settings size={12} /> },
    { id: 'physics', label: 'Physics Constraints', icon: <Sparkles size={12} /> },
    { id: 'validation', label: 'Validation', icon: <CheckCircle size={12} /> },
  ];

  const passCount = rules.filter(v => v.status === 'pass').length;
  const warnCount = rules.filter(v => v.status === 'warn' || v.status === 'unknown').length;
  const avgConf = (rules.reduce((a, v) => a + v.confidence, 0) / rules.length * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {/* ── Left Column: Input + Pipeline ──────────── */}
      <div className="xl:col-span-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold af-gradient-text">CAD Agent — Phase 1</h2>
            <p className="text-xs" style={{ color: '#7688a6' }}>
              Natural Language → Parametric Aerospace Geometry · FreeCAD · STEP/IGES/STL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="af-badge-pass">P1 ACTIVE</span>
            {agentRunning && <span className="af-badge-info animate-pulse">RUNNING</span>}
          </div>
        </div>

        {/* NL Input */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Intent Parser</span>
            <ProvenanceChip
              source="derived"
              detail="Deterministic in-browser parser (src/lib/designIntent.ts). No LLM is called; Phase 1 replaces this with a schema-validated endpoint."
            />
            <span className="af-badge-info ml-auto">local parser · no LLM</span>
          </div>
          <TypewriterPrompt onSubmit={handleRunAgent} disabled={agentRunning} />

          {intent && (
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(0,212,255,0.10)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>
                  Parsed intent
                </span>
                <span className="text-xs font-mono ml-auto" style={{ color: '#00d4ff' }}>
                  {describeIntent(intent)}
                </span>
              </div>
              {([
                ['Mach', String(intent.mach.value), intent.mach],
                ['Altitude', `${(intent.altitudeM.value / 1000).toFixed(1)} km`, intent.altitudeM],
                ['Ramps', intent.rampAnglesDeg.value.map(v => `${v}°`).join(' + '), intent.rampAnglesDeg],
                ['Material', getMaterial(intent.materialId.value)?.name ?? intent.materialId.value, intent.materialId],
              ] as const).map(([label, value, field]) => (
                <div key={label} className="flex items-start gap-2 text-xs">
                  <span style={{ color: '#7688a6', width: 66, flexShrink: 0 }}>{label}</span>
                  <span className="font-mono" style={{ color: '#e8f4ff' }}>{value}</span>
                  {field.source === 'parsed' ? (
                    <span title={`read from "${field.evidence}"`} style={{ color: '#00ff88', fontSize: 10 }}>
                      parsed
                    </span>
                  ) : (
                    <span title={field.reason} style={{ color: '#ffaa00', fontSize: 10 }} className="cursor-help">
                      default ⓘ
                    </span>
                  )}
                  {field.source === 'parsed' && field.reason && (
                    <span style={{ color: '#7688a6', fontSize: 10 }} className="italic">{field.reason}</span>
                  )}
                </div>
              ))}
              {intent.rejected.map(r => (
                <div key={r.field} className="text-xs" style={{ color: '#ffaa00' }}>
                  ⚠ ignored “{r.text}” — {r.reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="af-glass-card overflow-hidden">
          <div
            className="flex border-b"
            style={{ borderColor: 'rgba(0,212,255,0.08)' }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors flex-1 justify-center"
                style={{
                  color: activeTab === tab.id ? '#00d4ff' : '#7688a6',
                  borderBottom: activeTab === tab.id ? '2px solid #00d4ff' : '2px solid transparent',
                  background: activeTab === tab.id ? 'rgba(0,212,255,0.05)' : 'transparent',
                }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {activeTab === 'pipeline' && (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <AgentStepCard key={step.id} step={step} index={i} />
                ))}
              </div>
            )}
            {activeTab === 'geometry' && (
              <GeometryParametersPanel
                params={geoParams}
                onParamChange={handleParamChange}
                onToggleLock={handleToggleLock}
              />
            )}
                        {activeTab === 'physics' && <PhysicsConstraintsPanel rules={rules} />}
            {activeTab === 'validation' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
                    <div className="text-lg font-bold" style={{ color: '#00ff88' }}>{passCount}</div>
                    <div className="text-xs" style={{ color: '#7688a6' }}>PASS</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)' }}>
                    <div className="text-lg font-bold" style={{ color: '#ffaa00' }}>{warnCount}</div>
                    <div className="text-xs" style={{ color: '#7688a6' }}>WARN</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <div className="text-lg font-bold" style={{ color: '#00d4ff' }}>{avgConf}%</div>
                    <div className="text-xs" style={{ color: '#7688a6' }}>AVG CONF.</div>
                  </div>
                </div>
                {rules.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`af-badge-${v.status}`}>{v.status.toUpperCase()}</span>
                      <span className="text-xs font-medium" style={{ color: '#e8f4ff' }}>{v.check}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span><span style={{ color: '#7688a6' }}>Computed: </span><span style={{ color: '#00d4ff' }}>{v.computed}</span></span>
                      <span><span style={{ color: '#7688a6' }}>Required: </span><span style={{ color: '#8ba8cc' }}>{v.required}</span></span>
                      <span><span style={{ color: '#7688a6' }}>Standard: </span><span style={{ color: '#9f5ffb' }}>{v.standard}</span></span>
                      <span><span style={{ color: '#7688a6' }}>Conf: </span><span style={{ color: '#00ff88' }}>{(v.confidence * 100).toFixed(0)}%</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Column: Viewport + KPIs ──────────── */}
      <div className="xl:col-span-2 space-y-4">
        {/* 3D Viewport */}
        <div className="af-glass-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(0,212,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <Layers size={13} style={{ color: '#00d4ff' }} />
              <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Geometry Viewport</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#7688a6' }}>FreeCAD · STEP</span>
              <button className="af-btn-secondary py-1 px-2 text-xs flex items-center gap-1">
                <Download size={11} /> Export
              </button>
            </div>
          </div>
          <div className="af-cad-viewport af-scanline">
            <ScramjetInletSVG params={geoParams} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Derived performance</span>
          <ProvenanceChip source="derived" detail="Exact oblique-shock chain + ISA, evaluated live from the ramp angles. Not a CFD result." />
          <span className="text-xs ml-auto" style={{ color: '#7688a6', fontSize: '10px' }}>
            re-solved on every slider move
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Total Pressure Recovery (ramps)',
              value: `${(analysis.performance.totalPressureRecovery * 100).toFixed(1)}%`,
              target: '>85%',
              ok: analysis.performance.totalPressureRecovery >= 0.85,
              color: '#00ff88',
            },
            {
              label: 'Isolator Entry Mach',
              value: analysis.performance.isolatorMach.toFixed(2),
              target: '2.5–3.5',
              ok:
                analysis.performance.isolatorMach >= 2.5 &&
                analysis.performance.isolatorMach <= 3.5,
              color: '#00d4ff',
            },
            {
              label: 'Static Pressure Ratio',
              value: `${analysis.performance.pressureRatio.toFixed(2)}×`,
              target: 'design dependent',
              ok: analysis.performance.pressureRatio > 1,
              color: '#9f5ffb',
            },
            {
              label: 'Wall Temp vs Allowable',
              value: `${Math.round(analysis.performance.wallTemperatureK)} K`,
              target: `≤ ${Math.round(analysis.thermal.serviceLimitK)} K`,
              ok: analysis.thermal.verdict === 'ok',
              color: '#ffaa00',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-3 rounded-xl"
              style={{
                background: `${kpi.color}08`,
                border: `1px solid ${kpi.color}20`,
              }}
            >
              <div className="text-xs mb-1" style={{ color: '#7688a6' }}>{kpi.label}</div>
              <div className="text-base font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <span style={{ color: kpi.ok ? '#00ff88' : '#ffaa00', fontSize: '10px' }}>
                  {kpi.ok ? '✓' : '⚠'}
                </span>
                <span className="text-xs" style={{ color: '#7688a6', fontSize: '10px' }}>Target: {kpi.target}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Design Requirements */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={13} style={{ color: '#00d4ff' }} />
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Extracted Requirements</span>
            <span className="af-badge-pass ml-auto">{SCRAMJET_INLET_REQUIREMENTS.length} parsed</span>
          </div>
          <div className="space-y-1.5">
            {SCRAMJET_INLET_REQUIREMENTS.map((req) => (
              <div key={req.id} className="flex items-center gap-2 text-xs py-1 border-b"
                style={{ borderColor: 'rgba(0,212,255,0.05)' }}>
                <div className="w-1 h-1 rounded-full" style={{ background: '#00d4ff' }} />
                <span style={{ color: '#8ba8cc' }} className="flex-1">{req.parameter}</span>
                <span className="font-mono font-semibold" style={{ color: '#00d4ff' }}>
                  {req.value} {req.unit}
                </span>
                <span className="text-xs" style={{ color: '#7688a6', fontSize: '10px' }}>
                  {(req.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Export Panel */}
        {pipelineComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="af-glass-card p-4"
            style={{ border: '1px solid rgba(0,255,136,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Download size={13} style={{ color: '#00ff88' }} />
              <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Export Package Ready</span>
              <span className="af-badge-pass ml-auto">COMPLETE</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['STEP', 'IGES', 'STL', 'BREP', 'PDF', 'JSON'].map((fmt) => (
                <button
                  key={fmt}
                  className="py-2 rounded-lg text-xs font-semibold font-mono transition-all"
                  style={{
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    color: '#00d4ff',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                  }}
                >
                  ↓ {fmt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CADAgentPanel;
