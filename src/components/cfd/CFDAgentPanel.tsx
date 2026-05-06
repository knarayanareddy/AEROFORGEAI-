import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wind, Activity, Play, Settings, BarChart2,
  CheckCircle, AlertTriangle, Layers, Cpu, Download
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import {
  CONVERGENCE_DATA, PRESSURE_DISTRIBUTION,
  CFD_AGENT_STEPS, CFD_RESULTS
} from '../../data/aeroforgeSimulationData';

// ── Mach Contour Visualization ─────────────────────────────────────────────────
const MachContourViz: React.FC = () => {
  const [animFrame, setAnimFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnimFrame(f => f + 1), 50);
    return () => clearInterval(t);
  }, []);

  const getMachColor = (mach: number) => {
    // Subsonic: blue, transonic: green, supersonic: yellow, hypersonic: red
    if (mach < 1.5) return `hsl(220, 90%, ${30 + mach * 20}%)`;
    if (mach < 2.5) return `hsl(${180 - (mach - 1.5) * 60}, 90%, 50%)`;
    if (mach < 4.0) return `hsl(${120 - (mach - 2.5) * 40}, 90%, 50%)`;
    return `hsl(${60 - (mach - 4.0) * 10}, 90%, 55%)`;
  };

  // Inlet flow visualization cells
  const cols = 48;
  const rows = 22;
  const cells = useMemo(() => {
    const arr = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const xN = col / cols;
        const yN = row / rows;

        // Geometry: ramp cuts into flow
        const rampY1 = 0.85 - xN * 0.25;  // lower ramp
        const cowlY = 0.45 - xN * 0.05;   // upper cowl (after ~40%)
        const inCowl = xN > 0.4;

        // Is this cell inside the duct?
        const inDuct = yN > rampY1 && (!inCowl || yN < cowlY + 0.15);
        const onWall = yN <= rampY1 + 0.03 || (inCowl && yN >= cowlY - 0.02 && yN < cowlY + 0.03);

        let mach = 0;
        if (inDuct && !onWall) {
          // Simulate shock structure
          const shock1x = 0.15 + yN * 0.3;
          const shock2x = 0.35 + yN * 0.2;
          if (xN < shock1x) mach = 5.5 - yN * 0.3;
          else if (xN < shock2x) mach = 5.5 - 1.2 - (xN - shock1x) * 4 - yN * 0.2;
          else mach = 5.5 - 2.0 - (xN - shock2x) * 3 - yN * 0.1;
          mach = Math.max(1.2, Math.min(5.8, mach));

          // Add slight oscillation for realism
          mach += Math.sin(animFrame * 0.05 + col * 0.3 + row * 0.2) * 0.04;
        }

        arr.push({ row, col, mach, inDuct, onWall });
      }
    }
    return arr;
  }, [animFrame]);

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#020814' }}>
      {/* Mach grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          height: '200px',
          padding: '8px',
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              background: cell.onWall
                ? 'rgba(0,212,255,0.5)'
                : cell.inDuct
                  ? getMachColor(cell.mach)
                  : 'transparent',
              opacity: cell.inDuct || cell.onWall ? 1 : 0,
            }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="absolute inset-0 pointer-events-none p-2">
        <div className="flex justify-between items-start">
          <div className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>M∞=5.5</div>
          <div className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>ISOLATOR M≈2.8</div>
        </div>
        <div className="absolute bottom-2 left-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
          rhoCentralFoam · k-ω SST · 4.2M cells
        </div>
      </div>

      {/* Colorbar */}
      <div className="absolute right-2 top-2 bottom-2 w-4 rounded overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(to bottom, hsl(0,90%,55%), hsl(60,90%,55%), hsl(120,90%,50%), hsl(220,90%,50%)',
          }}
        />
      </div>
      <div className="absolute right-7 top-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>5.5</div>
      <div className="absolute right-7 bottom-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>1.2</div>
      <div
        className="absolute right-6 top-1/2 text-xs font-mono"
        style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', transform: 'rotate(90deg) translateX(-50%)', transformOrigin: 'center' }}
      >
        Mach
      </div>
    </div>
  );
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip: React.FC<{ active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: number }> = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg p-3" style={{
      background: 'rgba(8,13,26,0.98)',
      border: '1px solid rgba(0,212,255,0.15)',
      fontSize: '11px',
    }}>
      <div style={{ color: '#4a6080', marginBottom: 4 }}>Iteration: {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toExponential(2) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── CFD Solver Config ──────────────────────────────────────────────────────────
const SolverConfigPanel: React.FC = () => {
  const [solver, setSolver] = useState('rhoCentralFoam');
  const [turbulence, setTurbulence] = useState('k-ω SST');
  const [cfl, setCfl] = useState(0.5);
  const [maxIter, setMaxIter] = useState(500);

  const solvers = [
    { id: 'rhoCentralFoam', label: 'rhoCentralFoam', desc: 'Density-based, compressible, hypersonic' },
    { id: 'rhoSimpleFoam', label: 'rhoSimpleFoam', desc: 'Steady RANS, compressible' },
    { id: 'sonicFoam', label: 'sonicFoam', desc: 'Transient, compressible, LES-ready' },
    { id: 'pisoCfd', label: 'pisoCFD (SU2)', desc: 'RANS, multi-physics, adjoint' },
  ];

  const turbModels = ['k-ω SST', 'k-ε Realizable', 'Spalart-Allmaras', 'LES (Dynamic)', 'DNS (HPC)'];

  return (
    <div className="space-y-4">
      {/* Boundary Conditions */}
      <div>
        <div className="af-section-label mb-2">BOUNDARY CONDITIONS (CEP)</div>
        <div className="af-terminal rounded-lg p-3">
          <div className="space-y-1 text-xs font-mono">
            {[
              { label: 'inlet.type', val: 'supersonicInlet', color: '#00d4ff' },
              { label: 'inlet.Mach', val: '5.5', color: '#00ff88' },
              { label: 'inlet.p_total', val: '101325 Pa', color: '#9f5ffb' },
              { label: 'inlet.T_total', val: '216.65 K', color: '#ffaa00' },
              { label: 'outlet.type', val: 'waveTransmissive', color: '#00d4ff' },
              { label: 'wall.type', val: 'noSlip + adiabatic', color: '#ff6b2b' },
              { label: 'symmetry.type', val: 'symmetryPlane', color: '#8ba8cc' },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <span style={{ color: '#4a6080', width: '160px', flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: item.color }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solver Selection */}
      <div>
        <div className="af-section-label mb-2">SOLVER</div>
        <div className="space-y-1.5">
          {solvers.map((s) => (
            <button
              key={s.id}
              onClick={() => setSolver(s.id)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all"
              style={{
                background: solver === s.id ? 'rgba(0,212,255,0.08)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${solver === s.id ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.05)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5"
                style={{
                  borderColor: solver === s.id ? '#00d4ff' : '#4a6080',
                  background: solver === s.id ? '#00d4ff' : 'transparent',
                }}
              />
              <div>
                <div className="text-xs font-semibold font-mono" style={{ color: solver === s.id ? '#00d4ff' : '#8ba8cc' }}>{s.label}</div>
                <div className="text-xs" style={{ color: '#4a6080', fontSize: '10px' }}>{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Turbulence */}
      <div>
        <div className="af-section-label mb-2">TURBULENCE MODEL</div>
        <select
          value={turbulence}
          onChange={e => setTurbulence(e.target.value)}
          className="af-input text-xs"
          style={{ background: 'rgba(8,13,26,0.9)' }}
        >
          {turbModels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Numerical Controls */}
      <div>
        <div className="af-section-label mb-2">NUMERICAL CONTROLS</div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: '#8ba8cc' }}>CFL Number</span>
              <span className="text-xs font-mono" style={{ color: '#00d4ff' }}>{cfl.toFixed(2)}</span>
            </div>
            <input type="range" className="af-slider w-full" min="0.1" max="2.0" step="0.05"
              value={cfl} onChange={e => setCfl(parseFloat(e.target.value))} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: '#8ba8cc' }}>Max Iterations</span>
              <span className="text-xs font-mono" style={{ color: '#00d4ff' }}>{maxIter}</span>
            </div>
            <input type="range" className="af-slider w-full" min="100" max="2000" step="50"
              value={maxIter} onChange={e => setMaxIter(parseInt(e.target.value))} />
          </div>
        </div>
      </div>

      <button className="af-btn-primary w-full flex items-center justify-center gap-2">
        <Play size={14} /> Launch CFD Simulation
      </button>
    </div>
  );
};

// ── Main CFD Agent Panel ───────────────────────────────────────────────────────
const CFDAgentPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'convergence' | 'pressure' | 'mach' | 'pipeline' | 'config'>('mach');
  const [displayedData, setDisplayedData] = useState(CONVERGENCE_DATA.slice(0, 487));

  // Simulate live residual update
  useEffect(() => {
    const t = setInterval(() => {
      setDisplayedData(prev => {
        if (prev.length >= CONVERGENCE_DATA.length) return prev;
        return [...prev, CONVERGENCE_DATA[prev.length]];
      });
    }, 80);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { id: 'mach', label: 'Mach Field', icon: <Wind size={12} /> },
    { id: 'convergence', label: 'Convergence', icon: <Activity size={12} /> },
    { id: 'pressure', label: 'Pressure Dist.', icon: <BarChart2 size={12} /> },
    { id: 'pipeline', label: 'CFD Pipeline', icon: <Layers size={12} /> },
    { id: 'config', label: 'Solver Config', icon: <Settings size={12} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>CFD Agent — Phase 2</h2>
          <p className="text-xs" style={{ color: '#4a6080' }}>
            CAD→CFD Handoff · OpenFOAM rhoCentralFoam · k-ω SST · 4.2M cells
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="af-badge-pass">CONVERGED</span>
          <span className="af-badge-info">487 / 500 ITER</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pressure Recovery', value: '87.3%', target: '>85%', ok: true, color: '#00ff88' },
          { label: 'Mass Flow Capture Ratio', value: '0.940', target: '>0.90', ok: true, color: '#00d4ff' },
          { label: 'Cowl Drag Coefficient', value: '0.0283', target: 'MIN', ok: true, color: '#9f5ffb' },
          { label: 'Solver Residual', value: '2.4×10⁻⁶', target: '<1×10⁻⁵', ok: true, color: '#ffaa00' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-3 rounded-xl"
            style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20` }}
          >
            <div className="text-xs mb-1" style={{ color: '#4a6080' }}>{kpi.label}</div>
            <div className="text-sm font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs mt-0.5" style={{ color: kpi.ok ? '#00ff88' : '#ffaa00', fontSize: '10px' }}>
              {kpi.ok ? '✓' : '⚠'} {kpi.target}
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="af-glass-card overflow-hidden">
        <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                color: activeTab === tab.id ? '#00d4ff' : '#4a6080',
                borderBottom: activeTab === tab.id ? '2px solid #00d4ff' : '2px solid transparent',
                background: activeTab === tab.id ? 'rgba(0,212,255,0.05)' : 'transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* ── Mach Field ── */}
          {activeTab === 'mach' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="af-dot-live" />
                <span className="text-xs" style={{ color: '#4a6080' }}>Live Mach number field · scramjet inlet M∞=5.5</span>
              </div>
              <MachContourViz />
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Freestream M', value: '5.50', color: '#ff3b5c' },
                  { label: 'Post-shock 1', value: '4.10', color: '#ffaa00' },
                  { label: 'Post-shock 2', value: '3.20', color: '#00ff88' },
                  { label: 'Throat M', value: '2.80', color: '#00d4ff' },
                  { label: 'Isolator exit', value: '2.40', color: '#9f5ffb' },
                  { label: 'Min Mach', value: '1.20', color: '#0066ff' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                    <div>
                      <div style={{ color: '#4a6080', fontSize: '10px' }}>{item.label}</div>
                      <div className="font-mono font-bold" style={{ color: item.color }}>M={item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Convergence ── */}
          {activeTab === 'convergence' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="af-dot-live" />
                <span className="text-xs" style={{ color: '#4a6080' }}>
                  Residual convergence · {displayedData.length} / 500 iterations
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayedData.filter((_, i) => i % 3 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="iteration" stroke="#4a6080" tick={{ fontSize: 10 }} />
                  <YAxis scale="log" domain={['auto', 'auto']} stroke="#4a6080" tick={{ fontSize: 10 }} tickFormatter={v => v.toExponential(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="continuity" stroke="#ff3b5c" dot={false} strokeWidth={1.5} name="Continuity" />
                  <Line type="monotone" dataKey="momentum_x" stroke="#00d4ff" dot={false} strokeWidth={1.5} name="Momentum-X" />
                  <Line type="monotone" dataKey="energy" stroke="#ffaa00" dot={false} strokeWidth={1.5} name="Energy" />
                  <Line type="monotone" dataKey="k" stroke="#9f5ffb" dot={false} strokeWidth={1.5} name="k (TKE)" />
                  <Line type="monotone" dataKey="omega" stroke="#00ff88" dot={false} strokeWidth={1.5} name="ω (Specific diss.)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Pressure Dist ── */}
          {activeTab === 'pressure' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs" style={{ color: '#4a6080' }}>
                  Normalized wall pressure distribution along ramp · CFD vs. oblique shock theory
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={PRESSURE_DISTRIBUTION}>
                  <defs>
                    <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="x" stroke="#4a6080" tick={{ fontSize: 10 }} label={{ value: 'x/L', position: 'insideBottomRight', fill: '#4a6080', fontSize: 10 }} />
                  <YAxis stroke="#4a6080" tick={{ fontSize: 10 }} label={{ value: 'P/P∞', angle: -90, position: 'insideLeft', fill: '#4a6080', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#08101a', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="p_p_inf" stroke="#00d4ff" fill="url(#pressGrad)" strokeWidth={2} name="P/P∞ (CFD)" />
                  <Line type="monotone" dataKey="cp" stroke="#ffaa00" strokeWidth={1.5} dot={false} name="Cp (theory)" />
                </AreaChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { loc: 'Freestream', p: '1.0 P∞', cp: '0.000' },
                  { loc: 'Post-Shock 1', p: '4.8 P∞', cp: '0.311' },
                  { loc: 'Post-Shock 2', p: '9.8 P∞', cp: '0.734' },
                  { loc: 'Throat', p: '13.8 P∞', cp: '1.067' },
                  { loc: 'Isolator mid', p: '17.6 P∞', cp: '1.383' },
                  { loc: 'Isolator exit', p: '18.4 P∞', cp: '1.449' },
                ].map(r => (
                  <div key={r.loc} className="p-2 rounded text-xs" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.06)' }}>
                    <div style={{ color: '#4a6080', fontSize: '10px' }}>{r.loc}</div>
                    <div className="font-mono font-bold" style={{ color: '#00d4ff' }}>{r.p}</div>
                    <div className="font-mono" style={{ color: '#9f5ffb', fontSize: '10px' }}>Cp={r.cp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CFD Pipeline ── */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              {CFD_AGENT_STEPS.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 p-3 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,212,255,0.06)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)' }}
                  >
                    <CheckCircle size={14} style={{ color: '#00ff88' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>{step.label}</span>
                      <span className="af-badge-pass">COMPLETE</span>
                      <span className="text-xs font-mono ml-auto" style={{ color: '#4a6080' }}>
                        {step.duration! >= 60 ? `${(step.duration! / 60).toFixed(0)}m` : `${step.duration}s`}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: '#4a6080' }}>{step.description}</div>
                    {step.output && (
                      <div className="mt-2 p-2 rounded text-xs font-mono"
                        style={{ background: 'rgba(0,0,0,0.4)', color: '#a8d8ff', borderLeft: '2px solid #00ff88' }}>
                        {step.output}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Solver Config ── */}
          {activeTab === 'config' && <SolverConfigPanel />}
        </div>
      </div>

      {/* Bottom: Post-processing results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} style={{ color: '#00d4ff' }} />
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Shock Structure Analysis</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Shock 1 angle β₁', value: '18.4°', status: 'pass' },
              { label: 'Shock 2 angle β₂', value: '14.2°', status: 'pass' },
              { label: 'Separation bubble', value: 'x/L=0.82', status: 'warn' },
              { label: 'Normal shock standoff', value: '2.1mm', status: 'pass' },
              { label: 'Cowl shock alignment', value: '+3.2mm', status: 'warn' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b"
                style={{ borderColor: 'rgba(0,212,255,0.05)' }}>
                <span style={{ color: '#8ba8cc' }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: '#00d4ff' }}>{item.value}</span>
                  <span className={`af-badge-${item.status}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={13} style={{ color: '#9f5ffb' }} />
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Mesh Quality Report</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Total cells', value: '4.2M', ok: true },
              { label: 'y⁺ (near wall)', value: '≈0.98', ok: true },
              { label: 'Max non-orthogonality', value: '42°', ok: true },
              { label: 'Max aspect ratio', value: '45', ok: true },
              { label: 'Refinement levels', value: '8', ok: true },
              { label: 'BL layers', value: '20', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b"
                style={{ borderColor: 'rgba(0,212,255,0.05)' }}>
                <span style={{ color: '#8ba8cc' }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: '#9f5ffb' }}>{item.value}</span>
                  <span style={{ color: '#00ff88' }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download size={13} style={{ color: '#00ff88' }} />
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>CFD Export Package</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Mach field (VTK)', size: '184 MB', color: '#00d4ff' },
              { label: 'Pressure field (VTK)', size: '156 MB', color: '#9f5ffb' },
              { label: 'Temperature field (VTK)', size: '143 MB', color: '#ffaa00' },
              { label: 'Wall data (CSV)', size: '2.1 MB', color: '#00ff88' },
              { label: 'Force coefficients (CSV)', size: '48 KB', color: '#00ff88' },
              { label: 'Design report (PDF)', size: '3.8 MB', color: '#8ba8cc' },
            ].map((f) => (
              <button
                key={f.label}
                className="w-full flex items-center justify-between p-2 rounded text-xs transition-colors text-left"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
              >
                <span style={{ color: f.color }}>↓ {f.label}</span>
                <span style={{ color: '#4a6080' }}>{f.size}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CFDAgentPanel;
