// Builds the reference CEP bundle that CI verifies with Python's zipfile.
//
// This exists so the archive format is checked by software that did not write
// it. The bundle is a build artefact and is not committed.

import { writeFileSync } from 'node:fs';
import { runPhase1Pipeline } from '../src/lib/phase1Pipeline';
import { buildCepBundle } from '../src/lib/cepBundle';
import type { PipelineResult } from '../src/lib/phase1Pipeline';

async function main(): Promise<void> {
  const gen = runPhase1Pipeline({ mach: 5.5, altitudeM: 27_000, wedgeAngleDeg: 10, nx: 160, ny: 100 });
  let result: PipelineResult | undefined;
  for (;;) {
    const { value, done } = gen.next();
    if (done) {
      result = value as PipelineResult;
      break;
    }
  }
  const bundle = await buildCepBundle({ result, createdUtc: '2026-01-01T00:00:00.000Z' });
  writeFileSync('reference_bundle.zip', Buffer.from(bundle.zip));
  console.log(`wrote ${bundle.filename} (${bundle.zip.length} bytes, sha256 ${bundle.bundleSha256})`);
}

void main();
