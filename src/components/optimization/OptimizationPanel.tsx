import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Play, RotateCcw, Target, GitBranch } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

// Pareto front data
const generateParetoData = () => {
  const dominated: { cd: number; eta: number; iter: number; label?: string }[] = [];
  const pareto: { cd: number; eta: number; iter: number; label?: string }[] = [];

  // Pareto front: tradeoff between drag (Cd) and pressure recovery (eta_p)
  for (let i = 0; i < 80; i++) {
    dominated.push({
      cd: 0.025 + Math.random() * 0.02,
      eta: 0.82 + Math.random() * 0.06,
      iter: Math.floor(Math.random() * 200),
    });
  }

  // Pareto front points
  const paretoFront = [
    { cd: 0.0218, eta: 0.898, label: 'Best η_p' },
    { cd: 0.0231, eta: 0.892 },
    { cd: 0.0245, eta: 0.886 },
    { cd: 0.0258, eta: 0.881 },
    { cd: 0.0271, eta: 0.876 },
    { cd: 0.0283, eta: 0.873, label: 'Current Design' },
    { cd: 0.0295, eta: 0.869 },
    { cd: 0.0312, eta: 0.862 },
    { cd: 0.0328, eta: 0.856 },
    { cd: 0.0347, eta: 0.848, label: 'Best Cd' },
  ];
  paretoFront.forEach(p => pareto.push({ ...p, iter: 0 }));

  return { dominated, pareto };
};

const PARETO = generateParetoData();

// Optimization history
const OPT_HISTORY = Array.from({ length: 50 }, (_, i) => ({
  generation: i + 1,
  best_eta: 0.85 + (1 - Math.exp(-i / 15)) * 0.048,
  best_cd: 0.038 - (1 - Math.exp(-i / 12)) * 0.012,
  avg_eta: 0.83 + (1 - Math.exp(-i / 20)) * 0.04,
}));

// Design variables
const DESIGN_VARIABLES = [
  { name: 'Ramp Angle θ₁', min: 5.0, max: 12.0, current: 7.2, optimal: 7.8, unit: '°' },
  { name: 'Ramp Angle θ₂', min: 3.0, max: 9.0, current: 5.8, optimal: 5.2, unit: '°' },
  { name: 'Cowl Height', min: 30, max: 80, current: 48, optimal: 44, unit: 'mm' },
  { name: 'Throat Width', min: 100, max: 200, current: 142, optimal: 138, unit: 'mm' },
  { name: 'Bleed Slot Width', min: 2.0, max: 6.0, current: 3.5, optimal: 4.1, unit: 'mm' },
  { name: 'Cowl Lip Radius', min: 0.3, max: 2.0, current: 0.8, optimal: 0.6, unit: 'mm' },
];

const ObjectiveFunctionCard: React.FC<{
  label: string;
  type: 'minimize' | 'maximize';
  current: number;
  optimal: number;
  unit: string;
  improvement: string;
  color: string;
}> = ({ label, type, current, optimal, unit, improvement, color }) => (
  <div className="af-glass-card p-4" style={{ borderColor: `${color}22` }}>
    <div className="flex items-center gap-2 mb-2">
      <Target size={13} style={{ color }} />
      <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>{label}</span>
      <span className="text-xs px-1.5 rounded font-bold ml-auto" style={{ background: `${color}15`, color }}>
        {type.toUpperCase()}
      </span>
    </div>
    <div className="flex items-end gap-3">
      <div>
        <div className="text-xs" style={{ color: '#4a6080' }}>Current</div>
        <div className="text-lg font-bold font-mono" style={{ color: '#8ba8cc' }}>{current}{unit}</div>
      </div>
      <div className="text-xl" style={{ color }}>→</div>
      <div>
        <div className="text-xs" style={{ color: '#4a6080' }}>Optimal</div>
        <div className="text-lg font-bold font-mono" style={{ color }}>{optimal}{unit}</div>
      </div>
    </div>
    <div className="text-xs mt-2 font-semibold" style={{ color }}>
      {improvement} improvement
    </div>
    <div className="af-progress-bar mt-2">
      <div className="af-progress-fill" style={{ width: '72%', background: color }} />
    </div>
  </div>
);

const OptimizationPanel: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<'nsga-ii' | 'pso' | 'cma-es' | 'bayesian'>('nsga-ii');
  const [running, setRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [displayHistory, setDisplayHistory] = useState(OPT_HISTORY.slice(0, 50));

  const algorithms = [
    { id: 'nsga-ii', label: 'NSGA-II', desc: 'Non-dominated sorting genetic algorithm (multi-obj)' },
    { id: 'pso', label: 'PSO', desc: 'Particle swarm optimization' },
    { id: 'cma-es', label: 'CMA-ES', desc: 'Covariance matrix adaptation evolution strategy' },
    { id: 'bayesian', label: 'Bayesian', desc: 'Gaussian process surrogate model optimization' },
  ];

  const handleRun = () => {
    setRunning(true);
    setGeneration(0);
    const interval = setInterval(() => {
      setGeneration(g => {
        if (g >= 50) { setRunning(false); clearInterval(interval); return 50; }
        return g + 1;
      });
    }, 120);
  };

  const handleReset = () => {
    setRunning(false);
    setGeneration(0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{
            background: 'linear-gradient(135deg, #9f5ffb, #00d4ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Multi-Objective Optimization Loop
          </h2>
          <p className="text-xs" style={{ color: '#4a6080' }}>
            NSGA-II · Pareto front · CAD↔CFD optimization loop · Phase 3
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="af-btn-secondary flex items-center gap-2 py-2 px-3 text-xs">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={handleRun} disabled={running} className="af-btn-primary flex items-center gap-2">
            <Play size={14} /> {running ? `Gen ${generation}/50` : 'Run Optimization'}
          </button>
        </div>
      </div>

      {/* Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ObjectiveFunctionCard
          label="Total Pressure Recovery η_p"
          type="maximize"
          current={0.873}
          optimal={0.898}
          unit=""
          improvement="+2.9%"
          color="#00ff88"
        />
        <ObjectiveFunctionCard
          label="Cowl Drag Coefficient C_D"
          type="minimize"
          current={0.0283}
          optimal={0.0218}
          unit=""
          improvement="-23%"
          color="#00d4ff"
        />
        <ObjectiveFunctionCard
          label="Mass Flow Capture Ratio"
          type="maximize"
          current={0.940}
          optimal={0.961}
          unit=""
          improvement="+2.2%"
          color="#9f5ffb"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pareto Front */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={14} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Pareto Front (C_D vs η_p)</span>
            <span className="af-badge-info ml-auto">50 generations</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
              <XAxis
                type="number" dataKey="cd" name="Cd" domain={[0.02, 0.05]}
                stroke="#4a6080" tick={{ fontSize: 10 }}
                label={{ value: 'Drag Coeff. C_D', position: 'insideBottomRight', fill: '#4a6080', fontSize: 10 }}
              />
              <YAxis
                type="number" dataKey="eta" name="η_p" domain={[0.80, 0.91]}
                stroke="#4a6080" tick={{ fontSize: 10 }}
                label={{ value: 'η_p', angle: -90, position: 'insideLeft', fill: '#4a6080', fontSize: 10 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#08101a', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, fontSize: 11 }}
              />
              <Scatter name="Design Space" data={PARETO.dominated} fill="rgba(0,212,255,0.2)" />
              <Scatter name="Pareto Front" data={PARETO.pareto} fill="#00d4ff"
                shape={(props: { cx?: number; cy?: number }) => (
                  <circle cx={props.cx} cy={props.cy} r={5} fill="#00d4ff" stroke="rgba(0,212,255,0.5)" strokeWidth={1.5} />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Convergence history */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: '#9f5ffb' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Optimization Convergence</span>
            {running && <div className="af-dot-live ml-auto" />}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={displayHistory.slice(0, Math.max(generation, 50))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
              <XAxis dataKey="generation" stroke="#4a6080" tick={{ fontSize: 10 }}
                label={{ value: 'Generation', position: 'insideBottomRight', fill: '#4a6080', fontSize: 10 }} />
              <YAxis yAxisId="eta" domain={[0.84, 0.92]} stroke="#4a6080" tick={{ fontSize: 10 }}
                label={{ value: 'η_p', angle: -90, position: 'insideLeft', fill: '#4a6080', fontSize: 10 }} />
              <YAxis yAxisId="cd" orientation="right" domain={[0.020, 0.040]} stroke="#4a6080" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#08101a', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="eta" type="monotone" dataKey="best_eta" stroke="#00ff88" dot={false} strokeWidth={2} name="Best η_p" />
              <Line yAxisId="eta" type="monotone" dataKey="avg_eta" stroke="#4a6080" dot={false} strokeWidth={1} strokeDasharray="4,2" name="Avg η_p" />
              <Line yAxisId="cd" type="monotone" dataKey="best_cd" stroke="#00d4ff" dot={false} strokeWidth={2} name="Best C_D" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Algorithm config */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} style={{ color: '#9f5ffb' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Optimization Algorithm</span>
          </div>
          <div className="space-y-2 mb-4">
            {algorithms.map(alg => (
              <button
                key={alg.id}
                onClick={() => setAlgorithm(alg.id as typeof algorithm)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                style={{
                  background: algorithm === alg.id ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${algorithm === alg.id ? 'rgba(124,58,237,0.25)' : 'rgba(0,212,255,0.05)'}`,
                }}
              >
                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: algorithm === alg.id ? '#9f5ffb' : '#4a6080',
                    background: algorithm === alg.id ? '#9f5ffb' : 'transparent',
                  }} />
                <div>
                  <div className="text-xs font-semibold font-mono" style={{ color: algorithm === alg.id ? '#9f5ffb' : '#8ba8cc' }}>
                    {alg.label}
                  </div>
                  <div className="text-xs" style={{ color: '#4a6080', fontSize: '10px' }}>{alg.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
            <div className="font-mono" style={{ color: '#9f5ffb' }}>Population: 50 · Generations: 100</div>
            <div className="font-mono" style={{ color: '#9f5ffb' }}>Crossover prob: 0.9 · Mutation: 0.02</div>
            <div className="font-mono" style={{ color: '#9f5ffb' }}>Constraint handling: NSGA-II ε-constrained</div>
          </div>
        </div>

        {/* Design variable sensitivities */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Design Variable → Optimal</span>
          </div>
          <div className="space-y-3">
            {DESIGN_VARIABLES.map(dv => {
              const range = dv.max - dv.min;
              const currentPct = ((dv.current - dv.min) / range) * 100;
              const optimalPct = ((dv.optimal - dv.min) / range) * 100;
              const improved = Math.abs(dv.optimal - dv.current) > 0.1;
              return (
                <div key={dv.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#8ba8cc' }}>{dv.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: '#4a6080' }}>
                        {dv.current}{dv.unit}
                      </span>
                      <span className="text-xs" style={{ color: '#4a6080' }}>→</span>
                      <span className="text-xs font-mono font-bold" style={{ color: improved ? '#00ff88' : '#8ba8cc' }}>
                        {dv.optimal}{dv.unit}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-4 rounded" style={{ background: 'rgba(0,212,255,0.06)' }}>
                    {/* Current marker */}
                    <div
                      className="absolute top-0 h-full w-1 rounded"
                      style={{ left: `${currentPct}%`, background: 'rgba(0,212,255,0.4)', transform: 'translateX(-50%)' }}
                    />
                    {/* Optimal marker */}
                    <motion.div
                      animate={{ left: `${optimalPct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute top-0 h-full w-1 rounded"
                      style={{ left: `${optimalPct}%`, background: '#00ff88', transform: 'translateX(-50%)', boxShadow: '0 0 4px rgba(0,255,136,0.6)' }}
                    />
                    {/* Range bar */}
                    <div
                      className="absolute top-1/2 h-px"
                      style={{
                        left: `${Math.min(currentPct, optimalPct)}%`,
                        width: `${Math.abs(optimalPct - currentPct)}%`,
                        background: 'rgba(0,255,136,0.25)',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationPanel;
