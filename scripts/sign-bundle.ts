// Build a CEP bundle, sign its digest, and emit verification material.
//
// CI then verifies the signature with Python's PyNaCl, which shares no code with
// either the WebCrypto or the Node paths. A signature that three independent
// implementations agree on is a much stronger claim than one that round-trips
// through the library that made it.
//
// The private key here is EPHEMERAL and generated per run. No key material is
// committed. This proves the mechanism, not the identity of any signer.

import { writeFileSync } from 'node:fs';
import { runPhase1Pipeline } from '../src/lib/phase1Pipeline';
import { buildCepBundle } from '../src/lib/cepBundle';
import { generateKeyPair, nodeSigner, signDigest } from '../src/lib/signature';
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

  const kp = await generateKeyPair();
  const block = await signDigest(
    nodeSigner,
    bundle.bundleSha256,
    kp.privateKeyB64u,
    '2026-01-01T00:00:00.000Z',
    'ci-ephemeral',
  );

  writeFileSync('signed_bundle.zip', Buffer.from(bundle.zip));
  writeFileSync('signed_bundle.sig.json', JSON.stringify(block, null, 2));

  console.log(`bundle  sha256 ${bundle.bundleSha256}`);
  console.log(`public  key    ${block.publicKey}`);
  console.log(`signature      ${block.signature.slice(0, 24)}…`);
}

void main();
