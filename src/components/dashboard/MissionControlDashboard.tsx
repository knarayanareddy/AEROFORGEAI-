import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Cpu, Wind, Database, Shield, TrendingUp,
  GitBranch, Clock, CheckCircle, AlertTriangle, Zap, BarChart2
} from 'lucide-react';
import { SYSTEM_METRICS, DESIGN_LIBRARY, LLM_PROVIDERS } from '../../data/aeroforgeSimulationData';
import type { AppSection } from '../../types/aeroforge';

interface MissionControlDashboardProps {
  onNavigate: (section: AppSection) => void;
}

// Live counter hook
const useCounter = (target: number, duration = 1500) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
};

// Metric card
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  onClick?: () => void;
}> = ({ label, value, unit, icon, color, trend, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3, scale: 1.01 }}
    onClick={onClick}
    className="af-glass-card p-4 cursor-pointer relative overflow-hidden"
    style={{ borderColor: `${color}22` }}
  >
    <div className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full"
      style={{ background: color, transform: 'translate(30%, -30%)' }} />
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      {trend && (
        <span className="text-xs font-semibold" style={{ color: '#00ff88' }}>
          {trend}
        </span>
      )}
    </div>
    <div className="text-xl font-bold" style={{ color: '#e8f4ff' }}>{value}
      {unit && <span className="text-xs ml-1" style={{ color }}>{unit}</span>}
    </div>
    <div className="text-xs mt-1" style={{ color: '#4a6080' }}>{label}</div>
  </motion.div>
);

// Pipeline status widget
const PipelineStatusWidget: React.FC<{ onNavigate: (s: AppSection) => void }> = ({ onNavigate }) => {
  const stages = [
    { label: 'NL Intent', status: 'complete', time: '1.2s' },
    { label: 'Physics Calc', status: 'complete', time: '0.8s' },
    { label: 'CAD Gen', status: 'complete', time: '4.3s' },
    { label: 'Validation', status: 'warn', time: '2.1s' },
    { label: 'CFD Mesh', status: 'complete', time: '18s' },
    { label: 'Simulation', status: 'complete', time: '31m' },
    { label: 'Post-Proc', status: 'running', time: '...' },
    { label: 'Export', status: 'pending', time: '—' },
  ];

  const colors: Record<string, string> = {
    complete: '#00ff88',
    warn: '#ffaa00',
    running: '#00d4ff',
    pending: '#4a6080',
  };

  return (
    <div className="af-glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch size={14} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Active Pipeline</span>
          <span className="af-badge-info">Scramjet M5.5</span>
        </div>
        <button onClick={() => onNavigate('cad-agent')} className="text-xs" style={{ color: '#00d4ff' }}>
          View Details →
        </button>
      </div>

      <div className="flex items-center gap-1">
        {stages.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-full h-1.5 rounded-full mb-1.5"
                style={{ background: colors[s.status] }}
              >
                {s.status === 'running' && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #fff)',
                      animation: 'af-flow 1.5s linear infinite',
                    }}
                  />
                )}
              </div>
              <div className="text-center">
                <div className="text-xs font-medium truncate" style={{ color: colors[s.status], fontSize: '9px' }}>
                  {s.label}
                </div>
                <div className="text-xs" style={{ color: '#4a6080', fontSize: '9px' }}>{s.time}</div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="w-1 h-px mb-5 flex-shrink-0" style={{
                background: s.status === 'pending' ? '#1a2540' : colors[s.status]
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Recent designs
const RecentDesigns: React.FC<{ onNavigate: (s: AppSection) => void }> = ({ onNavigate }) => (
  <div className="af-glass-card p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Database size={14} style={{ color: '#00d4ff' }} />
        <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Design Library</span>
      </div>
      <button onClick={() => onNavigate('geometry-engine')} className="text-xs" style={{ color: '#00d4ff' }}>
        Browse All →
      </button>
    </div>
    <div className="space-y-2">
      {DESIGN_LIBRARY.slice(0, 5).map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
          style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.06)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.03)')}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: '#e8f4ff' }}>{d.name}</div>
            <div className="text-xs" style={{ color: '#4a6080' }}>M∞ {d.machRange} · η={d.eta_p}</div>
          </div>
          <span className={`af-badge-${d.status === 'validated' ? 'pass' : 'warn'}`}>
            {d.status === 'validated' ? 'VAL' : 'REV'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Live system telemetry
const LiveTelemetry: React.FC = () => {
  const [metrics, setMetrics] = useState({
    cpuUsage: 67,
    gpuUsage: 89,
    memUsage: 72,
    networkBw: 234,
    solverIter: 487,
    residual: 2.4e-6,
  });

  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(prev => ({
        cpuUsage: Math.max(20, Math.min(99, prev.cpuUsage + (Math.random() - 0.48) * 6)),
        gpuUsage: Math.max(30, Math.min(99, prev.gpuUsage + (Math.random() - 0.4) * 4)),
        memUsage: Math.max(40, Math.min(95, prev.memUsage + (Math.random() - 0.5) * 3)),
        networkBw: Math.max(50, Math.min(800, prev.networkBw + (Math.random() - 0.5) * 80)),
        solverIter: Math.min(500, prev.solverIter + 1),
        residual: Math.max(1e-7, prev.residual * (0.998 + Math.random() * 0.004 - 0.002)),
      }));
    }, 800);
    return () => clearInterval(t);
  }, []);

  const bars = [
    { label: 'CPU', value: metrics.cpuUsage, color: '#00d4ff' },
    { label: 'GPU', value: metrics.gpuUsage, color: '#7c3aed' },
    { label: 'MEM', value: metrics.memUsage, color: '#00ff88' },
  ];

  return (
    <div className="af-glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} style={{ color: '#00d4ff' }} />
        <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Live Telemetry</span>
        <div className="af-dot-live ml-auto" />
      </div>

      <div className="space-y-3 mb-4">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: '#8ba8cc' }}>{b.label}</span>
              <span className="text-xs font-mono" style={{ color: b.color }}>{b.value.toFixed(0)}%</span>
            </div>
            <div className="af-progress-bar">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.value}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="af-separator" />

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)' }}>
          <div className="text-xs" style={{ color: '#4a6080' }}>Solver Iter.</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#00d4ff' }}>
            {metrics.solverIter} / 500
          </div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'rgba(0,255,136,0.05)' }}>
          <div className="text-xs" style={{ color: '#4a6080' }}>Residual</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#00ff88' }}>
            {metrics.residual.toExponential(1)}
          </div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.05)' }}>
          <div className="text-xs" style={{ color: '#4a6080' }}>Network I/O</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#9f5ffb' }}>
            {metrics.networkBw.toFixed(0)} MB/s
          </div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,170,0,0.05)' }}>
          <div className="text-xs" style={{ color: '#4a6080' }}>LLM Tokens</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#ffaa00' }}>
            12.4K/s
          </div>
        </div>
      </div>
    </div>
  );
};

// Autonomy level selector
const AutonomySelector: React.FC = () => {
  const [selected, setSelected] = useState(2);
  const levels = [
    { id: 0, label: 'COPILOT', desc: 'AI suggests only' },
    { id: 1, label: 'ASSISTED', desc: 'AI generates, you review each step' },
    { id: 2, label: 'SUPERVISED', desc: 'AI runs full pipeline, you review output' },
    { id: 3, label: 'AUTONOMOUS', desc: 'AI runs full loop, flags anomalies' },
    { id: 4, label: 'FULL AUTO', desc: 'End-to-end with logging only' },
  ];
  const colors = ['#00ff88', '#00d4ff', '#0066ff', '#7c3aed', '#ff6b2b'];

  return (
    <div className="af-glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} style={{ color: '#9f5ffb' }} />
        <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Autonomy Level</span>
      </div>
      <div className="space-y-1.5">
        {levels.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l.id)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left"
            style={{
              background: selected === l.id ? `${colors[l.id]}12` : 'rgba(0,0,0,0.2)',
              border: `1px solid ${selected === l.id ? `${colors[l.id]}30` : 'transparent'}`,
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: selected === l.id ? colors[l.id] : 'rgba(255,255,255,0.05)',
                color: selected === l.id ? '#000' : '#4a6080',
              }}
            >
              {l.id}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold" style={{ color: selected === l.id ? colors[l.id] : '#8ba8cc' }}>
                {l.label}
              </div>
              <div className="text-xs truncate" style={{ color: '#4a6080', fontSize: '10px' }}>{l.desc}</div>
            </div>
            {selected === l.id && (
              <CheckCircle size={12} style={{ color: colors[l.id], flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const MissionControlDashboard: React.FC<MissionControlDashboardProps> = ({ onNavigate }) => {
  const kgNodes = useCounter(SYSTEM_METRICS.knowledgeGraph.nodes);
  const kgEdges = useCounter(SYSTEM_METRICS.knowledgeGraph.edges);
  const papers = useCounter(SYSTEM_METRICS.knowledgeGraph.papers);
  const checksRun = useCounter(SYSTEM_METRICS.validationEngine.checksRun);

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,102,255,0.08) 50%, rgba(124,58,237,0.08) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.15)',
        }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 af-grid-bg opacity-40" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold af-gradient-text">AeroForge AI</h1>
              <span className="af-badge-pass">v1.0.0-MVP</span>
              <span className="af-badge-info">ACTIVE SESSION</span>
            </div>
            <p className="text-sm mb-1" style={{ color: '#8ba8cc' }}>
              AI-Native Aerospace Design & Simulation Platform
            </p>
            <p className="text-xs" style={{ color: '#4a6080' }}>
              Natural Language → CAD Geometry → CFD Validation → Export
            </p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="text-xs font-mono" style={{ color: '#4a6080' }}>
              Sessions today: <span style={{ color: '#00d4ff' }}>47</span>
            </div>
            <div className="text-xs font-mono" style={{ color: '#4a6080' }}>
              Avg. cycle time: <span style={{ color: '#00ff88' }}>8.4 min</span>
            </div>
            <div className="text-xs font-mono" style={{ color: '#4a6080' }}>
              Pass rate: <span style={{ color: '#00ff88' }}>94.2%</span>
            </div>
          </div>
        </div>

        {/* Quick launch */}
        <div className="relative flex flex-wrap gap-2 mt-4">
          {[
            { label: '▶ Run CAD Agent', color: '#00d4ff', section: 'cad-agent' as AppSection },
            { label: '⟳ Start CFD Simulation', color: '#00ff88', section: 'cfd-agent' as AppSection },
            { label: '◈ Browse Geometry Library', color: '#9f5ffb', section: 'geometry-engine' as AppSection },
            { label: '⬡ Knowledge Graph', color: '#ffaa00', section: 'knowledge-graph' as AppSection },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => onNavigate(btn.section)}
              className="text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              style={{
                background: `${btn.color}12`,
                border: `1px solid ${btn.color}25`,
                color: btn.color,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${btn.color}22`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${btn.color}12`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'none';
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Knowledge Graph Nodes"
          value={kgNodes.toLocaleString()}
          icon={<Database size={16} />}
          color="#00d4ff"
          trend="+142 today"
          onClick={() => onNavigate('knowledge-graph')}
        />
        <MetricCard
          label="Graph Edges"
          value={kgEdges.toLocaleString()}
          icon={<Share2 size={16} />}
          color="#0066ff"
          onClick={() => onNavigate('knowledge-graph')}
        />
        <MetricCard
          label="AIAA Papers Indexed"
          value={papers.toLocaleString()}
          icon={<BarChart2 size={16} />}
          color="#9f5ffb"
          trend="+18 today"
          onClick={() => onNavigate('knowledge-graph')}
        />
        <MetricCard
          label="Validation Checks Run"
          value={checksRun.toLocaleString()}
          icon={<Shield size={16} />}
          color="#00ff88"
          trend="94.2% pass"
          onClick={() => onNavigate('validation')}
        />
      </div>

      {/* ── Main Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Pipeline + Recent */}
        <div className="lg:col-span-2 space-y-4">
          <PipelineStatusWidget onNavigate={onNavigate} />
          <RecentDesigns onNavigate={onNavigate} />
        </div>

        {/* Right: Telemetry + Autonomy */}
        <div className="space-y-4">
          <LiveTelemetry />
          <AutonomySelector />
        </div>
      </div>

      {/* ── LLM Providers ───────────────────────────────── */}
      <div className="af-glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={14} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>LLM Provider Abstraction Layer (BYOK + Local)</span>
          <span className="af-badge-info ml-auto">Tool-Agnostic</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {LLM_PROVIDERS.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-lg text-center transition-all cursor-pointer"
              style={{
                background: p.status === 'active' ? 'rgba(0,255,136,0.06)' : 'rgba(0,212,255,0.04)',
                border: `1px solid ${p.status === 'active' ? 'rgba(0,255,136,0.2)' : 'rgba(0,212,255,0.08)'}`,
              }}
            >
              <div
                className="text-xs font-bold mb-1"
                style={{ color: p.local ? '#00d4ff' : '#9f5ffb' }}
              >
                {p.local ? 'LOCAL' : 'BYOK'}
              </div>
              <div className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>{p.name.split(' (')[0]}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4a6080', fontSize: '10px' }}>{p.model}</div>
              <div className="mt-2">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{
                    background: p.status === 'active' ? 'rgba(0,255,136,0.12)' :
                      p.status === 'configured' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.04)',
                    color: p.status === 'active' ? '#00ff88' :
                      p.status === 'configured' ? '#00d4ff' : '#4a6080',
                    fontSize: '9px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Fix missing import
const Share2: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

export default MissionControlDashboard;
