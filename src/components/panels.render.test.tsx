// Render-level regression tests.
//
// The Phase 0 audit found fabricated numbers in the *rendered* DOM that a grep
// over the data file would never catch, because they lived as JSX literals.
// These tests assert on real server-rendered markup, which is the only reliable
// way to keep them from coming back.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import CFDAgentPanel from '../components/cfd/CFDAgentPanel';
import ExportHandoffPanel from '../components/export/ExportHandoffPanel';
import CADAgentPanel from '../components/cad/CADAgentPanel';

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// Tab content that is not on the default tab still has to be checked, so read
// the source for those assertions instead of pretending render() covered them.
const cfdSource = readFileSync(
  new URL('../components/cfd/CFDAgentPanel.tsx', import.meta.url),
  'utf8',
);
const exportSource = readFileSync(
  new URL('../components/export/ExportHandoffPanel.tsx', import.meta.url),
  'utf8',
);

describe('CFD panel', () => {
  const text = strip(renderToStaticMarkup(<CFDAgentPanel />));

  it('reports the derived isolator Mach, not the fictional 2.8', () => {
    expect(text).toContain('4.13');
    expect(text).toContain('ISOLATOR M≈4.1');
    expect(text).not.toContain('ISOLATOR M≈2.8');
  });

  it('does not print sea-level pressure as a total condition', () => {
    expect(text).not.toContain('101325');
    expect(text).not.toContain('216.65');
  });

  it('does not claim convergence', () => {
    expect(text).not.toContain('CONVERGED');
    // The header used to read "487 / 500 ITER", i.e. a solve in progress.
    expect(text).not.toContain('487 / 500');
    expect(text).toContain('no solve');
  });

  it('does not name a solver that does not exist', () => {
    // The solver list lives on the Config tab, so assert the bad name is gone
    // from the module rather than from the default-tab markup.
    expect(cfdSource).not.toContain('pisoCFD');
    expect(cfdSource).toContain('SU2_CFD');
  });

  it('carries no fabricated drag or residual values', () => {
    expect(text).not.toContain('0.0283');
    expect(text).not.toContain('2.4×10⁻⁶');
  });
});

describe('Export panel', () => {
  const text = strip(renderToStaticMarkup(<ExportHandoffPanel />));

  it('does not assert a certification it does not hold', () => {
    expect(text).not.toContain('AS9100D COMPLIANT');
    expect(text).not.toContain('ITAR/EAR compliant');
    // The compliance table is on the ITAR tab, so check the source too.
    expect(exportSource).toContain('NOT ENFORCED');
    expect(exportSource).not.toContain('Category VIII');
  });

  it('does not show the old validation score or recovery', () => {
    expect(text).not.toContain('7/8 VALIDATED');
    expect(text).not.toContain('87.3%');
    expect(text).toContain('π=0.905');
  });

  it('does not name a model that does not exist', () => {
    expect(text).not.toContain('llama3.2');
  });
});

describe('CAD panel', () => {
  const text = strip(renderToStaticMarkup(<CADAgentPanel />));

  it('shows the derived KPI chain', () => {
    expect(text).toContain('90.5%');
    expect(text).toContain('4.13');
    expect(text).not.toContain('87.3%');
    expect(text).not.toContain('±3.2mm');
  });

  it('shows the Ti-6Al-4V failure rather than a pass', () => {
    expect(text).toContain('1443 K');
    expect(text).toContain('870 K');
  });
});
