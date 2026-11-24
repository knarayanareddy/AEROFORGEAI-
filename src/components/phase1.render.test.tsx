import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WedgeVerificationPanel from './phase1/WedgeVerificationPanel';

describe('Phase 1 panel', () => {
  const text = renderToStaticMarkup(<WedgeVerificationPanel />)
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('states the exit criterion and the provenance', () => {
    expect(text).toContain('within 2 %');
    expect(text).toContain('SOLVED');
  });
  it('offers no result before a run', () => {
    expect(text).not.toContain('Exit criterion met');
  });
});
