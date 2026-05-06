import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, BookOpen } from 'lucide-react';
import { SCRAMJET_INLET_VALIDATION, SCRAMJET_INLET_PHYSICS } from '../../data/aeroforgeSimulationData';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const COMPLIANCE_MATRIX = [
  {
    standard: 'AIAA-2004-3351', domain: 'Hypersonic Inlets',
    checks: ['Total pressure recovery η_p > 0.85', 'Mass flow capture ratio > 0.90', 'Shock wave alignment ±2mm'],
    results: ['pass', 'pass', 'warn'], applicability: 'Phase 1 — CAD'
  },
  {
    standard: 'MIL-E-5007D', domain: 'Propulsion Systems',
    checks: ['Inlet pressure recovery', 'Distortion index DC60 < 0.45', 'Stability margin > 15%'],
    results: ['pass', 'pass', 'pass'], applicability: 'Phase 1 + 2'
  },
  {
    standard: 'AMS 4928', domain: 'Ti-6Al-4V Material',
    checks: ['Chemical composition', 'Tensile strength > 895 MPa', 'Operating temp < 1750K'],
    results: ['pass', 'pass', 'pass'], applicability: 'Phase 1'
  },
  {
    standard: 'AS9100D', domain: 'Aerospace Manufacturing',
    checks: ['Design traceability', 'Tolerance documentation', 'Configuration management'],
    results: ['pass', 'pass', 'pass'], applicability: 'Export'
  },
  {
    standard: 'NASA-CR-195446', domain: 'CFD Validation',
    checks: ['Grid independence study', 'Turbulence model sensitivity', 'Experimental correlation ±5%'],
    results: ['pass', 'pass', 'warn'], applicability: 'Phase 2'
  },
];

const RADAR_DATA = [
  { subject: 'Aerodynamics', score: 92, fullMark: 100 },
  { subject: 'Structural', score: 87, fullMark: 100 },
  { subject: 'Thermal', score: 94, fullMark: 100 },
  { subject: 'Manufacturing', score: 98, fullMark: 100 },
  { subject: 'Safety', score: 89, fullMark: 100 },
  { subject: 'Compliance', score: 96, fullMark: 100 },
];

const ValidationEnginePanel: React.FC = () => {
  const [activeStandard, setActiveStandard] = useState(0);
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResults, setCheckResults] = useState<Record<string, 'pass' | 'warn' | 'fail' | 'pending'>>({});

  const handleRunValidation = () => {
    setRunningCheck(true);
    const results: Record<string, 'pass' | 'warn' | 'fail' | 'pending'> = {};
    SCRAMJET_INLET_VALIDATION.forEach(v => { results[v.id] = 'pending'; });
    setCheckResults(results);

    SCRAMJET_INLET_VALIDATION.forEach((v, i) => {
      setTimeout(() => {
        setCheckResults(prev => ({ ...prev, [v.id]: v.status as 'pass' | 'warn' | 'fail' | 'pending' }));
        if (i === SCRAMJET_INLET_VALIDATION.length - 1) setRunningCheck(false);
      }, (i + 1) * 300);
    });
  };

  const passCount = SCRAMJET_INLET_VALIDATION.filter(v => v.status === 'pass').length;
  const warnCount = SCRAMJET_INLET_VALIDATION.filter(v => v.status === 'warn').length;
  const failCount = SCRAMJET_INLET_VALIDATION.filter(v => v.status === 'fail').length;
  const overallScore = ((passCount + warnCount * 0.5) / SCRAMJET_INLET_VALIDATION.length * 100).toFixed(0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold af-gradient-text">Validation & Constraint Engine</h2>
          <p className="text-xs" style={{ color: '#4a6080' }}>
            Physics constraints · AIAA standards · MIL-SPEC compliance · AS9100D · FAA/EASA
          </p>
        </div>
        <button
          onClick={handleRunValidation}
          disabled={runningCheck}
          className="af-btn-primary flex items-center gap-2"
        >
          <Shield size={14} />
          {runningCheck ? 'Running...' : 'Run Full Validation'}
        </button>
      </div>

      {/* Score Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="af-glass-card p-4 text-center" style={{ border: '1px solid rgba(0,255,136,0.2)' }}>
          <div className="text-2xl font-bold" style={{ color: '#00ff88' }}>{overallScore}%</div>
          <div className="text-xs mt-1" style={{ color: '#4a6080' }}>Overall Score</div>
          <div className="af-progress-bar mt-2">
            <div className="af-progress-fill" style={{ width: `${overallScore}%`, background: '#00ff88' }} />
          </div>
        </div>
        <div className="af-glass-card p-4 text-center" style={{ border: '1px solid rgba(0,255,136,0.15)' }}>
          <div className="text-2xl font-bold" style={{ color: '#00ff88' }}>{passCount}</div>
          <div className="text-xs mt-1" style={{ color: '#4a6080' }}>Checks PASS</div>
          <div className="flex justify-center mt-1">
            <CheckCircle size={16} style={{ color: '#00ff88' }} />
          </div>
        </div>
        <div className="af-glass-card p-4 text-center" style={{ border: '1px solid rgba(255,170,0,0.15)' }}>
          <div className="text-2xl font-bold" style={{ color: '#ffaa00' }}>{warnCount}</div>
          <div className="text-xs mt-1" style={{ color: '#4a6080' }}>Checks WARN</div>
          <div className="flex justify-center mt-1">
            <AlertTriangle size={16} style={{ color: '#ffaa00' }} />
          </div>
        </div>
        <div className="af-glass-card p-4 text-center" style={{ border: '1px solid rgba(255,59,92,0.15)' }}>
          <div className="text-2xl font-bold" style={{ color: '#ff3b5c' }}>{failCount}</div>
          <div className="text-xs mt-1" style={{ color: '#4a6080' }}>Checks FAIL</div>
          <div className="flex justify-center mt-1">
            <XCircle size={16} style={{ color: '#ff3b5c' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Checks list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Validation checks */}
          <div className="af-glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare size={14} style={{ color: '#00d4ff' }} />
              <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Validation Checks — Scramjet Inlet M5.5</span>
            </div>
            <div className="space-y-2">
              {SCRAMJET_INLET_VALIDATION.map((v, i) => {
                const status = checkResults[v.id] ?? v.status;
                const colors = { pass: '#00ff88', warn: '#ffaa00', fail: '#ff3b5c', pending: '#4a6080' };
                const color = colors[status];
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {status === 'pass' && <CheckCircle size={14} style={{ color }} />}
                      {status === 'warn' && <AlertTriangle size={14} style={{ color }} />}
                      {status === 'fail' && <XCircle size={14} style={{ color }} />}
                      {status === 'pending' && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>{v.check}</span>
                        <span className={`af-badge-${status === 'pending' ? 'info' : status}`}>
                          {status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs">
                        <span><span style={{ color: '#4a6080' }}>Computed: </span>
                          <span style={{ color }}>{v.computed}</span></span>
                        <span><span style={{ color: '#4a6080' }}>Required: </span>
                          <span style={{ color: '#8ba8cc' }}>{v.required}</span></span>
                        <span><span style={{ color: '#4a6080' }}>Conf: </span>
                          <span style={{ color }}>{(v.confidence * 100).toFixed(0)}%</span></span>
                      </div>
                      <div className="text-xs mt-1 font-mono" style={{ color: '#9f5ffb' }}>
                        Standard: {v.standard}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Physics constraints */}
          <div className="af-glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: '#00d4ff' }} />
              <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Physics Constraint Validation</span>
            </div>
            <div className="overflow-x-auto">
              <table className="af-table">
                <thead>
                  <tr>
                    <th>Constraint</th>
                    <th>Formula</th>
                    <th>Computed</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SCRAMJET_INLET_PHYSICS.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: '#e8f4ff' }}>{c.name}</td>
                      <td className="font-mono text-xs" style={{ color: '#9f5ffb' }}>{c.formula}</td>
                      <td className="font-mono font-semibold" style={{ color: '#00d4ff' }}>{c.computed}</td>
                      <td className="font-mono" style={{ color: '#8ba8cc' }}>{c.target}</td>
                      <td><span className={`af-badge-${c.status}`}>{c.status.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Radar + Compliance */}
        <div className="space-y-4">
          {/* Radar chart */}
          <div className="af-glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: '#9f5ffb' }} />
              <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Domain Compliance Radar</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="rgba(0,212,255,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#4a6080', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#00d4ff"
                  fill="#00d4ff"
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Standards compliance matrix */}
          <div className="af-glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} style={{ color: '#ff6b2b' }} />
              <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Standards Compliance</span>
            </div>
            <div className="space-y-1.5">
              {COMPLIANCE_MATRIX.map((std, i) => {
                const allPass = std.results.every(r => r === 'pass');
                const hasWarn = std.results.some(r => r === 'warn');
                const overallSt = allPass ? 'pass' : hasWarn ? 'warn' : 'fail';
                return (
                  <button
                    key={std.standard}
                    onClick={() => setActiveStandard(i)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: activeStandard === i ? `${overallSt === 'pass' ? 'rgba(0,255,136,0.08)' : 'rgba(255,170,0,0.08)'}` : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${activeStandard === i ? (overallSt === 'pass' ? 'rgba(0,255,136,0.2)' : 'rgba(255,170,0,0.2)') : 'rgba(0,212,255,0.05)'}`,
                    }}
                  >
                    <div>
                      <div className="text-xs font-mono font-semibold" style={{ color: '#00d4ff' }}>{std.standard}</div>
                      <div className="text-xs" style={{ color: '#4a6080', fontSize: '10px' }}>{std.domain}</div>
                    </div>
                    <span className={`af-badge-${overallSt}`}>
                      {std.results.filter(r => r === 'pass').length}/{std.results.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detail of selected standard */}
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,212,255,0.08)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#00d4ff' }}>
                {COMPLIANCE_MATRIX[activeStandard].standard}
              </div>
              {COMPLIANCE_MATRIX[activeStandard].checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  <span style={{ color: COMPLIANCE_MATRIX[activeStandard].results[i] === 'pass' ? '#00ff88' : '#ffaa00' }}>
                    {COMPLIANCE_MATRIX[activeStandard].results[i] === 'pass' ? '✓' : '⚠'}
                  </span>
                  <span style={{ color: '#8ba8cc' }}>{check}</span>
                </div>
              ))}
              <div className="text-xs mt-2" style={{ color: '#4a6080' }}>
                Applicability: {COMPLIANCE_MATRIX[activeStandard].applicability}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationEnginePanel;
