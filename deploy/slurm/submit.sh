#!/usr/bin/env bash
# Submit the inlet case to Slurm and wait for it to finish.
#
# UNTESTED against a real controller. See README.md.
#
# Usage:
#   ./deploy/slurm/submit.sh --partition gpu --case-dir build/su2-run
#   ./deploy/slurm/submit.sh --dry-run --case-dir build/su2-run
set -euo pipefail

PARTITION=""
CASE_DIR="build/su2-run"
DRY_RUN=0
POLL=30

while [[ $# -gt 0 ]]; do
  case "$1" in
    --partition) PARTITION="$2"; shift 2;;
    --case-dir)  CASE_DIR="$2"; shift 2;;
    --dry-run)   DRY_RUN=1; shift;;
    --poll)      POLL="$2"; shift 2;;
    -h|--help)   sed -n '2,10p' "$0"; exit 0;;
    *) echo "unknown argument: $1" >&2; exit 2;;
  esac
done

command -v sbatch >/dev/null 2>&1 || {
  echo "sbatch is not on PATH. There is no Slurm client in this environment." >&2
  echo "Nothing was submitted. See deploy/slurm/README.md." >&2
  exit 2
}

for f in inlet.cfg inlet.su2; do
  [[ -f "${CASE_DIR}/${f}" ]] || { echo "MISSING ${CASE_DIR}/${f} - generate it with scripts/build-su2-case.ts" >&2; exit 2; }
done

: "${SU2_CFD:?SU2_CFD must be set so the job inherits it (use --export=ALL)}"
export SU2_CFD
export CASE_DIR
CASE_DIR="$(cd "$CASE_DIR" && pwd)"

args=(--export=ALL --parsable)
[[ -n "$PARTITION" ]] && args+=(--partition "$PARTITION")

if [[ $DRY_RUN -eq 1 ]]; then
  echo "would run: sbatch ${args[*]} deploy/slurm/su2-inlet.sbatch"
  echo "  SU2_CFD=$SU2_CFD"
  echo "  CASE_DIR=$CASE_DIR"
  exit 0
fi

jobid=$(sbatch "${args[@]}" deploy/slurm/su2-inlet.sbatch)
jobid=${jobid%%;*}   # --parsable may append ";cluster"
echo "submitted job $jobid"
echo "polling every ${POLL}s"

while :; do
  state=$(sacct -j "$jobid" --format=State --noheader --parsable2 2>/dev/null | head -1 | tr -d ' ')
  [[ -z "$state" ]] && state=$(squeue -j "$jobid" -h -o %T 2>/dev/null || true)
  case "$state" in
    COMPLETED) echo "job $jobid COMPLETED"; exit 0;;
    FAILED|CANCELLED|TIMEOUT|OUT_OF_MEMORY|NODE_FAIL)
      echo "job $jobid ended in $state" >&2; exit 3;;
    "") echo "job $jobid no longer in the queue and no accounting record; check aeroforge-inlet-${jobid}.err" >&2; exit 3;;
    *) sleep "$POLL";;
  esac
done
