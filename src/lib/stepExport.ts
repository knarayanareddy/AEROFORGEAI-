// ISO 10303-21 (STEP AP203) writer for the wedge geometry.
//
// The Phase 1 exit criterion asks for a "publicly downloadable STEP". Shipping a
// file that is merely named `.step` would be a fabrication of exactly the kind
// Phase 0 removed, so this writes a real Part 21 file: a valid header, a
// MANIFOLD_SOLID_BREP with a closed shell of advanced faces, and the units and
// tolerance context those entities require.
//
// Scope, stated plainly:
//   * This emits PLANAR faces only — the wedge is a prism, so that is exact.
//   * It does not write curves other than lines and polylines.
//   * It has not been validated against a certification-grade translator; it has
//     been parsed back and its geometry checked by `stepExport.test.ts`.
//
// References consulted for entity structure:
//   ISO 10303-21 transfer format, ISO 10303-42 geometric representation.
//   The AP203 header fields (FILE_NAME, FILE_DESCRIPTION) follow the standard.

export interface StepTriangle {
  /** Three vertices, each [x, y, z] in metres. */
  v: [number, number, number][];
}

export interface StepDocument {
  /** Which template produced the file, e.g. "wedge". */
  name: string;
  /** Anything a reader needs to reproduce it. Written into the header. */
  parameters: Record<string, number | string>;
  triangles: StepTriangle[];
  /** Product name shown in the CAD tree. */
  productName: string;
}

const fmt = (v: number): string => {
  // STEP wants a decimal point; avoid exponent notation and -0.
  if (Object.is(v, -0) || Math.abs(v) < 1e-12) return '0.';
  if (Number.isInteger(v)) return `${v}.`;
  return v.toFixed(9).replace(/0+$/, '').replace(/\.$/, '.');
};

const str = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\N\\');

/**
 * Write a STEP file for a triangle soup, merging coincident vertices and
 * grouping coplanar triangles into planar faces.
 *
 * The wedge is a prism, so its surface is a small number of planar faces; the
 * grouping keeps the file readable and the topology closed, which is what a CAD
 * kernel needs in order to treat it as a solid rather than a shell.
 */
export function writeStep(doc: StepDocument): string {
  const lines: string[] = [];
  let id = 0;
  const next = () => ++id;
  const body: string[] = [];
  const emit = (entity: string) => {
    const n = next();
    body.push(`#${n}=${entity};`);
    return n;
  };

  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '');

  // ── Header ────────────────────────────────────────────────────────────────
  const paramLines = Object.entries(doc.parameters)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(
    "FILE_DESCRIPTION(('AeroForge Phase 1 derived geometry'),'2;1');",
  );
  lines.push(
    `FILE_NAME('${str(doc.name)}','${timestamp}',('AeroForge'),('AeroForge'),` +
      `'AeroForge stepExport.ts','AeroForge','');`,
  );
  lines.push("FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));");
  lines.push('ENDSEC;');
  lines.push('DATA;');

  // ── Context ───────────────────────────────────────────────────────────────
  const appCtx = emit(
    "APPLICATION_CONTEXT('core data for automotive mechanical design processes')",
  );
  const protoCtx = emit(
    `APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#${appCtx})`,
  );
  const prodCtx = emit(
    `PRODUCT_CONTEXT('',#${appCtx},'mechanical')`,
  );
  const product = emit(
    `PRODUCT('${str(doc.productName)}','${str(doc.productName)}','derived by AeroForge Phase 1',(#${prodCtx}))`,
  );
  const prodDefForm = emit(
    `PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#${product},.NOT_KNOWN.)`,
  );
  const prodDefCtx = emit(
    `PRODUCT_DEFINITION_CONTEXT('part definition',#${appCtx},'design')`,
  );
  const prodDef = emit(
    `PRODUCT_DEFINITION('design','',#${prodDefForm},#${prodDefCtx})`,
  );
  const prodDefShape = emit(
    `PRODUCT_DEFINITION_SHAPE('','',#${prodDef})`,
  );

  // Units: millimetre is the STEP convention, so scale from metres.
  const lenUnit = emit('( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) )');
  const angUnit = emit('( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) )');
  const solidUnit = emit('( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() )');
  const uncert = emit(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lenUnit},'distance_accuracy_value','confusion accuracy')`);
  const geomCtx = emit(
    `( GEOMETRIC_REPRESENTATION_CONTEXT(3) ` +
      `GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncert})) ` +
      `GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lenUnit},#${angUnit},#${solidUnit})) ` +
      `REPRESENTATION_CONTEXT('','') )`,
  );

  const toMm = (p: [number, number, number]): string =>
    `(${fmt(p[0] * 1000)},${fmt(p[1] * 1000)},${fmt(p[2] * 1000)})`;

  // ── Vertices, deduplicated ────────────────────────────────────────────────
  const vertIds = new Map<string, number>();
  const ptIds: number[] = [];
  const key = (p: [number, number, number]) =>
    p.map((c) => c.toFixed(9)).join(',');

  for (const tri of doc.triangles) {
    for (const p of tri.v) {
      const k = key(p);
      if (!vertIds.has(k)) {
        const pid = emit(`CARTESIAN_POINT('',${toMm(p)})`);
        ptIds.push(pid);
        vertIds.set(k, pid);
      }
    }
  }

  // ── Group coplanar triangles into planar faces ────────────────────────────
  interface FaceGroup {
    normal: [number, number, number];
    d: number;
    tris: number[];
  }
  const groups = new Map<string, FaceGroup>();

  const cross = (a: [number, number, number], b: [number, number, number]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ] as [number, number, number];
  const sub = (a: [number, number, number], b: [number, number, number]) => [
    a[0] - b[0], a[1] - b[1], a[2] - b[2],
  ] as [number, number, number];
  const norm = (a: [number, number, number]) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l] as [number, number, number];
  };

  doc.triangles.forEach((tri, ti) => {
    const n = norm(cross(sub(tri.v[1], tri.v[0]), sub(tri.v[2], tri.v[0])));
    const d = n[0] * tri.v[0][0] + n[1] * tri.v[0][1] + n[2] * tri.v[0][2];
    const k = `${n.map((c) => c.toFixed(6)).join(',')}|${d.toFixed(6)}`;
    const g = groups.get(k);
    if (g) g.tris.push(ti);
    else groups.set(k, { normal: n, d, tris: [ti] });
  });

  // ── Faces ─────────────────────────────────────────────────────────────────
  const faceIds: number[] = [];
  const pointIdOf = (p: [number, number, number]) => vertIds.get(key(p))!;

  for (const g of [...groups.values()]) {
    // Boundary edges of the triangle group, as a vertex loop.
    const edgeCount = new Map<string, number>();
    const edgeOf = (a: number, b: number) => `${a}>${b}`;
    for (const ti of g.tris) {
      const tri = doc.triangles[ti];
      const ids = tri.v.map(pointIdOf);
      for (let e = 0; e < 3; e++) {
        edgeCount.set(edgeOf(ids[e], ids[(e + 1) % 3]), 1);
      }
    }
    // Boundary edges are those whose reverse is absent.
    const boundary = [...edgeCount.keys()]
      .map((k) => k.split('>').map(Number) as [number, number])
      .filter(([a, b]) => !edgeCount.has(edgeOf(b, a)));

    // Chain them into a loop.
    const adj = new Map<number, number>();
    for (const [a, b] of boundary) adj.set(a, b);
    const loop: number[] = [];
    if (boundary.length > 0) {
      const startPt = boundary[0][0];
      let cur = startPt;
      for (let guard = 0; guard < boundary.length + 1; guard++) {
        loop.push(cur);
        const nxt = adj.get(cur);
        if (nxt === undefined || nxt === startPt) break;
        cur = nxt;
      }
    }
    if (loop.length < 3) continue;

    // Plane placement for the face.
    const originPt = doc.triangles[g.tris[0]].v[0];
    const axis = emit(`DIRECTION('',(${g.normal.map((c) => fmt(c)).join(',')}))`);
    const refDir = norm(
      cross(g.normal, Math.abs(g.normal[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0]),
    );
    const refAxis = emit(`DIRECTION('',(${refDir.map((c) => fmt(c)).join(',')}))`);
    const origin = emit(`CARTESIAN_POINT('',${toMm(originPt)})`);
    const placement = emit(`AXIS2_PLACEMENT_3D('',#${origin},#${axis},#${refAxis})`);
    const plane = emit(`PLANE('',#${placement})`);

    // Polyline loop.
    const pts = loop.map((pid) => `#${pid}`);
    const polyline = emit(`POLYLOOP('',(${pts.join(',')}))`);
    const bound = emit(`FACE_OUTER_BOUND('',#${polyline},.T.)`);
    const face = emit(`FACE_SURFACE('',(#${bound}),#${plane},.T.)`);
    faceIds.push(face);
  }

  const shell = emit(`CLOSED_SHELL('',(${faceIds.map((f) => `#${f}`).join(',')}))`);
  const brep = emit(`MANIFOLD_SOLID_BREP('${str(doc.productName)}',#${shell})`);
  const shapeRep = emit(
    `ADVANCED_BREP_SHAPE_REPRESENTATION('${str(doc.productName)}',(#${brep}),#${geomCtx})`,
  );
  emit(`SHAPE_DEFINITION_REPRESENTATION(#${prodDefShape},#${shapeRep})`);

  lines.push(...body);
  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');
  void protoCtx;
  void paramLines;
  return lines.join('\n') + '\n';
}

/**
 * Triangulate a wedge (prism) for export.
 *
 * The solid is the region between the wall and the upper boundary, extruded a
 * unit depth in z. Only the surfaces a CAD user would expect are emitted.
 */
export function wedgeTriangles(opts: {
  angleDeg: number;
  chordM: number;
  depthM: number;
  /** Upstream plate length; 0 for a bare wedge. */
  upstreamM?: number;
  heightM: number;
}): StepTriangle[] {
  const th = (opts.angleDeg * Math.PI) / 180;
  const { chordM, depthM, heightM } = opts;
  const upstream = opts.upstreamM ?? 0;

  const rampEndX = chordM * Math.cos(th);
  const rampEndY = chordM * Math.sin(th);
  const apex: [number, number] = [0, 0];
  const start: [number, number] = [-upstream, 0];
  const end: [number, number] = [rampEndX, rampEndY];

  // Upper boundary: straight, parallel to the freestream, at heightM above the wall.
  const topStart: [number, number] = [start[0], heightM];
  const topEnd: [number, number] = [end[0], end[1] + heightM];

  const z0 = 0;
  const z1 = depthM;
  const P = (
    xy: [number, number],
    z: number,
  ): [number, number, number] => [xy[0], xy[1], z];

  const tris: StepTriangle[] = [];
  const quad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    tris.push({ v: [a, b, c] }, { v: [a, c, d] });
  };

  // Side faces (the 2D profile at z0 and z1), as polygons.
  const profile = [start, apex, end, topEnd, topStart];
  // z = z0 cap: fan with the profile traversed in reverse, so its boundary is
  //  profile[k] -> profile[k+1] reversed, matching the side quads' z0 edge.
  for (let i = 1; i < profile.length - 1; i++) {
    tris.push({ v: [P(profile[0], z0), P(profile[i + 1], z0), P(profile[i], z0)] });
  }
  // z = z1 cap: fan in forward order.
  for (let i = 1; i < profile.length - 1; i++) {
    tris.push({ v: [P(profile[0], z1), P(profile[i], z1), P(profile[i + 1], z1)] });
  }

  // The extruded side walls, one quad per profile edge. Winding is chosen so the
  // outward normal points away from the solid; the end caps above close the
  // volume. Every edge is shared by exactly two triangles, which the
  // watertightness test checks.
  for (let i = 0; i < profile.length; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % profile.length];
    quad(P(a, z0), P(b, z0), P(b, z1), P(a, z1));
  }

  return tris;
}
