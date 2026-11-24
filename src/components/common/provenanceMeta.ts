// Provenance vocabulary — kept in its own module so the component file only
// exports components (react-refresh requirement).

export type DataSource =
  /** Computed from exact relations with tests behind it (oblique shock, ISA). */
  | 'derived'
  /** Static fixtures / timers. Constant, reproducible, not a result. */
  | 'simulated'
  /** Must come from a solver or a measured part; nothing has run yet. */
  | 'unavailable'
  /** Produced by a real worker (CAD kernel, solver, validator) — Phase 1+. */
  | 'solved';

interface SourceMeta {
  label: string;
  title: string;
  color: string;
  background: string;
  border: string;
}

export const SOURCE_META: Record<DataSource, SourceMeta> = {
  solved: {
    label: 'SOLVED',
    title: 'Produced by a real worker process. No worker exists in this build yet.',
    color: '#00ff88',
    background: 'rgba(0,255,136,0.08)',
    border: 'rgba(0,255,136,0.25)',
  },
  derived: {
    label: 'DERIVED',
    title:
      'Computed from exact physics (oblique-shock, ISA, material allowables) with unit tests. Reproducible.',
    color: '#00d4ff',
    background: 'rgba(0,212,255,0.08)',
    border: 'rgba(0,212,255,0.25)',
  },
  simulated: {
    label: 'SIMULATED',
    title:
      'Fixture or timer. Deterministic and seeded, but not a result of any computation about this design.',
    color: '#ffaa00',
    background: 'rgba(255,170,0,0.08)',
    border: 'rgba(255,170,0,0.25)',
  },
  unavailable: {
    label: 'UNAVAILABLE',
    title:
      'Requires a solver or a physical measurement. Reporting it as a value would be fabrication.',
    color: '#8ba8cc',
    background: 'rgba(139,168,204,0.08)',
    border: 'rgba(139,168,204,0.25)',
  },
};

