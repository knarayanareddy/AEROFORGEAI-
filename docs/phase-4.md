# Phase 4 — Hardening

**Status: four of the five P4 items are implemented and validated against
independent engines. One (Slurm) is not started, and none of it is a security
review.**

The roadmap item reads: *OIDC/RBAC, OPA export-control policy, hash-chained audit,
signed bundles, K8s/Slurm.* This document is ordered by how much of each claim is
actually backed by something that runs.

| Item | Status | What does the backing |
|---|---|---|
| Rego export policy | **executed** | `regopy` 1.5.2 — OPA's own Rego runtime |
| TS policy mirror | **conformance-tested** | 27-case table, both implementations, mutation-verified |
| Signed bundles | **cross-verified** | Node → WebCrypto → PyNaCl, three implementations |
| Hash-chained audit | **tamper-tested** | edit / delete / reorder detection |
| OIDC + RBAC | **tested with real crypto** | RS256 tokens minted in-test, not stubbed |
| K8s manifests | **schema-validated** | `kubernetes-validate` 1.37, real 1.29 schemas |
| Slurm adapter | **not started** | — |

---

## 1. The export policy is illustrative, not legal

`policy/export_control.rego` is modelled on the *shape* of Wassenaar / MTCR
categories: a destination check, a classification tier, a Mach ceiling per tier,
and a reviewer requirement for the strictest tier.

**The thresholds are invented.** `ECL:ML` at Mach 4.0 and `ECL:MTCR` at Mach 3.0
are placeholders chosen so the tests exercise both outcomes. They are not
quotations from any control list, and this codebase must not be used to make a
real export decision. Getting a real classification requires a person who knows
the regulations, and the policy file would need rewriting against the actual
text.

What *is* verified is the machinery: that a policy written in Rego and a mirror
written in TypeScript produce identical verdicts on the same inputs, and that the
Rego is executed by a real engine rather than by a lookalike.

---

## 2. Two implementations, one policy — and why that is not optional

The application is a static bundle with no backend, so the policy must be
evaluable in the browser. The audit requirement means it must also exist as Rego
that a compliance reviewer can read.

That means two implementations, which is a liability. The mitigation is not care,
it is measurement:

```
policy/cases.json          27 cases, 7 allow / 20 deny
policy/export_control.rego the policy
policy/rego_results.json   verdicts from regopy
```

`oracle/opa_eval.py` runs every case through regopy and writes the results.
`src/lib/exportPolicy.conformance.test.ts` replays the same table through the
TypeScript mirror and asserts the verdict, the classification, **and the denial
message text** all match.

### The conformance test is mutation-verified

A conformance test that passes when both sides are wrong is worthless, so it was
probed. Changing the TypeScript `ECL:ML` limit from `4.0` to `5.0`:

```
× civil-ml-over-limit: verdict and denials agree
× design-point-m55: verdict and denials agree
Tests  2 failed | 17 passed (19)
```

Exactly the two cases that straddle Mach 4.0. The first attempt at this probe
used the wrong quote character and silently changed nothing — the test passed and
looked fine. That is the failure mode this whole document exists to avoid, and it
is recorded here rather than quietly retried.

The table itself is checked for balance: `opa_eval.py` fails if the cases do not
produce both verdicts, because a table of permitted exports would pass a naive
comparison while proving nothing.

The table grew from 15 to 27 cases when the required `category` field landed.
Adding a required input invalidates every old case at once — all 15 previously
passed cases began denying for the *new* reason rather than the reason each was
written to test. The runner caught exactly that (it reported "0 allowed, 15
denied" and refused), which is why it asserts balance rather than just exit
code.

### The category field (added after Phase 4 shipped)

The policy originally decided entirely on *destination*, *classification* and
*Mach*. A Mach 2.5 NACA fin — a plausible USML Cat VIII article — was permitted
to any NATO destination with no statement at all about whether the airframe
itself is controlled.

`category` closes that. It is **asserted by a human** and never inferred:

| Value | Meaning | Rule |
|---|---|---|
| (absent) | nothing asserted | **denied** |
| `BOGUS` / `""` | unrecognised | **denied** |
| `none` | reviewed, not controlled | allowed, subject to the other rules |
| `USML-IV` | launch vehicles, missiles | **denied at every destination** |
| `USML-VIII` | aircraft | denied unless destination is `nato` |
| `EAR-9A` | commercial space / propulsion | allowed, subject to the other rules |

A `none` or `EAR-9A` design above Mach 5 with no named reviewer earns an
additional denial: asserting "not controlled" at hypersonic speed is a claim
that needs a name attached.

**A reviewer does not override a Mach limit.** Writing the test for that rule
surfaced the point: an `ECL:ML` design at Mach 5.5 is still denied by the Mach-4
ceiling whether or not a reviewer is named, and an `ECL:MTCR` design at 5.5 is
still denied by its own 3.0 ceiling. The first case written for this rule was
itself a bad test — it exercised the Mach limit, not the reviewer rule — and was
kept with a note rather than deleted, with a second case added that isolates what
it was meant to show.

**Why not keyword classification.** The parallel Python branch (PR #1) inferred
categories by substring-matching `inlet`/`nozzle`/`scramjet` in a template name.
Prototyped against this project's own ten templates, it flagged **5 of 10** —
including `cd_nozzle_bell_rao`, `cd_nozzle_conical` and `min_length_nozzle`,
three benign rocket-nozzle contours — and silently passed anything whose name
did not match. A 50 % false-positive rate plus silent misses is worse than no
classifier, because it trains operators to ignore the output.

**A Rego semantic that cost a round trip.** `not input.category` succeeds only
when the key is undefined; in Rego a *string is truthy*, so `""` is a defined
term and the "not asserted" rule does **not** fire for it — the unknown-category
rule does instead. JavaScript's `!category` treats `""` as absent, giving the
opposite message. The mirror shipped that bug first; the conformance case
`cat-empty-string` caught it, which is the case that exists only because
somebody thought to write it.

### What the policy does not do

An unknown classification string falls through every Mach rule and is **allowed**.
The TypeScript test pins this behaviour rather than hiding it. Closing it means
validating the tier against an enum at the boundary; adding a catch-all deny rule
would change the meaning for every legitimate tier, so it is recorded as a known
limitation instead of guessed at.

---

## 3. Signed bundles: three implementations must agree

Signing is Ed25519, because it is fast, has no parameter choices to get wrong, and
is available in WebCrypto, Node and libsodium without extra dependencies.

| Layer | Implementation |
|---|---|
| Sign (browser path) | WebCrypto `Ed25519` |
| Sign (CI path) | `node:crypto` |
| Verify (independent) | PyNaCl / libsodium |

`oracle/verify_signature.py` recomputes the bundle's SHA-256 and checks it against
the digest in the signature block **before** verifying the signature, because a
valid signature over the wrong digest proves nothing.

It also runs a **negative control**: the same signature must fail against an
unrelated digest. A verifier that accepts everything would otherwise look fine.

```
ok    signed digest matches the bundle bytes
ok    signature verifies with PyNaCl
ok    negative control: unrelated digest is rejected
RESULT: PASS
```

### What a signature proves here

It proves the bytes were signed by the holder of a specific private key. It does
**not** establish who that holder is — identity comes from the key distribution
channel, not from the signature. The CI key is ephemeral and generated per run;
no key material is committed. That validates the mechanism and says nothing about
the identity of any signer.

---

## 4. The audit chain, and precisely where it stops

Each entry hashes `seq | prev | at | action | outcome | actor | subject | detail`
with sorted-key JSON, so the encoding does not depend on object insertion order.
`prev` is the predecessor's hash; the first entry points at 64 zeros.

Tests cover the three ways a log is falsified:

| Attack | Detected by |
|---|---|
| Edit an entry (flip a deny to an allow) | content hash mismatch |
| Delete an entry | sequence number *and* link break |
| Reorder entries | link break |

**What it does not do:** a forger who recomputes the whole chain produces a chain
that verifies. There is a test that does exactly this and asserts it passes. That
is not a bug being tolerated — it is the structural limit of a hash chain, and the
only defence is publishing the head hash somewhere the forger does not control (a
signed bundle, a git commit, a ticket). A truncated log is likewise valid up to
its new head.

Writing a test that demonstrates your own mechanism failing is uncomfortable. Not
writing it would mean implying the chain is tamper-proof when it is not.

---

## 5. OIDC and RBAC

`src/lib/jwt.ts` implements compact JWS verification with no dependencies, tested
against **RFC 7515 Appendix A.1** — the HMAC vector from the standard, not a token
it produced itself.

The important property is that the algorithm allow-list is checked *before* the
crypto, and the list has no default:

- `alg: none` is refused by the allow-list.
- An `HS256` token presented to an RS256 verifier is refused by the allow-list,
  which is the algorithm-confusion attack.
- A token with **no `exp`** is refused. Treating a missing expiry as "no
  constraint" is how sessions become permanent.

`src/lib/oidc.ts` maps validated claims onto roles and **drops unknown roles**
rather than passing them through, so a provider that starts emitting `superuser`
does not silently acquire whatever the application might later attach to it.

RBAC deliberately withholds convenient permissions:

- `engineer` can run cases but **not** export bundles.
- `export_officer` can export but **not** run new cases.
- `admin` does **not** hold `bundle:export`.

Two-person control is a property of the *pair* of actions, so it cannot live in
the permission table; `maySignExport` takes the exporter's identity and refuses
self-signing when the deployment enables it.

### The gate's ordering is a security property

`gatedExport` runs permission → policy → signing, and there is a test asserting
that an engineer attempting a sanctioned-destination export is told about the
**permission**, not the destination. Leaking policy detail to a principal who may
not export at all is information disclosure.

Every outcome is audited, including denials — a gate that logs only successes
hides precisely the events an auditor wants.

---

## 6. Kubernetes

`deploy/k8s/` holds a Deployment, Service and ConfigMap, validated against real
Kubernetes 1.29 OpenAPI schemas by `kubernetes-validate` with `strict=True`.

The validator is probed in CI with two mutations that YAML parsing accepts and the
API server would not:

| Mutation | Result |
|---|---|
| `replicas: "two"` | `'two' is not of type 'integer', 'null'` |
| `readinessProb:` (typo) | `Additional properties are not allowed` |

**What these manifests are not.** The shipped application is a single-file static
bundle with no server component. This Deployment serves static files; it is not
the backend the later roadmap phases imply. It exists because the P4 item names
K8s, and a manifest that pretended to run a service which does not exist would be
worse than none. In particular:

- The ConfigMap holding `index.html` is a demo convenience **and it is close to
  failing**. Kubernetes caps a ConfigMap object at 1 MiB and the built bundle is
  1,003,378 bytes (979.9 KiB, 0.957 MiB) — about 44 KiB of headroom, down from 47. The next
  feature that grows the bundle will break this manifest, and the failure will
  surface at `kubectl apply`, not in CI. A real deployment would bake the bundle
  into the image or serve it from a CDN; this is neither.
- There is no Ingress, no TLS, no HPA, no NetworkPolicy, no PodDisruptionBudget.
- The image is a stock `nginx-unprivileged`; nothing here has been applied to a
  cluster, and `kubernetes-validate` checks structure, not cluster behaviour.

---

## 7. Slurm — not started

The P4 item says "K8s/Slurm". Nothing Slurm-related exists. Writing a
`sbatch` template with no cluster to submit to would be the same mistake as the
SU2 adapter that Phase 3 declined to write. If and when a cluster exists, the
honest starting point is a batch script that runs `SU2_CFD` on the Phase 3 case —
which is also the outstanding item from that phase.

---

## 8. What this is not

This is not a security review, a penetration test, or an accreditation
submission. Specifically:

- No threat model beyond what is described above.
- No key management: keys are ephemeral or in-memory, never in a vault.
- No session management, refresh tokens, revocation, or logout.
- No rate limiting, CSRF protection, or transport security decisions — there is
  no server to put them in.
- The `crypto.subtle` path requires a secure context; `jwt.ts` does not, but
  `oidc.ts` does.
- The policy thresholds are invented (see §1).

Anyone reading the table at the top of this document as a compliance claim would
be misreading it. It says which mechanisms have been executed and cross-checked.
That is all it says.

---

## 9. Files

| File | Purpose |
|---|---|
| `src/lib/jwt.ts` | Compact JWS verification, RFC 7515-vector tested |
| `src/lib/oidc.ts` | Claims → Principal, RS256/ES256 via WebCrypto |
| `src/lib/rbac.ts` | Role table, permissions, two-person control |
| `src/lib/exportPolicy.ts` | Browser mirror of the Rego |
| `src/lib/exportPolicy.conformance.test.ts` | Mirror vs regopy, mutation-verified |
| `src/lib/auditLog.ts` | Hash-chained, append-only log |
| `src/lib/signature.ts` | Ed25519 sign/verify, WebCrypto + Node |
| `src/lib/gatedExport.ts` | auth → RBAC → policy → audit → signature |
| `policy/export_control.rego` | The policy, in Rego |
| `policy/cases.json` | 15-case shared conformance table |
| `policy/rego_results.json` | Verdicts from the real engine (committed) |
| `oracle/opa_eval.py` | Runs the policy through regopy |
| `oracle/verify_signature.py` | PyNaCl verification + negative control |
| `oracle/validate_k8s.py` | Real-schema Kubernetes validation |
| `deploy/k8s/*.yaml` | Deployment, Service, ConfigMap |
| `.github/workflows/ci.yml` | `harden` job: policy, conformance, signatures, K8s |
