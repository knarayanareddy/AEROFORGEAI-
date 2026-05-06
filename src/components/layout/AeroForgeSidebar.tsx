import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Layers, Wind, Box, Share2,
  CheckSquare, TrendingUp, Download, ChevronRight,
  Cpu, Zap
} from 'lucide-react';
import type { AppSection } from '../../types/aeroforge';

interface SidebarItem {
  id: AppSection;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  phase?: 'P1' | 'P2' | 'P3';
  badge?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Mission Control',
    sublabel: 'System overview',
    icon: <LayoutDashboard size={16} />,
  },
  {
    id: 'cad-agent',
    label: 'CAD Agent',
    sublabel: 'NL → Geometry',
    icon: <Layers size={16} />,
    phase: 'P1',
    badge: 'ACTIVE',
  },
  {
    id: 'cfd-agent',
    label: 'CFD Agent',
    sublabel: 'Simulation pipeline',
    icon: <Wind size={16} />,
    phase: 'P2',
    badge: 'RUNNING',
  },
  {
    id: 'geometry-engine',
    label: 'Geometry Engine',
    sublabel: 'Aerospace primitives',
    icon: <Box size={16} />,
    phase: 'P1',
  },
  {
    id: 'knowledge-graph',
    label: 'Knowledge Graph',
    sublabel: 'Graph RAG / AIAA',
    icon: <Share2 size={16} />,
    phase: 'P1',
  },
  {
    id: 'validation',
    label: 'Validation Engine',
    sublabel: 'Constraints & standards',
    icon: <CheckSquare size={16} />,
    phase: 'P1',
  },
  {
    id: 'optimization',
    label: 'Optimization Loop',
    sublabel: 'Multi-objective opt.',
    icon: <TrendingUp size={16} />,
    phase: 'P3',
  },
  {
    id: 'export',
    label: 'Export & Handoff',
    sublabel: 'STEP / IGES / STL',
    icon: <Download size={16} />,
    phase: 'P1',
  },
];

const PHASE_COLORS: Record<string, string> = {
  P1: '#00d4ff',
  P2: '#00ff88',
  P3: '#7c3aed',
};

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'rgba(0,255,136,0.12)', text: '#00ff88' },
  RUNNING: { bg: 'rgba(255,170,0,0.12)', text: '#ffaa00' },
};

interface AeroForgeSidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const AeroForgeSidebar: React.FC<AeroForgeSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  return (
    <aside
      className="fixed left-0 top-14 bottom-0 w-56 flex flex-col z-40 overflow-y-auto"
      style={{
        background: 'rgba(5, 8, 16, 0.98)',
        borderRight: '1px solid rgba(0, 212, 255, 0.08)',
      }}
    >
      {/* ── LLM Provider Banner ─────────────────────────── */}
      <div
        className="mx-3 mt-3 mb-2 p-2.5 rounded-lg"
        style={{
          background: 'rgba(0, 212, 255, 0.05)',
          border: '1px solid rgba(0, 212, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Cpu size={12} style={{ color: '#00d4ff' }} />
          <span className="text-xs font-semibold" style={{ color: '#00d4ff' }}>LLM: Ollama</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00ff88' }} />
            <span className="text-xs" style={{ color: '#00ff88' }}>LOCAL</span>
          </div>
        </div>
        <div className="text-xs" style={{ color: '#4a6080' }}>llama3.2:70b</div>
        <div className="mt-1.5 af-progress-bar">
          <div className="af-progress-fill" style={{ width: '34%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: '#4a6080' }}>VRAM</span>
          <span className="text-xs" style={{ color: '#8ba8cc' }}>28.4 / 80 GB</span>
        </div>
      </div>

      {/* ── Nav Items ───────────────────────────────────── */}
      <nav className="flex-1 px-2 py-1">
        <div className="af-section-label mt-2 mb-1 px-2">NAVIGATION</div>
        {SIDEBAR_ITEMS.map((item, idx) => {
          const isActive = activeSection === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left mb-0.5"
              style={{ display: 'block' }}
            >
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}`,
                  color: isActive ? '#00d4ff' : '#8ba8cc',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    color: isActive ? '#00d4ff' : '#4a6080',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                    {item.phase && (
                      <span
                        className="text-xs px-1 rounded font-bold flex-shrink-0"
                        style={{
                          color: PHASE_COLORS[item.phase],
                          background: `${PHASE_COLORS[item.phase]}18`,
                          fontSize: '9px',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {item.phase}
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: '#4a6080', fontSize: '10px' }}>
                    {item.sublabel}
                  </div>
                </div>

                {/* Badge / Arrow */}
                {item.badge ? (
                  <span
                    className="text-xs px-1 py-0.5 rounded font-bold flex-shrink-0"
                    style={{
                      background: BADGE_COLORS[item.badge]?.bg,
                      color: BADGE_COLORS[item.badge]?.text,
                      fontSize: '9px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <ChevronRight size={12} style={{ color: '#00d4ff', flexShrink: 0 }} />
                ) : null}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* ── Bottom: Autonomy Level ────────────────────── */}
      <div
        className="mx-3 mb-3 p-3 rounded-lg"
        style={{
          background: 'rgba(124, 58, 237, 0.08)',
          border: '1px solid rgba(124, 58, 237, 0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap size={12} style={{ color: '#9f5ffb' }} />
          <span className="text-xs font-semibold" style={{ color: '#9f5ffb' }}>Autonomy Level</span>
        </div>
        <div className="text-xs font-bold" style={{ color: '#e8f4ff' }}>
          LEVEL 2 — SUPERVISED
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
          AI runs full pipeline, engineer reviews output
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2, 3, 4].map((lvl) => (
            <div
              key={lvl}
              className="flex-1 h-1 rounded-full"
              style={{
                background: lvl <= 2 ? '#9f5ffb' : 'rgba(124,58,237,0.15)',
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default AeroForgeSidebar;
