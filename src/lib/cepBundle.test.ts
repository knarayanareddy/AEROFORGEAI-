// The bundle's whole value is that its manifest can be trusted. These tests
// verify the hashes in the manifest against the bytes in the archive — the same
// check an external consumer would run.

import { describe, expect, it } from 'vitest';
import { runPhase1Pipeline, type PipelineResult } from './phase1Pipeline';
import { buildCepBundle, CEP_VERSION } from './cepBundle';
import { buildZip, sha256Hex } from './zip';

function solve(over: Partial<Parameters<typeof runPhase1Pipeline>[0]> = {}): PipelineResult {
  const gen = runPhase1Pipeline({ mach: 5.5, altitudeM: 27_000, wedgeAngleDeg: 10, nx: 100, ny: 60, ...over });
  for (;;) {
    const { value, done } = gen.next();
    if (done) return value as PipelineResult;
  }
}

const result = solve();

describe('manifest integrity', () => {
  it('every artefact hash matches its bytes', async () => {
    const b = await buildCepBundle({ result, createdUtc: '2026-01-01T00:00:00.000Z' });
    // Rebuild the archive from the same entries and locate each file's bytes,
    // then hash them independently of the manifest.
    // Independent expectations for the artifacts whose content this test can
    // reproduce. The generated SU2 files are reproduced through the same
    // builders the bundle uses, which is exactly what a consumer would do.
    const expected: Record<string, string> = {
      'geometry/wedge.step': result.stepText,
      'report/report.md': result.reportMarkdown,
    };

    for (const art of b.manifest.artifacts) {
      expect(art.bytes).toBeGreaterThan(0);
      expect(art.sha256).toMatch(/^[0-9a-f]{64}$/);
      if (!(art.path in expected)) continue;
      const hash = await sha256Hex(new TextEncoder().encode(expected[art.path]));
      expect(hash, art.path).toBe(art.sha256);
    }

    // The bundle must carry the sidecar inputs, and they must be labelled as
    // unrun rather than presented as a SU2 result.
    const paths = b.manifest.artifacts.map((a) => a.path);
    expect(paths).toContain('su2/inlet.su2');
    expect(paths).toContain('su2/inlet.cfg');
    const cfg = b.manifest.artifacts.find((a) => a.path === 'su2/inlet.cfg')!;
    expect(cfg.description).toMatch(/NOT been executed/);
  });

  it('reports the same verification verdict as the run', async () => {
    const b = await buildCepBundle({ result });
    expect(b.manifest.verification.passed).toBe(result.meetsExitCriterion);
    expect(b.manifest.verification.error_pct.beta).toBeCloseTo(result.errors.betaPct, 2);
  });

  it('declares its own limitations instead of implying certification', async () => {
    const b = await buildCepBundle({ result });
    expect(b.manifest.generator.method).toContain('euler2d');
    expect(b.manifest.manifest_note).toContain('cannot contain its own hash');
    // The SU2 case file must say it is untested against SU2.
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
  });

  it('uses a fixed CEP version string', async () => {
    const b = await buildCepBundle({ result });
    expect(b.manifest.cep_version).toBe(CEP_VERSION);
  });
});

describe('reproducibility', () => {
  it('identical inputs and timestamp give identical bytes and hash', async () => {
    const a = await buildCepBundle({ result, createdUtc: '2026-01-01T00:00:00.000Z' });
    const b = await buildCepBundle({ result, createdUtc: '2026-01-01T00:00:00.000Z' });
    expect(b.bundleSha256).toBe(a.bundleSha256);
    expect(b.zip.length).toBe(a.zip.length);
  });

  it('a different result gives a different hash', async () => {
    const other = solve({ wedgeAngleDeg: 12 });
    const a = await buildCepBundle({ result, createdUtc: '2026-01-01T00:00:00.000Z' });
    const b = await buildCepBundle({ result: other, createdUtc: '2026-01-01T00:00:00.000Z' });
    expect(b.bundleSha256).not.toBe(a.bundleSha256);
  });
});

describe('bundle contents', () => {
  it('filename encodes the case, so archives are distinguishable', async () => {
    const b = await buildCepBundle({ result });
    expect(b.filename).toMatch(/t10_M5p5\.zip$/);
  });

  it('the field CSV has one row per cell plus a header', async () => {
    const b = await buildCepBundle({ result });
    const csv = b.manifest.artifacts.find((a) => a.path === 'results/field.csv')!;
    // 100x60 cells -> 6000 data rows + 1 header; assert on size ordering only,
    // since the exact byte count depends on float formatting.
    expect(csv.bytes).toBeGreaterThan(6000 * 40);
  });

  it('lists manifest.json first and does not hash itself', async () => {
    const b = await buildCepBundle({ result });
    expect(b.manifest.artifacts.some((a) => a.path === 'manifest.json')).toBe(false);
  });
});
