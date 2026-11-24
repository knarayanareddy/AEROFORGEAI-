import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WedgeVerificationPanel from './phase1/WedgeVerificationPanel';

describe('Phase 1 panel', () => {
  const html = renderToStaticMarkup(<WedgeVerificationPanel />);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('states the exit criterion and the provenance', () => {
    expect(text).toContain('within 2 %');
    expect(text).toContain('SOLVED');
  });
  it('offers no result before a run', () => {
    expect(text).not.toContain('Exit criterion met');
  });
  it('labels the SU2 sidecar inputs as not run', () => {
    // The strongest guard against this feature misleading anyone is that the
    // "not run" badge is present in the markup before any interaction.
    expect(text).toContain('NOT RUN');
    expect(text).toMatch(/has NOT been executed/);
  });
});
