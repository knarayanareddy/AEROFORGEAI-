import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MissionControlDashboard from '../components/dashboard/MissionControlDashboard';

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&');

describe('dashboard telemetry', () => {
  const text = strip(renderToStaticMarkup(<MissionControlDashboard onNavigate={() => {}} />));
  it('reports absence of a solver rather than inventing one', () => {
    expect(text).not.toContain('487 / 500');
    expect(text).not.toContain('2.4e-6');
    expect(text).toContain('no solver');
    expect(text).toContain('n/a');
  });
  it('labels telemetry as a fixture', () => {
    expect(text).toContain('SIMULATED');
  });
});
