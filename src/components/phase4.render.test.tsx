import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportControlPanel } from './phase1/ExportControlPanel';

const html = renderToStaticMarkup(<ExportControlPanel />);
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Phase 4 export-control panel', () => {
  it('shows a live decision, not a fixture', () => {
    // The default state is Mach 5.5 under ECL:ML, which the policy denies. If
    // this ever renders "PERMITTED" by default, either the policy changed or the
    // panel stopped evaluating it.
    expect(text).toContain('EXPORT DENIED');
    expect(text).toMatch(/exceeds its Mach limit/);
  });

  it('states that the thresholds are invented', () => {
    // The panel must not let an operator mistake this for legal advice.
    expect(text).toMatch(/invented placeholders/);
    expect(text).toMatch(/not an export decision tool/);
  });

  it('states the audit chain limit up front', () => {
    expect(text).toMatch(/does not|does [?]not/);
    expect(text).toMatch(/witnessed elsewhere/);
  });

  it('reports the chain state', () => {
    expect(text).toMatch(/chain verifies|CHAIN BROKEN/);
  });
});

describe('Phase 4 panel: the category field', () => {
  // The policy now refuses any export with no category asserted, so the panel
  // must ship in that state rather than pre-selecting "none" and looking
  // approved. Asserted against rendered markup, not the component's default.
  it('renders the category selector with NOTHING asserted', () => {
    expect(text).toContain('Category (required)');
    expect(text).toContain('not asserted');
  });

  it('offers exactly the four valid categories', () => {
    for (const c of ['none', 'USML-IV', 'USML-VIII', 'EAR-9A']) {
      expect(text).toContain(c);
    }
  });

  it('starts denied because no category is asserted', () => {
    expect(text).toContain('EXPORT DENIED');
    expect(text).toMatch(/no export-control category asserted/);
  });
});
