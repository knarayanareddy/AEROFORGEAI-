import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Layers, ChevronRight, Search, Filter } from 'lucide-react';
import { DESIGN_LIBRARY } from '../../data/aeroforgeSimulationData';

// ── Wireframe SVG components per type ─────────────────────────────────────────
const ScramjetWireframe: React.FC<{ animated: boolean }> = ({ animated }) => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <defs>
      <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#0066ff" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    {/* Ramps */}
    <path d="M 10 90 L 80 60 L 140 45 L 190 40" stroke="url(#sg1)" strokeWidth="2" fill="none" />
    <path d="M 10 90 L 10 110 L 190 110 L 190 40" stroke="#0066ff" strokeWidth="1" fill="rgba(0,102,255,0.06)" />
    {/* Cowl */}
    <path d="M 80 20 L 190 30 L 190 40 L 140 38 L 80 30 Z" stroke="#00d4ff" strokeWidth="1.5" fill="rgba(0,212,255,0.08)" />
    {/* Shock lines */}
    <line x1="10" y1="90" x2="80" y2="22" stroke="#ff6b2b" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.7" />
    <line x1="80" y1="60" x2="130" y2="30" stroke="#ffaa00" strokeWidth="1" strokeDasharray="4,3" opacity="0.7" />
    {/* Grid */}
    {[30,60,90,120,150].map(x => (
      <line key={x} x1={x} y1="30" x2={x} y2="100" stroke="rgba(0,212,255,0.06)" strokeWidth="0.5" />
    ))}
    {/* Labels */}
    <text x="40" y="15" fill="#00d4ff" fontSize="8" fontFamily="monospace">M∞=5.5</text>
    <text x="150" y="95" fill="#4a6080" fontSize="7" fontFamily="monospace">ISOLATOR</text>
    {/* Animated flow arrows */}
    {animated && [20, 40, 60].map((y, i) => (
      <motion.g key={y} animate={{ x: [0, 15, 0] }} transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}>
        <line x1="2" y1={y} x2="10" y2={y} stroke="rgba(0,212,255,0.3)" strokeWidth="0.8" />
      </motion.g>
    ))}
  </svg>
);

const NozzleWireframe: React.FC = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <defs>
      <linearGradient id="nzg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9f5ffb" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#0066ff" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    {/* Upper wall */}
    <path d="M 10 30 Q 80 30 100 55 Q 120 68 190 55" stroke="url(#nzg)" strokeWidth="2" fill="none" />
    {/* Lower wall (mirror) */}
    <path d="M 10 90 Q 80 90 100 65 Q 120 52 190 65" stroke="url(#nzg)" strokeWidth="2" fill="none" />
    {/* Fill */}
    <path d="M 10 30 Q 80 30 100 55 Q 120 68 190 55 L 190 65 Q 120 52 100 65 Q 80 90 10 90 Z"
      fill="rgba(124,58,237,0.08)" stroke="none" />
    {/* Throat marker */}
    <line x1="100" y1="55" x2="100" y2="65" stroke="#ffaa00" strokeWidth="2" />
    <text x="102" y="63" fill="#ffaa00" fontSize="8" fontFamily="monospace">THROAT</text>
    {/* Area ratio lines */}
    <line x1="10" y1="30" x2="10" y2="90" stroke="rgba(0,212,255,0.3)" strokeWidth="1" />
    <text x="14" y="65" fill="#4a6080" fontSize="7" fontFamily="monospace">A*=1</text>
    <line x1="190" y1="55" x2="190" y2="65" stroke="rgba(0,212,255,0.3)" strokeWidth="1" />
    <text x="155" y="45" fill="#4a6080" fontSize="7" fontFamily="monospace">Ae/A*=8</text>
    <text x="70" y="15" fill="#9f5ffb" fontSize="8" fontFamily="monospace">C-D Bell Nozzle M=3.0</text>
  </svg>
);

const AirfoilWireframe: React.FC<{ animated: boolean }> = ({ animated }) => {
  const [aoa, setAoa] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const t = setInterval(() => setAoa(a => (a + 0.5) % 10), 100);
    return () => clearInterval(t);
  }, [animated]);

  const chord = 160;
  const startX = 20;
  const camber = Math.sin(aoa * Math.PI / 180) * 15;

  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      {/* NACA 0012 profile approximation */}
      <path
        d={`M ${startX} ${60 - camber} Q ${startX + chord * 0.3} ${60 - camber - 18} ${startX + chord * 0.35} ${60 - camber - 20} Q ${startX + chord * 0.7} ${60 - camber - 8} ${startX + chord} ${60}`}
        stroke="#00ff88" strokeWidth="2" fill="none"
      />
      <path
        d={`M ${startX} ${60 - camber} Q ${startX + chord * 0.3} ${60 - camber + 18} ${startX + chord * 0.35} ${60 - camber + 20} Q ${startX + chord * 0.7} ${60 - camber + 8} ${startX + chord} ${60}`}
        stroke="#00ff88" strokeWidth="2" fill="none"
      />
      {/* Fill */}
      <path
        d={`M ${startX} ${60 - camber} Q ${startX + chord * 0.35} ${60 - camber - 20} ${startX + chord} ${60} Q ${startX + chord * 0.35} ${60 - camber + 20} ${startX} ${60 - camber} Z`}
        fill="rgba(0,255,136,0.06)"
      />
      {/* Chord line */}
      <line x1={startX} y1="60" x2={startX + chord} y2="60" stroke="rgba(0,255,136,0.2)" strokeWidth="1" strokeDasharray="4,3" />
      {/* AoA label */}
      <text x="10" y="110" fill="#4a6080" fontSize="7" fontFamily="monospace">AoA: {aoa.toFixed(1)}°</text>
      <text x="10" y="15" fill="#00ff88" fontSize="8" fontFamily="monospace">NACA 0012 · M=0.72</text>
    </svg>
  );
};

const NoseconeWireframe: React.FC = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <defs>
      <linearGradient id="ncg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ff6b2b" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    {/* Von Karman profile */}
    <path d="M 10 60 Q 50 30 120 30 L 190 25 L 190 95 L 120 90 Q 50 90 10 60 Z"
      stroke="url(#ncg)" strokeWidth="2" fill="rgba(255,170,0,0.06)" />
    {/* Section lines */}
    {[60, 90, 120, 150].map(x => (
      <line key={x} x1={x} y1="30" x2={x} y2="90" stroke="rgba(255,170,0,0.12)" strokeWidth="0.8" />
    ))}
    {/* Tip annotation */}
    <circle cx="10" cy="60" r="2" fill="#ffaa00" />
    <text x="14" y="55" fill="#ffaa00" fontSize="8" fontFamily="monospace">Von Kármán Tip</text>
    <text x="80" y="15" fill="#ff6b2b" fontSize="8" fontFamily="monospace">Ogive Nosecone M=1.5–5</text>
  </svg>
);

const AerospikWireframe: React.FC = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <defs>
      <linearGradient id="asg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6b2b" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#9f5ffb" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    {/* Spike body */}
    <path d="M 10 60 L 100 45 L 190 40 L 190 80 L 100 75 L 10 60 Z"
      stroke="url(#asg)" strokeWidth="1.5" fill="rgba(255,107,43,0.06)" />
    {/* Plug plugs */}
    {[110, 130, 150, 170].map((x, i) => (
      <rect key={x} x={x} y={42 + i * 0.5} width="12" height="36 - i" fill="rgba(255,107,43,0.15)"
        stroke="rgba(255,107,43,0.4)" strokeWidth="0.8" />
    ))}
    {/* Exhaust plume */}
    <path d="M 190 40 Q 220 60 210 80 L 190 80" stroke="rgba(255,170,0,0.3)" strokeWidth="1" fill="rgba(255,170,0,0.05)" strokeDasharray="4,3" />
    <text x="20" y="15" fill="#ff6b2b" fontSize="8" fontFamily="monospace">Linear Aerospike · 20-plug</text>
  </svg>
);

const NacelleWireframe: React.FC = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    {/* Nacelle outer */}
    <ellipse cx="100" cy="60" rx="85" ry="35" stroke="#00d4ff" strokeWidth="1.5" fill="rgba(0,212,255,0.05)" />
    {/* Inlet highlight */}
    <ellipse cx="20" cy="60" rx="12" ry="28" stroke="#00d4ff" strokeWidth="2" fill="rgba(0,212,255,0.08)" />
    {/* Fan face */}
    <ellipse cx="28" cy="60" rx="8" ry="22" stroke="#9f5ffb" strokeWidth="1" fill="rgba(124,58,237,0.06)" />
    {/* Fan blades suggestion */}
    {[-15,-8,0,8,15].map(dy => (
      <line key={dy} x1="25" y1={60+dy} x2="32" y2={60+dy-3} stroke="rgba(124,58,237,0.4)" strokeWidth="1.5" />
    ))}
    {/* Nozzle */}
    <ellipse cx="183" cy="60" rx="7" ry="14" stroke="#ffaa00" strokeWidth="1.5" fill="rgba(255,170,0,0.06)" />
    {/* Pylons */}
    <line x1="100" y1="26" x2="100" y2="10" stroke="rgba(0,212,255,0.3)" strokeWidth="3" />
    <text x="40" y="110" fill="#4a6080" fontSize="7" fontFamily="monospace">Turbofan BPR=12 · M=0.85</text>
  </svg>
);

const ComponentViewer: React.FC<{ type: string; selected: boolean }> = ({ type, selected }) => {
  const wf: Record<string, React.ReactNode> = {
    'scramjet-inlet': <ScramjetWireframe animated={selected} />,
    'cd-nozzle': <NozzleWireframe />,
    'naca-airfoil': <AirfoilWireframe animated={selected} />,
    'ogive-nosecone': <NoseconeWireframe />,
    'aerospike-nozzle': <AerospikWireframe />,
    'turbofan-nacelle': <NacelleWireframe />,
  };
  return wf[type] ?? <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#4a6080' }}>No preview</div>;
};

// ── Geometry Parameter Inspector ───────────────────────────────────────────────
const ParameterInspector: React.FC<{ item: typeof DESIGN_LIBRARY[0] }> = ({ item }) => {
  const paramSets: Record<string, { label: string; value: string; unit: string }[]> = {
    'scramjet-inlet': [
      { label: 'Capture Height', value: '205', unit: 'mm' },
      { label: 'Capture Width', value: '210', unit: 'mm' },
      { label: 'Ramp Angle 1', value: '7.2', unit: '°' },
      { label: 'Ramp Angle 2', value: '5.8', unit: '°' },
      { label: 'Throat Width', value: '142', unit: 'mm' },
      { label: 'Isolator L/H', value: '2.68', unit: '—' },
    ],
    'cd-nozzle': [
      { label: 'Throat Radius', value: '82', unit: 'mm' },
      { label: 'Exit Radius', value: '232', unit: 'mm' },
      { label: 'Area Ratio', value: '8.0', unit: 'Ae/A*' },
      { label: 'Length', value: '1240', unit: 'mm' },
      { label: 'Half-angle', value: '15', unit: '°' },
      { label: 'Exit Mach', value: '3.00', unit: 'M' },
    ],
    'naca-airfoil': [
      { label: 'Chord Length', value: '2500', unit: 'mm' },
      { label: 'Thickness', value: '12', unit: '%c' },
      { label: 'Camber', value: '0', unit: '%c' },
      { label: 'LE Radius', value: '1.58', unit: '%c' },
      { label: 'Design Cl', value: '0.412', unit: '—' },
      { label: 'Design AoA', value: '4.2', unit: '°' },
    ],
    default: [
      { label: 'Mach Range', value: item.machRange, unit: 'M' },
      { label: 'Efficiency', value: (item.eta_p * 100).toFixed(1), unit: '%' },
      { label: 'Version', value: item.version, unit: '' },
    ],
  };

  const params = paramSets[item.type] ?? paramSets.default;

  return (
    <div className="space-y-2">
      {params.map((p, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded text-xs"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,212,255,0.05)' }}>
          <span style={{ color: '#8ba8cc' }}>{p.label}</span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-bold" style={{ color: '#00d4ff' }}>{p.value}</span>
            <span style={{ color: '#4a6080' }}>{p.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Geometry Engine Panel ─────────────────────────────────────────────────
const GeometryEnginePanel: React.FC = () => {
  const [selectedId, setSelectedId] = useState('lib-01');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filters = ['all', 'propulsion', 'aerodynamic', 'hypersonic', 'subsonic'];

  const filtered = DESIGN_LIBRARY.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || d.tags.includes(filter);
    return matchSearch && matchFilter;
  });

  const selected = DESIGN_LIBRARY.find(d => d.id === selectedId) ?? DESIGN_LIBRARY[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold af-gradient-text">Aerospace Geometry Engine</h2>
          <p className="text-xs" style={{ color: '#4a6080' }}>
            Parametric geometry library · FreeCAD · OpenCASCADE · STEP/IGES/STL export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="af-badge-info">{DESIGN_LIBRARY.length} components</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Left: Library ──────────────────────────── */}
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Box size={14} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Component Library</span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#4a6080' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search components..."
              className="af-input pl-8 text-xs"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-2 py-1 rounded transition-all font-medium capitalize"
                style={{
                  background: filter === f ? 'rgba(0,212,255,0.12)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${filter === f ? 'rgba(0,212,255,0.25)' : 'rgba(0,212,255,0.06)'}`,
                  color: filter === f ? '#00d4ff' : '#4a6080',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Component list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="w-full text-left p-3 rounded-lg transition-all"
                style={{
                  background: selectedId === item.id ? 'rgba(0,212,255,0.08)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${selectedId === item.id ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.05)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: selectedId === item.id ? '#00d4ff' : '#e8f4ff' }}>
                      {item.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
                      M∞ {item.machRange} · η={item.eta_p}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs px-1 rounded"
                          style={{ background: 'rgba(0,212,255,0.06)', color: '#00d4ff', fontSize: '9px' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`af-badge-${item.status === 'validated' ? 'pass' : 'warn'}`}>
                      {item.status === 'validated' ? 'VAL' : 'REV'}
                    </span>
                    <span className="text-xs" style={{ color: '#4a6080', fontSize: '10px' }}>{item.version}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center: Viewport ────────────────────────── */}
        <div className="space-y-4">
          <div className="af-glass-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <Layers size={13} style={{ color: '#00d4ff' }} />
                <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>3D Geometry Viewer</span>
              </div>
              <div className="flex gap-1">
                {['WIRE', 'SOLID', 'SHADE'].map(m => (
                  <button key={m} className="text-xs px-2 py-1 rounded font-mono"
                    style={{ background: m === 'WIRE' ? 'rgba(0,212,255,0.12)' : 'transparent',
                      color: m === 'WIRE' ? '#00d4ff' : '#4a6080' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="af-cad-viewport"
              style={{ height: '220px', padding: '12px' }}
            >
              <ComponentViewer type={selected.type} selected={selectedId === selected.id} />
            </div>
            <div className="px-4 py-2 border-t flex items-center gap-3" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
              <span className="text-xs" style={{ color: '#00d4ff' }}>{selected.name}</span>
              <span className="ml-auto text-xs font-mono" style={{ color: '#4a6080' }}>{selected.version}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="af-glass-card p-3">
            <div className="flex flex-wrap gap-2">
              {selected.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff' }}>
                  # {tag}
                </span>
              ))}
              <span className="text-xs px-2 py-1 rounded font-medium"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#9f5ffb' }}>
                Created: {selected.created}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: Inspector ────────────────────────── */}
        <div className="space-y-4">
          <div className="af-glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight size={13} style={{ color: '#00d4ff' }} />
              <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Parameter Inspector</span>
              <span className={`af-badge-${selected.status === 'validated' ? 'pass' : 'warn'} ml-auto`}>
                {selected.status.toUpperCase()}
              </span>
            </div>
            <ParameterInspector item={selected} />
          </div>

          {/* Performance KPIs */}
          <div className="af-glass-card p-4">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#4a6080' }}>
              Performance KPIs
            </div>
            <div className="space-y-3">
              {[
                { label: 'Aerodynamic Efficiency', value: (selected.eta_p * 100).toFixed(1), unit: '%', color: '#00ff88' },
                { label: 'Design Mach Range', value: selected.machRange, unit: 'M∞', color: '#00d4ff' },
                { label: 'Validation Score', value: selected.status === 'validated' ? '94.2' : '78.5', unit: '/100', color: selected.status === 'validated' ? '#00ff88' : '#ffaa00' },
              ].map(kpi => (
                <div key={kpi.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: '#8ba8cc' }}>{kpi.label}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: kpi.color }}>
                      {kpi.value} {kpi.unit}
                    </span>
                  </div>
                  <div className="af-progress-bar">
                    <div className="af-progress-fill" style={{
                      width: `${parseFloat(kpi.value) / (kpi.label === 'Aerodynamic Efficiency' ? 1 : kpi.label === 'Validation Score' ? 1 : 6) * 100}%`,
                      background: kpi.color,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="af-glass-card p-4">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#4a6080' }}>
              Export Formats
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['STEP', 'IGES', 'STL', 'BREP', 'OBJ', 'DXF'].map(fmt => (
                <button
                  key={fmt}
                  className="py-2 rounded text-xs font-mono font-semibold transition-all"
                  style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', color: '#00d4ff' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.06)'; }}
                >
                  ↓ {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeometryEnginePanel;
