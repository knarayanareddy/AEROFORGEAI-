// Emits a SU2 case file + ASCII mesh for the Phase 2 inlet.
//
// These are build artefacts (CI generates them to validate the writer); the app
// generates the same content in the browser for download.

import { writeFileSync } from 'node:fs';
import { inletMeshFor } from '../src/lib/inletSolve';
import { DEFAULT_INLET } from '../src/lib/inlet';
import { writeSu2Mesh, describeSu2Mesh } from '../src/lib/su2Mesh';
import { writeSu2Case } from '../src/lib/su2Case';
import { atmosphereAt } from '../src/lib/atmosphere';

const d = DEFAULT_INLET;
// Same builder the browser solver uses, so the exported mesh provably matches.
const mesh = inletMeshFor(d, 120, 60);

writeFileSync('inlet.su2', writeSu2Mesh(mesh));
writeFileSync(
  'inlet.cfg',
  writeSu2Case({
    design: d,
    atmosphere: atmosphereAt(d.altitudeM),
    meshFilename: 'inlet.su2',
  }),
);

console.log('mesh:', JSON.stringify(describeSu2Mesh(mesh)));
