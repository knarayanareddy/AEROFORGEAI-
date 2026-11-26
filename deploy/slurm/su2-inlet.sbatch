#!/usr/bin/env bash
#SBATCH --job-name=aeroforge-inlet
#SBATCH --output=aeroforge-inlet-%j.out
#SBATCH --error=aeroforge-inlet-%j.err
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --time=00:30:00
#SBATCH --mem=4G
#
# Run the Phase 3 inlet case through SU2_CFD on one node.
#
# UNTESTED. No cluster was available when this was written. See README.md.
#
# The mesh is 7,381 points and 7,200 quads. At CFL 6 with AUSMPLUSUP that is a
# small Euler problem: 30 minutes on 4 cores is a deliberately generous ceiling,
# not an estimate from a measurement, because no measurement exists.
#
# Environment expected in the job:
#   SU2_CFD   path to the v8.6.0 binary
#   CASE_DIR  directory containing inlet.cfg and inlet.su2
set -euo pipefail

: "${SU2_CFD:?SU2_CFD must be set to the SU2 v8.6.0 binary}"
: "${CASE_DIR:?CASE_DIR must point at the directory holding inlet.cfg and inlet.su2}"

echo "job        ${SLURM_JOB_ID:-<not under slurm>}"
echo "node       $(hostname)"
echo "started    $(date -Is)"
echo "su2        ${SU2_CFD}"
echo "case dir   ${CASE_DIR}"

# Fail early and loudly rather than after the solver starts.
for f in inlet.cfg inlet.su2; do
  [[ -f "${CASE_DIR}/${f}" ]] || { echo "MISSING ${CASE_DIR}/${f}" >&2; exit 2; }
done

"${SU2_CFD}" --version 2>/dev/null | head -1 || true

# SU2 writes into its working directory; run inside a per-job scratch directory
# so two jobs on the same node cannot collide on history.csv.
work="${SLURM_TMPDIR:-/tmp}/aeroforge-${SLURM_JOB_ID:-$$}"
mkdir -p "$work"
cp "${CASE_DIR}/inlet.cfg" "${CASE_DIR}/inlet.su2" "$work/"
cd "$work"

# Rank count follows the allocation so the script works whether the site packs
# one task per node or many.
#
# set +e around the pipeline is REQUIRED, not defensive: under `set -e` a
# pipeline whose first command fails aborts the shell immediately, so the
# `rc=${PIPESTATUS[0]}` line and the copy-back block below would never execute.
# On sites that purge SLURM_TMPDIR when the job ends, that loses the partial
# results of a diverged run - exactly the run whose output someone needs.
set +e
"${SU2_CFD}" inlet.cfg 2>&1 | tee su2.log
rc=${PIPESTATUS[0]}
set -e

echo "finished   $(date -Is)"
echo "exit       ${rc}"

# Copy results back next to the case. Slurm will purge the scratch on some
# sites, so this must happen before the script exits. This runs whether the
# solver succeeded or not: a diverged run's history.csv is still evidence.
copied=0
for f in history.csv restart.csv su2.log; do
  if [[ -f "$f" ]]; then
    # cp may fail on a read-only CASE_DIR; report it rather than dying with only
    # the solver's exit code, which would hide the real problem.
    if cp "$f" "${CASE_DIR}/$f" 2>/dev/null; then
      copied=$((copied + 1))
    else
      echo "WARN could not copy $f to ${CASE_DIR}" >&2
    fi
  fi
done
echo "copied     ${copied} file(s) to ${CASE_DIR}"

if [[ $rc -ne 0 ]]; then
  echo "solver failed: see ${CASE_DIR}/su2.log" >&2
fi

exit "$rc"
