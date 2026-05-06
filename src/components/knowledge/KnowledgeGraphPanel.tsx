import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Database, Zap } from 'lucide-react';

// ── Knowledge graph SVG visualization ─────────────────────────────────────────
interface GraphNode {
  id: string;
  type: 'component' | 'constraint' | 'material' | 'standard' | 'paper' | 'formula';
  label: string;
  x: number;
  y: number;
  connections: string[];
  strength?: number;
}

const GRAPH_NODES: GraphNode[] = [
  // Center cluster: Scramjet Inlet
  { id: 'n01', type: 'component', label: 'Scramjet Inlet', x: 50, y: 50, connections: ['n02', 'n03', 'n07', 'n10', 'n14'], strength: 1 },
  { id: 'n02', type: 'constraint', label: 'Oblique Shock θ₁', x: 22, y: 28, connections: ['n05', 'n06'], strength: 0.8 },
  { id: 'n03', type: 'constraint', label: 'Total Pressure η_p', x: 75, y: 25, connections: ['n04', 'n05'], strength: 0.9 },
  { id: 'n04', type: 'standard', label: 'MIL-E-5007D', x: 88, y: 10, connections: [], strength: 0.7 },
  { id: 'n05', type: 'paper', label: 'AIAA-2004-3351', x: 52, y: 12, connections: [], strength: 0.6 },
  { id: 'n06', type: 'formula', label: 'θ-β-M relation', x: 10, y: 12, connections: [], strength: 0.5 },
  { id: 'n07', type: 'material', label: 'Ti-6Al-4V', x: 22, y: 70, connections: ['n08', 'n09'], strength: 0.8 },
  { id: 'n08', type: 'standard', label: 'AMS 4928', x: 8, y: 85, connections: [], strength: 0.6 },
  { id: 'n09', type: 'constraint', label: 'Temp Limit 1750K', x: 30, y: 88, connections: [], strength: 0.7 },
  { id: 'n10', type: 'component', label: 'C-D Nozzle', x: 75, y: 72, connections: ['n11', 'n12'], strength: 0.8 },
  { id: 'n11', type: 'constraint', label: 'Area Ratio Ae/A*', x: 90, y: 60, connections: ['n13'], strength: 0.7 },
  { id: 'n12', type: 'paper', label: 'NASA-CR-195446', x: 88, y: 82, connections: [], strength: 0.5 },
  { id: 'n13', type: 'formula', label: 'isentropic M(A)', x: 95, y: 45, connections: [], strength: 0.5 },
  { id: 'n14', type: 'component', label: 'NACA Airfoil', x: 38, y: 92, connections: ['n15', 'n16'], strength: 0.7 },
  { id: 'n15', type: 'paper', label: 'AIAA-99-4878', x: 20, y: 96, connections: [], strength: 0.5 },
  { id: 'n16', type: 'standard', label: 'AS9100D', x: 55, y: 95, connections: [], strength: 0.6 },
];

const NODE_COLORS: Record<GraphNode['type'], string> = {
  component: '#00d4ff',
  constraint: '#ffaa00',
  material: '#00ff88',
  standard: '#9f5ffb',
  paper: '#ff6b2b',
  formula: '#0066ff',
};

const InteractiveKnowledgeGraph: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>('n01');
  const [animOffset, setAnimOffset] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnimOffset(o => (o + 1) % 100), 80);
    return () => clearInterval(t);
  }, []);

  const getNodeById = (id: string) => GRAPH_NODES.find(n => n.id === id);
  const activeNode = selectedNode ? getNodeById(selectedNode) : null;

  return (
    <div className="relative w-full" style={{ height: '320px' }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M 0 0 L 4 2 L 0 4 z" fill="rgba(0,212,255,0.4)" />
          </marker>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="kggrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,212,255,0.04)" strokeWidth="0.3" />
        </pattern>
        <rect width="100" height="100" fill="url(#kggrid)" />

        {/* Edges */}
        {GRAPH_NODES.map(node =>
          node.connections.map(connId => {
            const target = getNodeById(connId);
            if (!target) return null;
            const isActive = hoveredNode === node.id || hoveredNode === connId ||
              selectedNode === node.id || selectedNode === connId;
            return (
              <line
                key={`${node.id}-${connId}`}
                x1={node.x} y1={node.y} x2={target.x} y2={target.y}
                stroke={isActive ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'}
                strokeWidth={isActive ? 0.5 : 0.3}
                markerEnd="url(#arrow)"
                strokeDasharray={isActive ? `${animOffset % 10} 5` : ''}
              />
            );
          })
        )}

        {/* Nodes */}
        {GRAPH_NODES.map(node => {
          const color = NODE_COLORS[node.type];
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const isConnected = activeNode?.connections.includes(node.id) ?? false;
          const scale = isSelected ? 1.5 : isHovered ? 1.3 : isConnected ? 1.1 : 1;
          const r = (node.strength ?? 0.7) * 2.5;

          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
            >
              {/* Outer glow ring */}
              {(isSelected || isHovered) && (
                <circle
                  cx={node.x} cy={node.y} r={r * scale * 1.8}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.3"
                  opacity="0.4"
                />
              )}
              {/* Node circle */}
              <circle
                cx={node.x} cy={node.y}
                r={r * scale}
                fill={`${color}25`}
                stroke={color}
                strokeWidth={isSelected ? 0.8 : 0.4}
                filter={isSelected ? 'url(#nodeGlow)' : ''}
                style={{ transition: 'all 0.2s' }}
              />
              {/* Label */}
              <text
                x={node.x}
                y={node.y + r * scale + 2.5}
                textAnchor="middle"
                fill={isSelected || isHovered ? color : 'rgba(255,255,255,0.4)'}
                fontSize={isSelected ? 3.2 : 2.5}
                fontFamily="monospace"
                style={{ transition: 'all 0.2s' }}
              >
                {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
              </text>
              {/* Type dot */}
              <circle cx={node.x} cy={node.y} r="0.6" fill={color} />
            </g>
          );
        })}
      </svg>

      {/* Node detail overlay */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 right-2 w-44 p-3 rounded-xl text-xs"
          style={{
            background: 'rgba(8,13,26,0.95)',
            border: `1px solid ${NODE_COLORS[activeNode?.type ?? 'component']}30`,
          }}
        >
          <div className="font-bold mb-1" style={{ color: NODE_COLORS[activeNode?.type ?? 'component'] }}>
            {activeNode?.type.toUpperCase()}
          </div>
          <div className="font-semibold mb-2" style={{ color: '#e8f4ff' }}>{activeNode?.label}</div>
          <div style={{ color: '#4a6080' }}>
            {activeNode?.connections.length ?? 0} connections
          </div>
          <div className="mt-1" style={{ color: '#4a6080' }}>
            Strength: {((activeNode?.strength ?? 0) * 100).toFixed(0)}%
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-xs capitalize" style={{ color: '#4a6080', fontSize: '9px' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Search / Query Interface ───────────────────────────────────────────────────
const SAMPLE_QUERIES = [
  { q: 'oblique shock ramp angle Mach 5.5', result: 'Found 47 nodes · 8 papers · 3 formulas' },
  { q: 'Ti-6Al-4V max operating temperature', result: 'AMS 4928: T_max = 1750K (standard use)' },
  { q: 'total pressure recovery MIL-SPEC', result: 'MIL-E-5007D: η_p > 0.92 (subsonic), > 0.85 (supersonic)' },
  { q: 'NACA 0012 lift coefficient design point', result: 'Cl=0.412 at AoA=4.2°, M=0.72 (AIAA-99-4878)' },
];

const GraphRAGQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(SAMPLE_QUERIES.slice(0, 2));

  const handleQuery = (q: string) => {
    setLoading(true);
    setQuery(q);
    setTimeout(() => {
      const match = SAMPLE_QUERIES.find(s => s.q === q);
      const res = match?.result ?? `Graph traversal: Found ${Math.floor(Math.random() * 50 + 10)} related nodes across aerospace knowledge base`;
      setResult(res);
      setHistory(prev => [{ q, result: res }, ...prev.slice(0, 4)]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="af-glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search size={13} style={{ color: '#9f5ffb' }} />
        <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Graph RAG Query Interface</span>
        <span className="af-badge-info ml-auto">14,820 nodes · 38,410 edges</span>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && query && handleQuery(query)}
          placeholder="Ask: 'oblique shock ramp angle for Mach 5.5...'"
          className="af-input flex-1 text-xs"
        />
        <button
          onClick={() => query && handleQuery(query)}
          className="af-btn-primary px-4 text-xs whitespace-nowrap"
        >
          {loading ? '...' : 'Query'}
        </button>
      </div>

      {/* Sample queries */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SAMPLE_QUERIES.map(sq => (
          <button
            key={sq.q}
            onClick={() => handleQuery(sq.q)}
            className="text-xs px-2 py-1 rounded transition-all"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
              color: '#9f5ffb',
            }}
          >
            {sq.q.length > 35 ? sq.q.slice(0, 34) + '…' : sq.q}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg mb-3"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="text-xs font-bold mb-1" style={{ color: '#9f5ffb' }}>Graph RAG Result:</div>
          <div className="text-xs" style={{ color: '#e8f4ff' }}>{result}</div>
        </motion.div>
      )}

      {/* Query history */}
      {history.length > 0 && (
        <div>
          <div className="af-section-label mb-2">QUERY HISTORY</div>
          <div className="space-y-1">
            {history.slice(0, 3).map((h, i) => (
              <button
                key={i}
                onClick={() => handleQuery(h.q)}
                className="w-full text-left p-2 rounded text-xs transition-colors"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
              >
                <div style={{ color: '#8ba8cc' }}>{h.q}</div>
                <div style={{ color: '#4a6080', fontSize: '10px', marginTop: 2 }}>{h.result.slice(0, 60)}…</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Knowledge Stats ────────────────────────────────────────────────────────────
const KnowledgeStats: React.FC = () => {
  const stats = [
    { label: 'AIAA Papers', value: '2,847', icon: <BookOpen size={14} />, color: '#ff6b2b' },
    { label: 'Design Standards', value: '312', icon: <Database size={14} />, color: '#9f5ffb' },
    { label: 'Graph Nodes', value: '14,820', icon: <Share2 size={14} />, color: '#00d4ff' },
    { label: 'Relationships', value: '38,410', icon: <Link size={14} />, color: '#00ff88' },
    { label: 'Physics Formulas', value: '5,612', icon: <Zap size={14} />, color: '#ffaa00' },
    { label: 'Materials DB', value: '1,204', icon: <Database size={14} />, color: '#0066ff' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(s => (
        <div key={s.label} className="af-glass-card p-3 text-center">
          <div className="flex justify-center mb-1" style={{ color: s.color }}><span style={{ color: s.color }}>{s.icon}</span></div>
          <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
          <div className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
const KnowledgeGraphPanel: React.FC = () => {
  const categories = [
    { label: 'Propulsion Systems', count: 4821, pct: 32 },
    { label: 'Aerodynamics', count: 3240, pct: 22 },
    { label: 'Materials', count: 2180, pct: 15 },
    { label: 'Hypersonics', count: 1890, pct: 13 },
    { label: 'Structural', count: 1320, pct: 9 },
    { label: 'Thermal', count: 1369, pct: 9 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold af-gradient-text">Knowledge Graph (Graph RAG)</h2>
        <p className="text-xs" style={{ color: '#4a6080' }}>
          Aerospace domain knowledge · AIAA papers · MIL-SPEC standards · Physics formulas · Materials DB
        </p>
      </div>

      {/* Stats */}
      <KnowledgeStats />

      {/* Main graph + query */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Graph viz */}
        <div className="lg:col-span-3 af-glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Share2 size={13} />
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Live Knowledge Graph</span>
            <div className="af-dot-live ml-auto" />
          </div>
          <InteractiveKnowledgeGraph />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Categories */}
          <div className="af-glass-card p-4">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#4a6080' }}>
              Knowledge Categories
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: '#8ba8cc' }}>{cat.label}</span>
                    <span className="text-xs font-mono" style={{ color: '#00d4ff' }}>
                      {cat.count.toLocaleString()} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="af-progress-bar">
                    <div
                      className="af-progress-fill"
                      style={{
                        width: `${cat.pct}%`,
                        background: `hsl(${200 + cat.pct * 3}, 80%, 55%)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently added */}
          <div className="af-glass-card p-4">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#4a6080' }}>
              Recently Indexed
            </div>
            <div className="space-y-2">
              {[
                { title: 'AIAA-2026-1842', topic: 'Scramjet inlet unstart prediction via ML', time: '2h ago' },
                { title: 'NASA-TM-2026-215', topic: 'Hypersonic boundary layer transition', time: '4h ago' },
                { title: 'MIL-SPEC-8785', topic: 'Flying qualities requirements update', time: '1d ago' },
                { title: 'AIAA-2026-0341', topic: 'Aerospike nozzle altitude compensation', time: '2d ago' },
              ].map((item) => (
                <div key={item.title} className="p-2 rounded text-xs cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                >
                  <div className="font-semibold font-mono" style={{ color: '#ff6b2b' }}>{item.title}</div>
                  <div style={{ color: '#8ba8cc' }}>{item.topic}</div>
                  <div style={{ color: '#4a6080', fontSize: '10px' }}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Query Interface */}
      <GraphRAGQuery />
    </div>
  );
};

// Missing import fix
const Share2: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const Link: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export default KnowledgeGraphPanel;
