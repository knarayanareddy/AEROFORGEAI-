#!/usr/bin/env bash
#
# Run the Phase 3 case through a real SU2_CFD binary and collect the results.
#
# THIS HAS NEVER BEEN EXECUTED. It is written against the v8.6.0 CLI and the
# files the source says SU2 writes, but no SU2 binary exists in the development
# environment and no run has been performed. Treat every line as untested until
# docs/phase-5-integration.md §3 has been worked through.
#
# Usage:
#   ./scripts/su2-run.sh --su2-bin /path/to/SU2_CFD --workdir build/su2-run
#   ./scripts/su2-run.sh --check          # verify prerequisites only, run nothing
#
# Exit codes: 0 ok, 2 prerequisites missing, 3 SU2 failed.
set -euo pipefail

SU2_BIN="${SU2_BIN:-$(command -v SU2_CFD || true)}"
# SU2_CFD needs the SU2_RUN path set to find its config templates and the
# mesh-file tools on some builds. The wrapper passes it through if it is set.
WORKDIR="build/su2-run"
CHECK_ONLY=0
NPROCS="${NPROCS:-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --su2-bin) SU2_BIN="$2"; shift 2;;
    --workdir) WORKDIR="$2"; shift 2;;
    --nprocs)  NPROCS="$2"; shift 2;;
    --check)   CHECK_ONLY=1; shift;;
    -h|--help) sed -n '2,20p' "$0"; exit 0;;
    *) echo "unknown argument: $1" >&2; exit 2;;
  esac
done

hr() { printf '%s\n' "────────────────────────────────────────────────────────"; }

hr
echo " AeroForge · SU2 run harness"
hr

# ── Prerequisites ────────────────────────────────────────────────────────────
fail=0

if [[ -z "$SU2_BIN" ]]; then
  echo "MISSING  SU2_CFD binary (set --su2-bin or SU2_BIN)"
  fail=1
else
  echo "ok       SU2_CFD: $SU2_BIN"
  # Capture the banner: the version must be v8.6.0, because oracle/su2_schema.json
  # was extracted from that tag and a different build may accept different keys.
  version_line="$("$SU2_BIN" | head -3 | tr -d '\r' || true)"
  echo "         $version_line"
  case "$version_line" in
    *8.6.0*) echo "ok       version matches the schema tag (v8.6.0)";;
    *) echo "WARN     version is not obviously 8.6.0 - oracle/su2_schema.json may not apply";;
  esac
fi

for tool in npx; do
  if command -v "$tool" >/dev/null 2>&1; then echo "ok       $tool"; else echo "MISSING  $tool"; fail=1; fi
done

if [[ $NPROCS -gt 1 ]]; then
  if command -v mpiexec >/dev/null 2>&1; then
    echo "ok       mpiexec (will run on $NPROCS ranks)"
  else
    echo "MISSING  mpiexec but --nprocs=$NPROCS"
    fail=1
  fi
fi

if [[ $fail -ne 0 ]]; then
  hr
  echo "Prerequisites missing; nothing was run."
  echo "See docs/phase-5-integration.md §2 for how to obtain SU2 v8.6.0."
  exit 2
fi

if [[ $CHECK_ONLY -eq 1 ]]; then
  hr
  echo "Prerequisite check passed. Nothing was run (--check)."
  exit 0
fi

# ── Build the case and mesh ──────────────────────────────────────────────────
hr
echo "Generating the case and mesh from the Phase 3 generators"
# scripts/build-su2-case.ts writes inlet.cfg and inlet.su2 into the CWD.
mkdir -p "$WORKDIR"
( cd "$WORKDIR" && npx tsx ../scripts/build-su2-case.ts )

# ── Run ──────────────────────────────────────────────────────────────────────
hr
echo "Running SU2_CFD"
# SU2 writes its outputs into the directory it is started from. Run from the
# workdir so nothing lands in the repository root; .gitignore covers the
# artefact names regardless.
start=$(date +%s)
set +e
if [[ $NPROCS -gt 1 ]]; then
  ( cd "$WORKDIR" && mpiexec -n "$NPROCS" "$SU2_BIN" inlet.cfg ) 2>&1 | tee "$WORKDIR/su2.stdout.log"
  rc=${PIPESTATUS[0]}
else
  ( cd "$WORKDIR" && "$SU2_BIN" inlet.cfg ) 2>&1 | tee "$WORKDIR/su2.stdout.log"
  rc=${PIPESTATUS[0]}
fi
set -e
dur=$(( $(date +%s) - start ))

hr
if [[ $rc -ne 0 ]]; then
  echo "SU2 failed with exit code $rc after ${dur}s."
  echo "The console log is at $WORKDIR/su2.stdout.log."
  exit 3
fi
echo "SU2 finished in ${dur}s."

# ── What did it actually write? ──────────────────────────────────────────────
# Assert on the files rather than assuming: the case requests
# OUTPUT_FILES= (RESTART_ASCII, PARAVIEW_ASCII, SURFACE_CSV), and RESTART_ASCII
# is written through CSU2FileWriter whose extension is .csv (v8.6.0
# CSU2FileWriter.cpp:30). If SU2 ever changes that, this check is where it shows.
hr
echo "Artefacts:"
missing=0
for f in history.csv restart.csv; do
  if [[ -f "$WORKDIR/$f" ]]; then
    printf "ok       %-20s %8s bytes\n" "$f" "$(wc -c < "$WORKDIR/$f")"
  else
    printf "MISSING  %-20s\n" "$f"
    missing=1
  fi
done
# Non-fatal, but worth stating: Paraview and surface files are byproducts here.
ls -1 "$WORKDIR" | sed 's/^/         /'

hr
if [[ $missing -ne 0 ]]; then
  echo "SU2 exited 0 but did not write the files this project parses."
  echo "Check OUTPUT_FILES in inlet.cfg and the console log."
  exit 3
fi

echo "Next: npx tsx scripts/check-su2-results.ts --workdir $WORKDIR"
echo "That compares the run against the Phase 2/3 expectations and writes a report."
