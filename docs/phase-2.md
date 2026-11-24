# Phase 2 — Inlet with cowl and isolator

**Status: ramp-shock validation met; isolator explicitly out of scope.**

The exit criterion for this phase is narrower than Phase 1's, and the narrowing is
the point. A steady, inviscid, structured-grid Euler solve can be graded against
the oblique-shock relations on the compression ramps. It cannot be graded against
anything on the isolator, because a shock train is an unsteady, viscous,
separation-driven phenomenon. This document records what was validated, what was
found, and where the approach stops working.

---

## 1. Geometry

Mixed-compression inlet: two compression ramps, a cowl whose inner surface turns
down to the isolator entry, and a constant-area isolator duct.

```
   x:  -0.60        0.0                1.62   2.07          4.47
                     ╲                 ╱
        ──────────────╲──────╲───────        cowl lip at x = 1.62, y = 0.76
                        ╲7.2°  ╲5.8°         cowl turns down at 6° to the axis
        ─────────────────╲──────╲──────────  ← isolator floor at y = 0.353
                         ╲      ╲             duct height 0.22 m, length 2.40 m
                          ╲      ╲
```

| Parameter | Value |
|---|---|
| Ramp angles | 7.2°, 5.8° (13° cumulative turn) |
| Ramp lengths | 1.20 m, 0.90 m |
| Cowl angle | 6° to the axis |
| Cowl lip | x = 1.62 m, 0.407 m above the isolator ceiling |
| Isolator | 0.22 m high × 2.40 m long |
| Grid | 120 × 60 body-fitted, cosine-clustered to both walls |
| Freestream | M 5.5 at 27 km (p 1847.4 Pa, T 223.65 K) |

`buildInletMesh` (`src/lib/inletMesh.ts`) validates the geometry rather than
silently producing nonsense: a lip downstream of the isolator entry, or a lip
below the ramp surface, both throw with an explanation.

---

## 2. What is validated

The **first ramp shock**, recovered from the CFD field and compared against the
oblique-shock relation the solver never sees.

| Quantity | CFD | Theory | Error |
|---|---|---|---|
| Shock angle β | 15.910° | 15.852° | **+0.36 %** |
| Pressure ratio p₂/p₁ | 2.469 | 2.4666 | **+0.08 %** |

These are the numbers in `src/lib/inlet.golden.test.ts`, which runs in CI as the
`inlet` job.

### How the measurement works, and how it was got wrong first

Three attempts were needed, and the failures are instructive:

1. **Largest cell-to-cell pressure jump per column.** Read 1.10 against a
   reference of 2.47. On a 120 × 60 grid a 2.47:1 shock is smeared across several
   cells, so the biggest single-cell jump is a severe underestimate.
   *Fix:* compare the state near the wall (downstream) against the state high in
   the column (upstream), both as medians over the band.
2. **Track the jump position from column to column.** The tracker wandered
   between the ramp shock, the cowl shock and their reflections, and returned
   2.6° for a 16.6° shock. *Fix:* scan up from the wall for the pressure
   crossing — below the ramp shock the flow is unambiguously post-ramp.
3. **Global least-squares fit to the crossing points.** Read 8.9°. The band
   necessarily includes columns at the ramp apex, where the shock has not formed,
   and columns at the far end, where it meets a wall. Both drag a single line.
   *Fix:* take the **median of the local column-to-column slopes**, which is
   constant to 0.2° over the middle of the band and ignores the ends without a
   hand-picked window.

A fourth bug was pure TypeScript: `cy[i + (j + 0.5) * nx]` is a fractional index
into a `Float64Array`, which returns `undefined`, so the angles came out `NaN`.

---

## 3. What is *not* validated, and why

| Feature | Status | Reason |
|---|---|---|
| Second ramp shock | **not measured** | It meets the cowl lip before becoming a straight line, so any fitted angle describes a truncated shock. Reported as `detected: false` rather than as a number. |
| Isolator shock train | **cannot be modelled** | Unsteady, viscous, separation-driven. A steady solver has no time dimension for the oscillation and no viscosity for the separation. |
| Terminal shock position | **cannot be modelled** | Set by combustor back pressure, which is not in the domain. |
| Boundary layers, separation | **absent** | Inviscid equations. |
| Total-pressure recovery | **inviscid only** | The 0.905 figure excludes all viscous duct loss. |

The UI and the report state these limits in the same place they state the results.
`InletReference.isolator.notModelled` is a machine-readable list, and a test
asserts it is present and specific.

---

## 4. Two findings worth keeping

### 4.1 The farfield must let the shock out

The top boundary ahead of the cowl lip is not freestream. The ramp shocks have
already passed through that region, so imposing freestream there fights the shock
and the solve never converges — the residual stalls at ~1e-3 indefinitely. With
`top: 'outflow'` on the open columns, the residual drops to 4e-4 and the flow
field becomes physical (`p∞` 1847 Pa upstream, 26–30 kPa on the ramp).

This required a per-column boundary override in the solver (`topByColumn`), which
is now part of `Boundaries`.

### 4.2 The cowl angle is the design variable, not the lip height

The first working geometry pinned the lip height and derived the cowl angle. At a
6.5× isolator-height clearance that gave a **36.8° cowl** — enough to turn the
second ramp shock through the oblique-shock limit. Fixing the cowl angle at 6°
and deriving the lip height instead produces a 0.759 m duct contracting to 0.220 m,
which is a workable contraction.

An intermediate version also had a `smoothstep` on the cowl surface, which made
the ceiling bulge **upward** above the lip. The duct height was therefore
non-monotonic. A property test now asserts monotonic contraction from lip to
isolator, so that class of mistake cannot come back silently.

---

## 5. Where the structured-grid approach strains

This is the honest answer to "where does the structured approach start to break".

**Still fine:** attached ramp shocks on a body-fitted grid. 0.36 % on β is
comparable to the Phase 1 wedge result and was obtained at a *coarser* resolution
(120 × 60 vs 360 × 220), because the ramp shock is straight and the grid follows it.

**Straining:** the cowl–shock interaction. The cowl lip sits upstream of where the
second ramp shock would reach the freestream, so the shock is clipped. Getting an
untruncated second shock means either a longer ramp or a lip further aft, which
shrink the capture area or lengthen the duct. There is no setting of this
parameter set where both ramp shocks are clean and the duct is short.

**Broken:** the isolator. This is the point of the roadmap's SU2 sidecar. A shock
train needs:

- a time-accurate or dual-time formulation, to represent the oscillation;
- a turbulence model plus wall resolution, to represent the separation that sets
  the shock-train length;
- a back-pressure boundary condition, to anchor the terminal shock.

None of those are mesh-resolution problems that a finer structured grid can fix.
A 480 × 280 grid on this geometry would converge to the same inviscid answer, more
slowly, and would still contain no shock train. That is the substitution the
roadmap records.

---

## 6. Convergence

The design-point run does **not** reach the solver's `converged` threshold, and
the result reports that rather than hiding it:

```
iterations  : 12001 (cap)
maxMach     : 5.50
residual    : log10 = +0.17, stillDecreasing = false
```

A positive log₁₀ residual that is *not* decreasing is a limit cycle, not slow
convergence. `InletResult.residual` exposes both numbers precisely so the two
cannot be confused. The physical quantities above are insensitive to it — β and
p₂/p₁ reproduce theory to <0.5 % — which is itself informative: the limit cycle
lives at the shock/outflow boundary, not in the ramp compression.

The golden test asserts this relationship rather than asserting `converged`:
the pass flag is computed from the measurements, and a run that is still moving
is not allowed to claim convergence.

---

## 7. Files

| File | Purpose |
|---|---|
| `src/lib/inletMesh.ts` | Ramp/cowl/isolator geometry, body-fitted mesh, mixed top boundary |
| `src/lib/inlet.ts` | Ramp-chain reference, isolator expectations, declared limits |
| `src/lib/inletSolve.ts` | Runs the solver, measures ramp shocks, reports residual |
| `src/lib/inletMesh.test.ts` | 11 geometry properties (monotonic duct, walls, validation) |
| `src/lib/inlet.test.ts` | 13 reference-side tests against the answer key |
| `src/lib/inlet.golden.test.ts` | 8 CFD validation tests, including the 2 % β gate |
| `oracle/verify_bundle.py` | Independent checker for CEP bundles (used in Phase 1) |
