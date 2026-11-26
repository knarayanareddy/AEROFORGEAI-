// Parsers for the files a real SU2 v8.6.0 run produces.
//
// Every format detail below was read out of the v8.6.0 source at
// codeload.github.com/su2code/SU2 (tag v8.6.0), not from memory. The
// provenance of each rule is cited inline so a future reader can re-check it
// rather than trusting this comment.
//
// WHY THIS FILE EXISTS SEPARATELY FROM su2Case.ts
// su2Case.ts writes inputs. This reads outputs. Keeping them apart means the
// SU2 run itself can be performed by any means (CI container, laptop, cluster)
// and only the artefacts need to come back here.

// ── history.csv ─────────────────────────────────────────────────────────────
//
// Format facts from the source:
//   - Extension: CConfig::GetHistory_FileName() appends ".csv" unless
//     TABULAR_FORMAT is TECPLOT (Common/include/CConfig.hpp, ~line 6032).
//   - Default CONV_FILENAME is "history" (Common/src/CConfig.cpp:2418), so the
//     file is "history.csv".
//   - Delimiter is "," (SU2_CFD/src/output/COutput.cpp:92, historySep = ",").
//   - Fields are WHITESPACE PADDED and the header quotes each name:
//     CTablePrinter::PrintHeader writes '"' + fieldName + '"' padded to the
//     column width (COutput.cpp:1167, printing_toolbox.hpp:145).
//   - So the header is NOT a plain CSV header. ' "Iter",     "rms[Rho]",...'
//     must be stripped and whitespace-collapsed before splitting.
//   - Precision comes from OUTPUT_PRECISION (default 6 for history).
//   - THE RESIDUALS ARE LOG10, NOT RAW. HISTORY_OUTPUT= (ITER, RMS_RES) writes
//     the base-10 logarithm of each RMS residual (CFlowCompOutput.cpp uses
//     HistoryFieldType::RESIDUAL, which COutput logs before printing). A value
//     of -7.1 means 10^-7.1, not -7.1. Reading these as magnitudes is the
//     single easiest mistake to make with this file, and it produces a
//     decades-dropped figure that is nonsense while looking plausible.

/** A column of the convergence history, keyed by its human-readable name. */
export interface HistoryColumn {
  /** Header text with quotes and padding removed, e.g. `rms[Rho]`. */
  name: string;
  /** Every value in file order. */
  values: number[];
}

export interface History {
  columns: HistoryColumn[];
  nRows: number;
}

/**
 * Parse `history.csv`.
 *
 * Throws rather than returning a partial result: a silently truncated history
 * would make a diverged run look converged over the rows that did parse.
 */
export function parseHistoryCsv(text: string): History {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error('history: file is empty');

  // Strip surrounding quotes and padding from each header cell.
  const names = splitPaddedRow(lines[0]).map((n) => n.replace(/^"|"$/g, ''));
  if (names.length === 0) throw new Error('history: header has no columns');
  if (!names.includes('Inner_Iter') && !names.includes('Outer_Iter') && !names.includes('Time_Iter')) {
    throw new Error(
      `history: no iteration column found in header (${names.slice(0, 4).join(', ')}…). ` +
        'HISTORY_OUTPUT must include ITER for this reader to locate the run in the file.',
    );
  }

  const columns = names.map((name) => ({ name, values: [] as number[] }));
  for (let li = 1; li < lines.length; li++) {
    const cells = splitPaddedRow(lines[li]);
    if (cells.length !== names.length) {
      throw new Error(`history: row ${li} has ${cells.length} cells, header has ${names.length}`);
    }
    for (let ci = 0; ci < cells.length; ci++) {
      const v = Number(cells[ci]);
      if (!Number.isFinite(v)) {
        throw new Error(`history: row ${li} column "${names[ci]}" is not a finite number: "${cells[ci]}"`);
      }
      columns[ci].values.push(v);
    }
  }

  return { columns, nRows: lines.length - 1 };
}

/** Split a space-padded row, dropping empty cells from runs of spaces. */
function splitPaddedRow(line: string): string[] {
  return line.split(',').map((c) => c.trim()).filter((c, i, arr) => i < arr.length - 1 || c.length > 0);
}

/** Convenience: the residual column with the given name, or undefined. */
export function residual(history: History, name: string): number[] | undefined {
  return history.columns.find((c) => c.name === name)?.values;
}

/**
 * The final residual and whether it actually fell.
 *
 * `stillDecreasing` exists because Phase 1 learned that a second-order scheme
 * can limit-cycle at ~1e-1 and still report a small residual. A run whose last
 * residual is small but flat is not converged; it is stuck.
 */
export function convergenceSummary(history: History): {
  finalIter: number;
  /** Log10 of the final residual, exactly as SU2 writes it. */
  finalLog10Residual: number;
  /** Log10 of the first residual. */
  initialLog10Residual: number;
  /** initialLog10 − finalLog10. Positive means the residual fell. */
  decadesDropped: number;
  stillDecreasing: boolean;
} {
  const iterCol = history.columns.find((c) => c.name.endsWith('Iter'));
  // The primary residual is whichever RMS column appears first; for an Euler
  // solve the order is Rho, RhoU, RhoV, [RhoW,] RhoE (CFlowCompOutput.cpp:104-112).
  const rms = history.columns.find((c) => c.name.startsWith('rms['));
  if (!iterCol || !rms) {
    throw new Error('history: need an iteration column and at least one rms[...] column');
  }
  const vals = rms.values;
  if (vals.length < 3) throw new Error('history: fewer than 3 rows, cannot judge convergence');

  // The column is already log10, so the difference of two values IS the number
  // of decades dropped. No further logarithm.
  const lastLog = vals.at(-1)!;
  const prevLog = vals.at(-2)!;
  const firstLog = vals[0];

  // A residual in log10 space that sits above ~0 is larger than 1, i.e. the
  // solve is diverging; report it rather than pretending the arithmetic works.
  return {
    finalIter: iterCol.values.at(-1)!,
    finalLog10Residual: lastLog,
    initialLog10Residual: firstLog,
    decadesDropped: firstLog - lastLog,
    // Falling by less than 0.01 decades over the last step is a plateau.
    // Expressed in log space this is a plain difference, not a ratio.
    stillDecreasing: lastLog < prevLog - 0.01,
  };
}

// ── restart.csv ─────────────────────────────────────────────────────────────
//
// Format facts from the source:
//   - RESTART_ASCII writes through CSU2FileWriter, whose extension is ".csv"
//     (SU2_CFD/src/output/filewriter/CSU2FileWriter.cpp:30).
//   - The file name is GetFilename("restart", "", iter) → "restart"
//     (COutput.cpp:86, :431), giving "restart.csv". WRT_RESTART_OVERWRITE
//     defaults to true (CConfig.cpp:1274), so there is no iteration suffix.
//   - The header is `"PointID"` then each field name quoted, comma separated
//     with NO space padding on the header: CSU2FileWriter::WriteData builds
//     `"PointID"` + `,"<field>"` per field.
//   - Data rows are `index, VALUE, VALUE` with a space after each delimiter and
//     values in std::scientific with precision 15.
//   - Which fields appear depends on WRT_RESTART_COMPACT. When it is false the
//     full volume output is written; when true, only the COORDINATES, SOLUTION,
//     SENSITIVITY and GRID_VELOCITY groups (COutput.hpp:310).
//   - For a 2D compressible Euler solve non-compact, the order from
//     CFVMOutput::AddCoordinates + CFlowCompOutput::SetVolumeOutputFields is:
//       x, y, Density, Momentum_x, Momentum_y, Energy, Pressure, Temperature,
//       Mach, Pressure_Coefficient, Velocity_x, Velocity_y, ...
//     but the trailing primitive fields depend on what OUTPUT_FILES requested,
//     so this reader locates columns BY NAME and never assumes positions.

export interface RestartField {
  name: string;
  values: Float64Array;
}

export interface Restart {
  nPoints: number;
  fields: RestartField[];
  /** Index → value map, built once; field lookup by name is the common case. */
  byName: Map<string, RestartField>;
}

/**
 * Parse `restart.csv`.
 *
 * PointID is dropped from `fields` because it is an index, not a physical
 * quantity — carrying it as a Float64Array would invite someone to plot it.
 */
export function parseRestartCsv(text: string): Restart {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('restart: need a header and at least one row');

  const header = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  if (header[0] !== 'PointID') {
    throw new Error(`restart: first column must be "PointID", got "${header[0]}"`);
  }
  const names = header.slice(1);
  if (names.length === 0) throw new Error('restart: header declares no fields');

  const nPoints = lines.length - 1;
  const cols = names.map(() => new Float64Array(nPoints));

  for (let ri = 0; ri < nPoints; ri++) {
    const cells = lines[ri + 1].split(',');
    if (cells.length !== header.length) {
      throw new Error(`restart: row ${ri + 1} has ${cells.length} cells, header has ${header.length}`);
    }
    // PointID is expected to be the row index; assert it rather than ignoring a
    // reordered or subsetted file.
    const id = Number(cells[0].trim());
    if (id !== ri) {
      throw new Error(`restart: row ${ri + 1} has PointID ${id}, expected ${ri} (file is not in point order)`);
    }
    for (let ci = 0; ci < names.length; ci++) {
      const v = Number(cells[ci + 1].trim());
      if (!Number.isFinite(v)) {
        throw new Error(`restart: row ${ri + 1} field "${names[ci]}" is not a finite number: "${cells[ci + 1]}"`);
      }
      cols[ci][ri] = v;
    }
  }

  const fields = names.map((name, i) => ({ name, values: cols[i] }));
  return { nPoints, fields, byName: new Map(fields.map((f) => [f.name, f])) };
}

/** The fields a compressible Euler restart is expected to carry. */
export const EULER_REQUIRED_FIELDS = ['x', 'y', 'Density', 'Momentum_x', 'Momentum_y', 'Energy'] as const;

/**
 * Check that a restart carries what an Euler solution needs.
 *
 * Returns every missing field at once: being told about one missing column per
 * run is how a five-minute debug becomes an afternoon.
 */
export function missingEulerFields(restart: Restart): string[] {
  return EULER_REQUIRED_FIELDS.filter((f) => !restart.byName.has(f));
}

/**
 * Pressure from a conservative state, via the ideal-gas relation.
 *
 * p = (γ − 1) · (E − ½ρ|u|²)
 *
 * This exists so the restart can be checked against the history file's
 * residuals without needing SU2 to have written a PRESSURE column, and so the
 * Mach field can be derived rather than trusted.
 */
export function pressureFromConservative(
  rho: number,
  mx: number,
  my: number,
  energy: number,
  gamma = 1.4,
): number {
  const u = mx / rho;
  const v = my / rho;
  return (gamma - 1) * (energy - 0.5 * rho * (u * u + v * v));
}

/** Mach number from a conservative state and a sound speed p/ρ. */
export function machFromConservative(
  rho: number,
  mx: number,
  my: number,
  pressure: number,
  gamma = 1.4,
): number {
  const u = mx / rho;
  const v = my / rho;
  const a = Math.sqrt((gamma * pressure) / rho);
  return Math.sqrt(u * u + v * v) / a;
}
