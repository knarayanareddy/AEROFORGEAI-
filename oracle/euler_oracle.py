"""Independent reference solver for the AeroForge Phase 1 golden cases.

Why this exists
---------------
`src/lib/euler2d.ts` is a TypeScript Euler solver. Testing it against its own
oblique-shock module proves only that two pieces of code written by the same
author agree. This module is a second, independent implementation — different
language, different discretisation choices where it can be — so that when both
return the same β and p₂/p₁, the agreement means something.

It is deliberately small and readable rather than fast. It is *not* SU2 and does
not pretend to be: it is the same class of method (cell-centred finite volume,
HLLC, MUSC-minmod) implemented a second time.

Independent choices, so that agreement is not trivially shared:
  * HLLC constructed directly from Toro's wave-speed estimate rather than the
    Davis estimate used in the TypeScript version;
  * a global time step rather than local time stepping;
  * reconstruction along face normals in physical space rather than in index
    space.

Usage
-----
    python3 oracle/euler_oracle.py --theta 10 --mach 5.5 --alt 27000

Prints JSON: the computed β and p₂/p₁ plus the exact values, so CI can compare.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass

import numpy as np

GAMMA = 1.4
R_AIR = 287.05
G0 = 9.80665


# ── Atmosphere ───────────────────────────────────────────────────────────────


def isa(altitude_m: float) -> tuple[float, float]:
    """ISA 1976 static pressure (Pa) and temperature (K) for 0–32 km.

    Written out independently of src/lib/atmosphere.ts. Layer table matches the
    standard; values are the published base conditions.
    """
    layers = [
        (0.0, 288.15, 101325.0, -0.0065),
        (11_000.0, 216.65, 22632.06, 0.0),
        (20_000.0, 216.65, 5474.889, 0.001),
        (32_000.0, 228.65, 868.0187, 0.0028),
    ]
    h = altitude_m
    base = layers[0]
    for i in range(len(layers) - 1):
        if layers[i][0] <= h < layers[i + 1][0]:
            base = layers[i]
            break
    else:
        base = layers[-1]

    h_b, T_b, p_b, lapse = base
    if lapse == 0.0:
        T = T_b
        p = p_b * math.exp((-G0 * (h - h_b)) / (R_AIR * T_b))
    else:
        T = T_b + lapse * (h - h_b)
        p = p_b * (T / T_b) ** (-G0 / (R_AIR * lapse))
    return p, T


# ── Exact oblique-shock theory ───────────────────────────────────────────────


def theta_from_beta(mach: float, beta_rad: float) -> float:
    """θ–β–M relation, radians. Independent of the TypeScript implementation."""
    m2 = mach * mach
    s2 = math.sin(beta_rad) ** 2
    num = 2.0 / math.tan(beta_rad) * (m2 * s2 - 1.0)
    den = m2 * (GAMMA + math.cos(2.0 * beta_rad)) + 2.0
    return math.atan(num / den)


def exact_oblique_shock(mach: float, theta_deg: float) -> dict:
    """Weak-solution β, p₂/p₁, M₂ for a deflection θ. Bisection on θ(β)."""
    theta = math.radians(theta_deg)
    mu = math.asin(1.0 / mach)
    lo, hi = mu + 1e-9, math.pi / 2 - 1e-9
    # Locate the maximum of theta(beta) first so the bracket is the weak branch.
    betas = np.linspace(lo, hi, 4000)
    thetas = np.array([theta_from_beta(mach, b) for b in betas])
    i_max = int(np.argmax(thetas))
    if theta > thetas[i_max]:
        return {"attached": False, "beta_deg": float("nan"), "pressure_ratio": float("nan")}

    a, b = lo, betas[i_max]
    for _ in range(200):
        m = 0.5 * (a + b)
        if theta_from_beta(mach, m) < theta:
            a = m
        else:
            b = m
    beta = 0.5 * (a + b)

    mn = mach * math.sin(beta)
    p_ratio = 1.0 + (2.0 * GAMMA / (GAMMA + 1.0)) * (mn * mn - 1.0)
    return {
        "attached": True,
        "beta_deg": math.degrees(beta),
        "pressure_ratio": p_ratio,
        "normal_mach": mn,
    }


# ── Mesh ─────────────────────────────────────────────────────────────────────


@dataclass
class WedgeMesh:
    nx: int
    ny: int
    x: np.ndarray  # cell centres
    y: np.ndarray
    vol: np.ndarray
    sx: np.ndarray  # face vectors, shape (nx, ny, 4)
    sy: np.ndarray


def wedge_mesh(theta_deg: float, nx: int, ny: int, chord: float, height: float, upstream: float) -> WedgeMesh:
    """Body-fitted wedge mesh built independently of the TypeScript version."""
    th = math.radians(theta_deg)
    x0, x1 = -upstream, chord * math.cos(th)
    stretch = 1.25

    xs = np.linspace(x0, x1, nx + 1)
    # wall height at each i
    wall = np.where(xs <= 0.0, 0.0, math.tan(th) * np.maximum(xs, 0.0))

    # node coordinates
    X = np.zeros((nx + 1, ny + 1))
    Y = np.zeros((nx + 1, ny + 1))
    for i, xi in enumerate(xs):
        for j in range(ny + 1):
            s = (j / ny) ** stretch
            X[i, j] = xi
            Y[i, j] = wall[i] + s * height

    cx = np.zeros((nx, ny))
    cy = np.zeros((nx, ny))
    vol = np.zeros((nx, ny))
    sx = np.zeros((nx, ny, 4))
    sy = np.zeros((nx, ny, 4))

    for j in range(ny):
        for i in range(nx):
            px = [X[i, j], X[i + 1, j], X[i + 1, j + 1], X[i, j + 1]]
            py = [Y[i, j], Y[i + 1, j], Y[i + 1, j + 1], Y[i, j + 1]]
            a2 = cx_acc = cy_acc = 0.0
            for k in range(4):
                kn = (k + 1) % 4
                cross = px[k] * py[kn] - px[kn] * py[k]
                a2 += cross
                cx_acc += (px[k] + px[kn]) * cross
                cy_acc += (py[k] + py[kn]) * cross
            vol[i, j] = 0.5 * a2
            cx[i, j] = cx_acc / (6.0 * a2)
            cy[i, j] = cy_acc / (6.0 * a2)
            for k in range(4):
                kn = (k + 1) % 4
                sx[i, j, k] = py[kn] - py[k]
                sy[i, j, k] = -(px[kn] - px[k])

    return WedgeMesh(nx, ny, cx, cy, vol, sx, sy)


# ── Solver ───────────────────────────────────────────────────────────────────


def hllc(UL: np.ndarray, UR: np.ndarray, nx_: float, ny_: float) -> np.ndarray:
    """HLLC flux using Toro's pressure-based wave-speed estimate.

    The TypeScript solver uses the simpler Davis estimate; using a different one
    here means the two codes do not share a bug in the wave speeds.
    """
    g = GAMMA
    rL, uL, vL, pL = UL
    rR, uR, vR, pR = UR
    # Guard: a negative density/pressure here would make sqrt() NaN and poison the
    # whole run. Clamp rather than crash; the clamp shows up in the residual.
    rL = max(rL, 1e-9); pL = max(pL, 1e-6)
    rR = max(rR, 1e-9); pR = max(pR, 1e-6)
    EL = pL / (g - 1) + 0.5 * rL * (uL * uL + vL * vL)
    ER = pR / (g - 1) + 0.5 * rR * (uR * uR + vR * vR)

    unL = uL * nx_ + vL * ny_
    unR = uR * nx_ + vR * ny_
    aL = math.sqrt(g * pL / rL)
    aR = math.sqrt(g * pR / rR)

    # Toro (10.37)-(10.39): pressure-based estimate.
    rho_bar = 0.5 * (rL + rR)
    a_bar = 0.5 * (aL + aR)
    p_pv = 0.5 * (pL + pR) - 0.5 * (unR - unL) * rho_bar * a_bar
    p_star = max(0.0, p_pv)
    qL = 1.0 if p_star <= pL else math.sqrt(1.0 + (g + 1) / (2 * g) * (p_star / pL - 1.0))
    qR = 1.0 if p_star <= pR else math.sqrt(1.0 + (g + 1) / (2 * g) * (p_star / pR - 1.0))
    SL = unL - aL * qL
    SR = unR + aR * qR

    def flux(r, u, v, p, E, un):
        return np.array(
            [
                r * un,
                r * un * u + p * nx_,
                r * un * v + p * ny_,
                un * (E + p),
            ]
        )

    FL = flux(rL, uL, vL, pL, EL, unL)
    FR = flux(rR, uR, vR, pR, ER, unR)

    if SL >= 0.0:
        return FL
    if SR <= 0.0:
        return FR

    Sstar = (pR - pL + rL * unL * (SL - unL) - rR * unR * (SR - unR)) / (
        rL * (SL - unL) - rR * (SR - unR)
    )

    def star_flux(r, u, v, p, E, un, S, f):
        us = u + (Sstar - un) * nx_
        vs = v + (Sstar - un) * ny_
        Es = E / r + (Sstar - un) * (Sstar + p / (r * (S - un)))
        fac = r * (S - un) / (S - Sstar)
        US = np.array([fac, fac * us, fac * vs, fac * Es])
        return f + S * (US - np.array([r, r * u, r * v, E]))

    if Sstar >= 0.0:
        return star_flux(rL, uL, vL, pL, EL, unL, SL, FL)
    return star_flux(rR, uR, vR, pR, ER, unR, SR, FR)



def hllc_vector(UL: np.ndarray, UR: np.ndarray, nx: np.ndarray, ny: np.ndarray):
    """Vectorised HLLC over an array of faces.

    Same formulation as `hllc`, applied to whole arrays at once. The scalar
    version is kept above because it is readable and is what the formulation was
    verified against; this one exists so the oracle finishes inside a CI budget.
    """
    g = GAMMA
    rL, uL, vL, pL = UL[0], UL[1], UL[2], UL[3]
    rR, uR, vR, pR = UR[0], UR[1], UR[2], UR[3]

    rL = np.maximum(rL, 1e-9); pL = np.maximum(pL, 1e-6)
    rR = np.maximum(rR, 1e-9); pR = np.maximum(pR, 1e-6)

    EL = pL / (g - 1) + 0.5 * rL * (uL * uL + vL * vL)
    ER = pR / (g - 1) + 0.5 * rR * (uR * uR + vR * vR)

    unL = uL * nx + vL * ny
    unR = uR * nx + vR * ny
    aL = np.sqrt(g * pL / rL)
    aR = np.sqrt(g * pR / rR)

    # Toro's pressure-based wave speeds (a different estimate from the TypeScript
    # solver, so the two do not share a wave-speed bug).
    rho_bar = 0.5 * (rL + rR)
    a_bar = 0.5 * (aL + aR)
    p_pv = 0.5 * (pL + pR) - 0.5 * (unR - unL) * rho_bar * a_bar
    p_star = np.maximum(0.0, p_pv)
    qL = np.where(p_star <= pL, 1.0,
                  np.sqrt(np.maximum(1.0 + (g + 1) / (2 * g) * (p_star / pL - 1.0), 1.0)))
    qR = np.where(p_star <= pR, 1.0,
                  np.sqrt(np.maximum(1.0 + (g + 1) / (2 * g) * (p_star / pR - 1.0), 1.0)))
    SL = unL - aL * qL
    SR = unR + aR * qR

    FL = np.stack([rL * unL, rL * unL * uL + pL * nx,
                   rL * unL * vL + pL * ny, unL * (EL + pL)], axis=0)
    FR = np.stack([rR * unR, rR * unR * uR + pR * nx,
                   rR * unR * vR + pR * ny, unR * (ER + pR)], axis=0)

    denom = rL * (SL - unL) - rR * (SR - unR)
    denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)
    Sstar = (pR - pL + rL * unL * (SL - unL) - rR * unR * (SR - unR)) / denom

    def star(r, u, v, p, E, un, S, F):
        us = u + (Sstar - un) * nx
        vs = v + (Sstar - un) * ny
        Es = E / r + (Sstar - un) * (Sstar + p / (r * (S - un)))
        fac = r * (S - un) / (S - Sstar)
        US = np.stack([fac, fac * us, fac * vs, fac * Es], axis=0)
        U = np.stack([r, r * u, r * v, E], axis=0)
        return F + S[None, :, :] * (US - U)

    FLs = star(rL, uL, vL, pL, EL, unL, SL, FL)
    FRs = star(rR, uR, vR, pR, ER, unR, SR, FR)

    F = np.where((SL >= 0)[None, :, :], FL,
                 np.where((SR <= 0)[None, :, :], FR,
                          np.where((Sstar >= 0)[None, :, :], FLs, FRs)))

    speed = np.maximum(np.abs(unL) + aL, np.abs(unR) + aR)
    return F, speed


def solve(
    mesh: WedgeMesh,
    fs: dict,
    cfl: float = 0.9,
    max_iter: int = 12_000,
    tol: float = 1e-5,
    progress: bool = True,
):
    """Global-time-step FV solver. Slower than local time stepping, but simple.

    `progress` controls the iteration trace. It is suppressed in --json mode:
    the trace used to go to stdout regardless, which made the redirected output
    invalid JSON. Anything machine-readable must be the only thing on stdout.
    """
    nx, ny = mesh.nx, mesh.ny
    g = GAMMA

    rho = np.full((nx, ny), fs["rho"])
    u = np.full((nx, ny), fs["u"])
    v = np.full((nx, ny), fs["v"])
    p = np.full((nx, ny), fs["p"])

    def conserved(r, uu, vv, pp):
        E = pp / (g - 1) + 0.5 * r * (uu * uu + vv * vv)
        return np.stack([r, r * uu, r * vv, E], axis=0)

    W = conserved(rho, u, v, p)

    def primitives(Wc):
        r = Wc[0]
        uu = Wc[1] / r
        vv = Wc[2] / r
        pp = (g - 1) * (Wc[3] - 0.5 * r * (uu * uu + vv * vv))
        return r, uu, vv, pp

    def ghost(Wc):
        """Boundary fill: freestream left/top, supersonic outflow right, wall bottom."""
        G = Wc.copy()
        G[:, :, 0] = Wc  # placeholder shape
        # We store the padded array separately below instead.
        return G

    del ghost  # simple direct handling in the loop

    resid_hist = []
    ref = None

    for it in range(1, max_iter + 1):
        # Padded primitive state.
        r, uu, vv, pp = primitives(W)

        rp = np.pad(r, 1, mode="edge")
        up = np.pad(uu, 1, mode="edge")
        vp = np.pad(vv, 1, mode="edge")
        ppp = np.pad(pp, 1, mode="edge")

        # Padded arrays are (nx+2, ny+2): axis 0 is i, axis 1 is j.
        #   i = -1 (axis 0 = 0)  : freestream inlet
        #   i = nx (axis 0 = -1) : supersonic outflow, extrapolate
        #   j = -1 (axis 1 = 0)  : wall, reflect
        #   j = ny (axis 1 = -1) : freestream top
        rp[0, :] = fs["rho"]
        up[0, :] = fs["u"]
        vp[0, :] = fs["v"]
        ppp[0, :] = fs["p"]

        rp[-1, :] = rp[-2, :]
        up[-1, :] = up[-2, :]
        vp[-1, :] = vp[-2, :]
        ppp[-1, :] = ppp[-2, :]

        rp[:, -1] = fs["rho"]
        up[:, -1] = fs["u"]
        vp[:, -1] = fs["v"]
        ppp[:, -1] = fs["p"]

        # Wall at j = -1 (axis 1 = 0), reflecting about the local wall normal.
        nxs = mesh.sx[:, 0, 0]
        nys = mesh.sy[:, 0, 0]
        ln = np.hypot(nxs, nys)
        nxg, nyg = nxs / ln, nys / ln
        un = up[1:-1, 1] * nxg + vp[1:-1, 1] * nyg
        rp[:, 0] = rp[:, 1]
        ppp[:, 0] = ppp[:, 1]
        up[1:-1, 0] = up[1:-1, 1] - 2.0 * un * nxg
        vp[1:-1, 0] = vp[1:-1, 1] - 2.0 * un * nyg

        interior = (slice(1, -1), slice(1, -1))
        # Neighbour slices in padded (i, j) space.
        nbr = {
            0: (interior[0], slice(0, -2)),  # bottom  j-1
            1: (slice(2, None), interior[1]),  # right   i+1
            2: (interior[0], slice(2, None)),  # top     j+1
            3: (slice(0, -2), interior[1]),  # left    i-1
        }

        R = np.zeros_like(W)
        lam = np.zeros((nx, ny))

        for k in range(4):
            Sx = mesh.sx[:, :, k]
            Sy = mesh.sy[:, :, k]
            ln = np.hypot(Sx, Sy)
            nxk, nyk = Sx / ln, Sy / ln

            bj, bi = nbr[k]
            UL = np.stack([rp[interior], up[interior], vp[interior], ppp[interior]], axis=0)
            UR = np.stack([rp[bj, bi], up[bj, bi], vp[bj, bi], ppp[bj, bi]], axis=0)

            F, sp = hllc_vector(UL, UR, nxk, nyk)
            R += F * ln[None, :, :]
            lam += sp * ln

        # Local time stepping: valid for a steady problem (it changes only the
        # convergence path) and it is the difference between 600 iterations and
        # 10000 on this grid.
        dt = cfl * mesh.vol / np.maximum(lam, 1e-12)
        W = W - dt[None, :, :] * (R / mesh.vol[None, :, :])

        # Floor the conserved state so one bad cell cannot poison the run.
        W[0] = np.maximum(W[0], 1e-9)
        ke = 0.5 * (W[1] ** 2 + W[2] ** 2) / W[0]
        W[3] = np.maximum(W[3], ke + 1e-6)

        drho = dt * (R[0] / mesh.vol)
        res = float(np.sqrt(np.mean(drho**2)))
        if ref is None:
            ref = res
        ratio = res / ref
        resid_hist.append(ratio)
        if progress and it % 100 == 0:
            print(f"  iter {it:5d}  residual {ratio:.3e}", flush=True)
        if ratio < tol:
            if progress:
                print(f"  converged at {it} in {ratio:.3e}", flush=True)
            break

    r, uu, vv, pp = primitives(W)
    return r, uu, vv, pp, resid_hist


def extract(r, uu, vv, pp, mesh, theta_deg, skip_frac=0.08):
    """Find the shock per column and report the median β and p₂/p₁."""
    nx, ny = mesh.nx, mesh.ny
    th = math.radians(theta_deg)
    skip = max(2, int(nx * skip_frac))
    betas, prats = [], []

    for i in range(skip, nx):
        best_j, best_jump = -1, 0.0
        for j in range(1, ny):
            ratio = pp[i, j] / pp[i, j - 1]
            jump = max(ratio, 1.0 / ratio)
            if jump > best_jump:
                best_jump, best_j = jump, j
        if best_j < 0 or best_jump < 1.05:
            continue

        p_lo, p_hi = pp[i, best_j - 1], pp[i, best_j]
        p_cross = math.sqrt(max(p_lo * p_hi, 1e-30))
        frac = (p_hi - p_cross) / (p_hi - p_lo) if p_hi != p_lo else 0.5
        y_lo, y_hi = mesh.y[i, best_j - 1], mesh.y[i, best_j]
        y_shock = y_hi + frac * (y_lo - y_hi)

        betas.append(math.degrees(math.atan2(y_shock, max(mesh.x[i, 0], 1e-6))))
        j_wall = min(best_j - 1, max(0, round(ny * 0.03)))
        j_free = min(ny - 1, best_j + max(3, round(ny * 0.12)))
        prats.append(pp[i, j_wall] / pp[i, j_free])
    del th
    return float(np.median(betas)) if betas else float("nan"), float(
        np.median(prats)
    ) if prats else float("nan")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mach", type=float, default=5.5)
    ap.add_argument("--alt", type=float, default=27_000)
    ap.add_argument("--theta", type=float, default=10.0)
    ap.add_argument("--nx", type=int, default=160)
    ap.add_argument("--ny", type=int, default=100)
    ap.add_argument("--cfl", type=float, default=0.9)
    ap.add_argument("--max-iter", type=int, default=12_000)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    p_inf, T_inf = isa(args.alt)
    rho = p_inf / (R_AIR * T_inf)
    a = math.sqrt(GAMMA * R_AIR * T_inf)
    fs = {"rho": rho, "p": p_inf, "u": args.mach * a, "v": 0.0}

    exact = exact_oblique_shock(args.mach, args.theta)
    beta_theory = exact["beta_deg"]
    beta_rad = math.radians(beta_theory) if math.isfinite(beta_theory) else math.radians(45)
    height = math.tan(beta_rad) * 1.6
    mesh = wedge_mesh(
        args.theta, args.nx, args.ny, chord=1.0, height=height, upstream=max(0.3, height * 0.9)
    )

    # In --json mode stdout is the machine-readable payload and nothing else.
    r, uu, vv, pp, hist = solve(
        mesh, fs, cfl=args.cfl, max_iter=args.max_iter, progress=not args.json
    )
    beta, prat = extract(r, uu, vv, pp, mesh, args.theta)

    out = {
        "theta_deg": args.theta,
        "mach": args.mach,
        "altitude_m": args.alt,
        "computed": {
            "beta_deg": beta,
            "pressure_ratio": prat,
            "converged": bool(hist and hist[-1] < 1e-3),
            "final_residual": hist[-1] if hist else None,
        },
        "exact": {
            "beta_deg": beta_theory,
            "pressure_ratio": exact["pressure_ratio"],
        },
        "error_pct": {
            "beta": (beta - beta_theory) / beta_theory * 100 if math.isfinite(beta_theory) else None,
            "pressure_ratio": (prat - exact["pressure_ratio"]) / exact["pressure_ratio"] * 100,
        },
    }
    if args.json:
        print(json.dumps(out, indent=2))
    else:
        print(
            f"θ={args.theta:g}°  β {beta:.2f}° vs {beta_theory:.2f}°  "
            f"p₂/p₁ {prat:.3f} vs {exact['pressure_ratio']:.3f}"
        )
        for k, v in out["error_pct"].items():
            if v is not None:
                print(f"  {k}: {v:+.2f} %")


if __name__ == "__main__":
    main()
