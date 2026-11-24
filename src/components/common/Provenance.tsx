// Provenance labelling: every panel must say where its numbers came from.
//
// Phase 0 of the pathway (docs/pathway-forward.md §5) makes one requirement of
// the UI above all others: a reviewer must be able to tell, in one glance,
// whether a number was SOLVED, DERIVED from physics, SIMULATED, or typed in by
// hand. This module is the single vocabulary for that, plus the banner that
// appears while the app is still a demo.

import React from 'react';
import { SOURCE_META, type DataSource } from './provenanceMeta';

export type { DataSource } from './provenanceMeta';

/** Small pill that labels the provenance of a number or a panel. */
export const ProvenanceChip: React.FC<{
  source: DataSource;
  detail?: string;
  className?: string;
}> = ({ source, detail, className }) => {
  const m = SOURCE_META[source];
  return (
    <span
      className={className}
      title={detail ?? m.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: m.color,
        background: m.background,
        border: `1px solid ${m.border}`,
        whiteSpace: 'nowrap',
        cursor: 'help',
      }}
    >
      {m.label}
    </span>
  );
};

/**
 * The persistent banner. It stays until Phase 1 ships a real solver, and it
 * exists so that no screenshot of this app can be mistaken for validated output.
 */
export const DemoBanner: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(255,170,0,0.14), rgba(255,107,43,0.10))',
        borderBottom: '1px solid rgba(255,170,0,0.30)',
        color: '#ffd27a',
        fontSize: 11.5,
        lineHeight: 1.5,
        padding: '5px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
      role="note"
      aria-label="Demo mode notice"
    >
      <span style={{ fontWeight: 800, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        DEMO MODE
      </span>
      <span style={{ color: '#e8c98a' }}>
        Physics values are <b style={{ color: '#ffd27a' }}>derived from exact relations</b>
        {' '}(oblique-shock, ISA, material allowables) and unit-tested. Nothing is solved:
        no CAD kernel, no mesher and no CFD solver is attached to this build.
        {expanded ? (
          <>
            {' '}
            Values marked <b>SIMULATED</b> are fixtures and timers; values marked{' '}
            <b>UNAVAILABLE</b> require a solver or a measured part and are deliberately not
            filled in. See <code>docs/pathway-forward.md</code> §5 for the roadmap that removes
            this banner.
          </>
        ) : (
          <span style={{ opacity: 0.75 }}> · click for detail</span>
        )}
      </span>
    </div>
  );
};
