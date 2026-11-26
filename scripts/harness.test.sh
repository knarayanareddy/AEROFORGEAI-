#!/usr/bin/env bash
# Regression tests for the shell harnesses.
#
# These exist because four real defects were found in review, and every one of
# them was a silent-success bug: the script exited 0 or lost the evidence while
# appearing to work. Prose in a document does not prevent that recurring; a test
# that fails on the old behaviour does.
#
# Run: ./scripts/harness.test.sh     (exit 0 = all pass)
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

pass=0
fail=0

ok()   { printf 'ok    %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf 'FAIL  %s\n' "$1"; fail=$((fail+1)); }
check(){ if eval "$2"; then ok "$1"; else bad "$1"; fi; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── 1. su2-run.sh resolves the builder from the repo root ───────────────────
# Regression: the builder was invoked as ../scripts/build-su2-case.ts, which
# resolves under build/ for the documented default workdir.
printf '#!/bin/sh\necho "SU2 v8.6.0 test"\n' > "$TMP/su2-ok"
chmod +x "$TMP/su2-ok"

out=$("$REPO_ROOT/scripts/su2-run.sh" --su2-bin "$TMP/su2-ok" --workdir "$TMP/nested/run" 2>&1)
if [[ -f "$TMP/nested/run/inlet.su2" ]]; then
  ok "builder ran from a nested workdir (inlet.su2 generated)"
else
  bad "builder did not run from a nested workdir"
fi
# A stub SU2 writes nothing, so the harness must exit 3 at the artefact check.
"$REPO_ROOT/scripts/su2-run.sh" --su2-bin "$TMP/su2-ok" --workdir "$TMP/nested/run2" >/dev/null 2>&1
check "harness exits 3 when SU2 writes no artefacts" '[[ $? -eq 3 ]]'

# And the prerequisite path still fails cleanly with no binary at all.
env -u SU2_BIN "$REPO_ROOT/scripts/su2-run.sh" --check --su2-bin "" >/dev/null 2>&1
check "prerequisite check exits 2 without a binary" '[[ $? -eq 2 ]]'

# ── 2. check-su2-results.ts rejects a blank cell ────────────────────────────
# Regression: Number('') === 0, so a blank Pressure parsed as a valid zero and
# the consistency check skipped it, exiting 0 as "internally consistent".
mkdir -p "$TMP/blank"
cat > "$TMP/blank/history.csv" <<'H'
"Inner_Iter",  "rms[Rho]"
1, -2.5
2, -3.5
3, -4.5
H
cat > "$TMP/blank/restart.csv" <<'R'
"PointID","x","y","Density","Momentum_x","Momentum_y","Energy","Pressure"
0, 0, 0, 4.2e-01, 4.217463692939890e+00, 0, 2.3675e+01, 
R
npx tsx "$REPO_ROOT/scripts/check-su2-results.ts" --workdir "$TMP/blank" \
  --history "$TMP/blank/history.csv" --restart "$TMP/blank/restart.csv" >/dev/null 2>&1
check "blank Pressure cell is rejected (exit 1)" '[[ $? -eq 1 ]]'

# ── 3. check-su2-results.ts rejects non-positive pressure ───────────────────
# Regression: `written > 0` skipped the cross-check for p <= 0 and the script
# still exited 0. Mach is undefined there.
mkdir -p "$TMP/diverged"
cp "$TMP/blank/history.csv" "$TMP/diverged/"
cat > "$TMP/diverged/restart.csv" <<'R'
"PointID","x","y","Density","Momentum_x","Momentum_y","Energy","Pressure"
0, 0, 0, 4.2e-01, 4.217463692939890e+00, 0, 2.3675e+01, 1.0
1, 1, 0, 4.2e-01, 4.217463692939890e+00, 0, 2.3675e+01, 0.0
R
out=$(npx tsx "$REPO_ROOT/scripts/check-su2-results.ts" --workdir "$TMP/diverged" \
  --history "$TMP/diverged/history.csv" --restart "$TMP/diverged/restart.csv" 2>&1)
rc=$?
# Compare the captured rc directly, not $? inside eval: after an assignment $?
# is the assignment's status, so `[[ $? -eq 1 ]]` would test the wrong thing.
if [[ $rc -eq 1 ]]; then ok "zero written Pressure is rejected (exit 1)"; else bad "zero written Pressure is rejected (got $rc)"; fi
case "$out" in
  *"non-positive written Pressure"*) ok "the failure names the cause";;
  *) bad "the failure does not name the cause";;
esac

# ── 4. sbatch preserves partial results when the solver fails ───────────────
# Regression: under `set -e` the failing pipeline killed the script before the
# copy-back block, so a diverged run lost history.csv and su2.log.
mkdir -p "$TMP/case"
cp "$TMP/nested/run/inlet.cfg" "$TMP/nested/run/inlet.su2" "$TMP/case/"
cat > "$TMP/su2-fail" <<'F'
#!/bin/sh
echo '"Inner_Iter",  "rms[Rho]"' > history.csv
echo '40, 1.5' >> history.csv
echo "diverged"
exit 1
F
chmod +x "$TMP/su2-fail"
SU2_CFD="$TMP/su2-fail" CASE_DIR="$TMP/case" SLURM_JOB_ID=t1 \
  bash "$REPO_ROOT/deploy/slurm/su2-inlet.sbatch" >/dev/null 2>&1
sbatch_rc=$?
check "failing solver propagates exit 1" '[[ $sbatch_rc -eq 1 ]]'
check "history.csv survives a solver failure" '[[ -f "$TMP/case/history.csv" ]]'
check "su2.log survives a solver failure" '[[ -f "$TMP/case/su2.log" ]]'

# ── 5. the synthetic path still cannot be mistaken for a run ────────────────
out=$(npx tsx "$REPO_ROOT/scripts/check-su2-results.ts" \
  --workdir fixtures/su2 --synthetic \
  --history fixtures/su2/history.synthetic.csv \
  --restart fixtures/su2/restart.synthetic.csv 2>&1)
case "$out" in
  *SYNTHETIC*) ok "synthetic banner present";;
  *) bad "synthetic banner missing";;
esac
case "$out" in
  *"RESULT: PASS"*) bad "synthetic input reported PASS";;
  *) ok "synthetic input does not report PASS";;
esac

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[[ $fail -eq 0 ]]
