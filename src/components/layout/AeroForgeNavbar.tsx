import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, ChevronDown, Settings, Bell,
  Wifi, Zap, Shield, Activity
} from 'lucide-react';

interface AeroForgeNavbarProps {
  activeSection: string;
}

const AeroForgeNavbar: React.FC<AeroForgeNavbarProps> = ({ activeSection }) => {
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const notifications = [
    { id: 1, type: 'success', message: 'Scramjet inlet M5.5 — CAD complete', time: '2m ago' },
    { id: 2, type: 'info', message: 'CFD mesh generation started (4.2M cells)', time: '8m ago' },
    { id: 3, type: 'warn', message: 'Cowl shock alignment: ±3.2mm (tolerance ±2mm)', time: '12m ago' },
    { id: 4, type: 'success', message: 'Knowledge graph updated: +142 AIAA nodes', time: '1h ago' },
  ];

  const sectionLabels: Record<string, string> = {
    dashboard: 'Mission Control',
    'cad-agent': 'CAD Agent — Phase 1',
    'cfd-agent': 'CFD Agent — Phase 2',
    'geometry-engine': 'Geometry Engine',
    'knowledge-graph': 'Knowledge Graph',
    validation: 'Validation Engine',
    optimization: 'Optimization Loop',
    export: 'Export & Handoff',
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: 'rgba(5, 8, 16, 0.95)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* ── Left: Logo ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
                boxShadow: '0 0 16px rgba(0, 212, 255, 0.4)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: '#00ff88' }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: '#00ff88',
                  animation: 'af-ping 1.5s ease-out infinite',
                }}
              />
            </div>
          </div>
          <div>
            <div
              className="text-sm font-bold tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AEROFORGE AI
            </div>
            <div className="text-xs" style={{ color: '#4a6080', marginTop: '-2px' }}>
              Natural Language → CAD → CFD
            </div>
          </div>
        </div>

        {/* ── Center: Breadcrumb ──────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>Platform</span>
          <ChevronDown size={12} style={{ color: '#4a6080', transform: 'rotate(-90deg)' }} />
          <span
            className="text-xs font-semibold px-2 py-1 rounded"
            style={{
              color: '#00d4ff',
              background: 'rgba(0, 212, 255, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.15)',
            }}
          >
            {sectionLabels[activeSection] || 'Dashboard'}
          </span>
        </div>

        {/* ── Right: Status + Controls ────────────────────── */}
        <div className="flex items-center gap-3">
          {/* System Status */}
          <div className="hidden md:flex items-center gap-3">
            <StatusIndicator icon={<Cpu size={11} />} label="CAD Agent" status="active" />
            <StatusIndicator icon={<Activity size={11} />} label="CFD Agent" status="active" />
            <StatusIndicator icon={<Shield size={11} />} label="Validation" status="active" />
            <StatusIndicator icon={<Wifi size={11} />} label="Ollama:70b" status="local" />
          </div>

          {/* Divider */}
          <div className="h-5 w-px" style={{ background: 'rgba(0, 212, 255, 0.12)' }} />

          {/* Clock */}
          <div className="hidden lg:block text-xs font-mono" style={{ color: '#4a6080' }}>
            {time.toUTCString().slice(17, 25)} UTC
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: '#8ba8cc' }}
            >
              <Bell size={16} />
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: '#ff3b5c' }}
              />
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(8, 13, 26, 0.98)',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    zIndex: 200,
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#4a6080' }}>System Events</span>
                      <span className="af-badge-info">{notifications.length} new</span>
                    </div>
                  </div>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer"
                      style={{
                        borderColor: 'rgba(0,212,255,0.05)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background:
                            n.type === 'success' ? '#00ff88' :
                            n.type === 'warn' ? '#ffaa00' : '#00d4ff',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: '#8ba8cc' }}>{n.message}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: '#8ba8cc' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: '#fff' }}
              >
                AE
              </div>
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-10 w-56 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(8, 13, 26, 0.98)',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    zIndex: 200,
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                    <div className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Aerospace Engineer</div>
                    <div className="text-xs" style={{ color: '#4a6080' }}>Level 2 — SUPERVISED</div>
                  </div>
                  {[
                    { label: 'Autonomy Settings', icon: <Zap size={13} /> },
                    { label: 'LLM Configuration', icon: <Cpu size={13} /> },
                    { label: 'Security & ITAR', icon: <Shield size={13} /> },
                    { label: 'Preferences', icon: <Settings size={13} /> },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-xs transition-colors"
                      style={{ color: '#8ba8cc' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#e8f4ff';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '#8ba8cc';
                      }}
                    >
                      <span style={{ color: '#00d4ff' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

const StatusIndicator: React.FC<{
  icon: React.ReactNode;
  label: string;
  status: 'active' | 'idle' | 'local' | 'error';
}> = ({ icon, label, status }) => {
  const colors = {
    active: '#00ff88',
    idle: '#ffaa00',
    local: '#00d4ff',
    error: '#ff3b5c',
  };
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        background: 'rgba(0, 212, 255, 0.04)',
        border: '1px solid rgba(0, 212, 255, 0.08)',
      }}
    >
      <div style={{ color: colors[status] }}>{icon}</div>
      <span className="text-xs font-medium" style={{ color: '#4a6080' }}>{label}</span>
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: colors[status] }}
      />
    </div>
  );
};

export default AeroForgeNavbar;
