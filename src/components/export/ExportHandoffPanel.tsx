import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Package, FileText, GitBranch, CheckCircle, Shield, Zap } from 'lucide-react';

const EXPORT_FORMATS = [
  { id: 'step', label: 'STEP (AP214)', ext: '.step', size: '2.3 MB', category: 'CAD', desc: 'ISO 10303-214 · FreeCAD, CATIA, NX compatible', color: '#00d4ff' },
  { id: 'iges', label: 'IGES 5.3', ext: '.igs', size: '1.8 MB', category: 'CAD', desc: 'ANSI Y14.26M · Legacy CAD interchange', color: '#00d4ff' },
  { id: 'stl', label: 'STL (Binary)', ext: '.stl', size: '4.1 MB', category: 'CAD', desc: 'Stereolithography · 3D printing / meshing', color: '#0066ff' },
  { id: 'brep', label: 'B-Rep (OCC)', ext: '.brep', size: '1.2 MB', category: 'CAD', desc: 'OpenCASCADE B-Rep format · Exact geometry', color: '#0066ff' },
  { id: 'vtk', label: 'VTK PolyData', ext: '.vtk', size: '184 MB', category: 'CFD', desc: 'ParaView / VTK visualization · Mach field', color: '#9f5ffb' },
  { id: 'openfoam', label: 'OpenFOAM Case', ext: '.tar.gz', size: '47 MB', category: 'CFD', desc: 'Complete case: mesh + fields + control', color: '#9f5ffb' },
  { id: 'su2', label: 'SU2 Config', ext: '.cfg', size: '128 KB', category: 'CFD', desc: 'Stanford University Solver configuration', color: '#7c3aed' },
  { id: 'pdf', label: 'Design Report', ext: '.pdf', size: '3.8 MB', category: 'Report', desc: 'Full traceability · AIAA standard format', color: '#ff6b2b' },
  { id: 'json', label: 'CEP Bundle', ext: '.json', size: '248 KB', category: 'Platform', desc: 'CAD Exchange Protocol · Complete parameter set', color: '#00ff88' },
  { id: 'csv', label: 'Performance Data', ext: '.csv', size: '2.1 MB', category: 'Report', desc: 'Force coefficients · Wall pressures · BL data', color: '#ffaa00' },
];

const CEP_MANIFEST = {
  protocol_version: 'CEP/1.0',
  session_id: 'af-2026-05-14-scramjet-m5p5-001',
  component_type: 'mixed-compression-scramjet-inlet',
  design_mach: 5.5,
  cad_tool: 'FreeCAD 0.21',
  cfd_solver: 'rhoCentralFoam (OpenFOAM 10)',
  geometry_file: 'scramjet_inlet_M5p5_v1.step',
  mesh_file: 'snappyHexMesh_4p2M.tar.gz',
  bc_file: 'boundary_conditions.json',
  validation_status: 'PASS (7/8, 1 WARN)',
  eta_p: 0.873,
  mass_flow: 12.1,
  confidence_score: 0.934,
  generated_at: '2026-05-14T18:42:31Z',
  autonomy_level: 2,
  llm_provider: 'ollama/llama3.2:70b',
};

const ITARPanel: React.FC = () => (
  <div className="af-glass-card p-4" style={{ border: '1px solid rgba(255,107,43,0.2)' }}>
    <div className="flex items-center gap-2 mb-3">
      <Shield size={14} style={{ color: '#ff6b2b' }} />
      <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Security & Compliance (ITAR/EAR)</span>
      <span className="af-badge-warn ml-auto">CONTROLLED</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        { label: 'ITAR Classification', value: 'Category VIII — Aircraft & Propulsion', ok: true },
        { label: 'EAR ECCN', value: 'EAR99 (design tool, no controlled data)', ok: true },
        { label: 'IP Protection', value: 'Local-only LLM (Ollama) — no data egress', ok: true },
        { label: 'Access Control', value: 'User-level encryption + audit log', ok: true },
        { label: 'Export Restriction', value: 'STEP geometry cleared for export', ok: true },
        { label: 'Data Residency', value: 'On-premises · Air-gap capable', ok: true },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-2 p-2 rounded text-xs"
          style={{ background: 'rgba(255,107,43,0.05)', border: '1px solid rgba(255,107,43,0.1)' }}>
          <CheckCircle size={12} style={{ color: '#00ff88', flexShrink: 0 }} />
          <div>
            <div className="font-semibold" style={{ color: '#e8f4ff' }}>{item.label}</div>
            <div style={{ color: '#8ba8cc', fontSize: '10px' }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ExportHandoffPanel: React.FC = () => {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['step', 'pdf', 'json']);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'formats' | 'cep' | 'itar'>('formats');

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleDownload = (id: string) => {
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
      setDownloaded(prev => [...prev, id]);
    }, 1200);
  };

  const handleBundleExport = () => {
    selectedFormats.forEach((id, i) => {
      setTimeout(() => handleDownload(id), i * 300);
    });
  };

  const categories = [...new Set(EXPORT_FORMATS.map(f => f.category))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold af-gradient-text">Export & Handoff</h2>
          <p className="text-xs" style={{ color: '#4a6080' }}>
            STEP · IGES · STL · OpenFOAM · CEP Protocol · Design Report · ITAR/EAR compliant
          </p>
        </div>
        <div className="flex gap-2">
          <button className="af-btn-secondary flex items-center gap-2 text-xs py-2 px-3">
            <Package size={13} /> Bundle ({selectedFormats.length})
          </button>
          <button
            onClick={handleBundleExport}
            className="af-btn-primary flex items-center gap-2"
          >
            <Download size={14} /> Export Selected
          </button>
        </div>
      </div>

      {/* Session banner */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,212,255,0.06) 100%)',
          border: '1px solid rgba(0,255,136,0.15)',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} style={{ color: '#00ff88' }} />
            <span className="text-sm font-bold" style={{ color: '#00ff88' }}>Design Package Ready</span>
          </div>
          <div className="h-4 w-px" style={{ background: 'rgba(0,255,136,0.3)' }} />
          <div className="text-xs" style={{ color: '#8ba8cc' }}>Session: af-2026-05-14-scramjet-m5p5-001</div>
          <div className="h-4 w-px" style={{ background: 'rgba(0,255,136,0.3)' }} />
          <div className="text-xs" style={{ color: '#8ba8cc' }}>Component: Mixed-Compression Scramjet Inlet M5.5</div>
          <div className="h-4 w-px" style={{ background: 'rgba(0,255,136,0.3)' }} />
          <span className="af-badge-pass">7/8 VALIDATED</span>
          <span className="af-badge-info">η_p=87.3%</span>
          <span className="af-badge-info ml-auto">v1.2.0</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="af-glass-card overflow-hidden">
        <div className="flex border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          {[
            { id: 'formats', label: 'Export Formats', icon: <Download size={12} /> },
            { id: 'cep', label: 'CEP Protocol Manifest', icon: <GitBranch size={12} /> },
            { id: 'itar', label: 'Security & Compliance', icon: <Shield size={12} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition-colors"
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
          {activeTab === 'formats' && (
            <div className="space-y-4">
              {categories.map(cat => (
                <div key={cat}>
                  <div className="af-section-label mb-2">{cat.toUpperCase()} FILES</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {EXPORT_FORMATS.filter(f => f.category === cat).map(fmt => {
                      const isSelected = selectedFormats.includes(fmt.id);
                      const isDl = downloading === fmt.id;
                      const isDone = downloaded.includes(fmt.id);
                      return (
                        <motion.div
                          key={fmt.id}
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{
                            background: isSelected ? `${fmt.color}08` : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${isSelected ? `${fmt.color}25` : 'rgba(0,212,255,0.05)'}`,
                          }}
                          onClick={() => toggleFormat(fmt.id)}
                        >
                          {/* Checkbox */}
                          <div
                            className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center"
                            style={{
                              borderColor: isSelected ? fmt.color : '#4a6080',
                              background: isSelected ? fmt.color : 'transparent',
                            }}
                          >
                            {isSelected && <CheckCircle size={10} style={{ color: '#000' }} />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold font-mono" style={{ color: fmt.color }}>{fmt.label}</span>
                              <span className="text-xs" style={{ color: '#4a6080' }}>{fmt.ext}</span>
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#4a6080', fontSize: '10px' }}>{fmt.desc}</div>
                          </div>

                          {/* Size + download */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs" style={{ color: '#4a6080' }}>{fmt.size}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(fmt.id); }}
                              className="p-1.5 rounded-lg transition-all"
                              style={{
                                background: isDone ? 'rgba(0,255,136,0.12)' : `${fmt.color}12`,
                                color: isDone ? '#00ff88' : fmt.color,
                              }}
                            >
                              {isDl ? (
                                <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: fmt.color }} />
                              ) : isDone ? (
                                <CheckCircle size={12} />
                              ) : (
                                <Download size={12} />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cep' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={13} style={{ color: '#00ff88' }} />
                <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>CAD Exchange Protocol (CEP) — v1.0</span>
                <span className="af-badge-pass ml-auto">READY FOR CFD AGENT</span>
              </div>
              <div className="af-terminal rounded-xl overflow-hidden">
                <div className="af-terminal-header">
                  <div className="af-terminal-dot" style={{ background: '#ff5f57' }} />
                  <div className="af-terminal-dot" style={{ background: '#febc2e' }} />
                  <div className="af-terminal-dot" style={{ background: '#28c840' }} />
                  <span className="text-xs ml-2" style={{ color: '#4a6080' }}>CEP manifest · scramjet_inlet_M5p5_cep_v1.json</span>
                </div>
                <div className="p-4">
                  <pre className="text-xs overflow-x-auto" style={{ color: '#a8d8ff', lineHeight: 1.8 }}>
{JSON.stringify(CEP_MANIFEST, null, 2)
  .split('\n')
  .map(line => {
    if (line.includes(':')) {
      const [key, ...rest] = line.split(':');
      return `${key}: <span style="color:#00ff88">${rest.join(':')}</span>`;
    }
    return line;
  })
  .join('\n')}
                  </pre>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="af-btn-secondary flex items-center gap-2 text-xs py-2 px-3">
                  <GitBranch size={12} /> Send to CFD Agent
                </button>
                <button className="af-btn-secondary flex items-center gap-2 text-xs py-2 px-3">
                  <Download size={12} /> Download CEP Bundle
                </button>
              </div>
            </div>
          )}

          {activeTab === 'itar' && <ITARPanel />}
        </div>
      </div>

      {/* Traceability */}
      <div className="af-glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={14} style={{ color: '#ff6b2b' }} />
          <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>Design Traceability Chain</span>
          <span className="af-badge-pass ml-auto">AS9100D COMPLIANT</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'NL Intent', detail: '"Mach 5.5 scramjet inlet..."', color: '#9f5ffb' },
            { label: 'Requirements', detail: '7 extracted params', color: '#00d4ff' },
            { label: 'Physics Calc', detail: 'Oblique shock theory', color: '#0066ff' },
            { label: 'CAD Geometry', detail: 'FreeCAD · 47 features', color: '#00d4ff' },
            { label: 'Validation', detail: '7/8 PASS · AIAA/MIL', color: '#00ff88' },
            { label: 'CFD Simulation', detail: 'rhoCentralFoam · 4.2M cells', color: '#00ff88' },
            { label: 'Export Package', detail: 'STEP + Report + CEP', color: '#ffaa00' },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <div
                className="p-2 rounded-lg text-center"
                style={{ background: `${step.color}08`, border: `1px solid ${step.color}20`, minWidth: '90px' }}
              >
                <div className="text-xs font-semibold" style={{ color: step.color }}>{step.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#4a6080', fontSize: '10px' }}>{step.detail}</div>
              </div>
              {i < 6 && (
                <div className="text-sm" style={{ color: '#4a6080' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportHandoffPanel;
