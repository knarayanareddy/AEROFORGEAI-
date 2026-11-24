#!/usr/bin/env python3
"""Verify an AeroForge CEP bundle.

This is deliberately independent of the code that wrote the archive: it uses
Python's standard `zipfile` and `hashlib`, so it checks the format rather than
trusting the writer.

    python3 oracle/verify_bundle.py bundle.zip

Exit code 0 if every artefact matches its declared sha256 and the manifest is
well-formed; 1 otherwise. Prints a per-file report either way.
"""

from __future__ import annotations

import hashlib
import json
import sys
import zipfile

REQUIRED = {"manifest.json", "geometry/wedge.step", "report/report.md"}


def main(path: str, expect: str = "consistent") -> int:
    """Verify a bundle.

    `expect` lets CI assert a specific verdict rather than only consistency:
      consistent (default) — the flag must agree with the reported errors
      pass                 — the bundle must report a PASS verdict
      fail                 — the bundle must report a FAIL verdict
    The last is not a joke: a bundle produced at a coarse grid SHOULD fail the
    2 % criterion, and a pipeline that quietly reported PASS there would be the
    bug this check exists to catch.
    """
    ok = True

    try:
        z = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as e:
        print(f"FAIL  cannot open as a zip: {e}")
        return 1

    if z.testzip() is not None:
        print(f"FAIL  corrupt entry: {z.testzip()}")
        return 1
    print(f"ok    archive integrity (zipfile.testzip)")

    names = set(z.namelist())
    missing = REQUIRED - names
    if missing:
        print(f"FAIL  missing required entries: {sorted(missing)}")
        ok = False
    else:
        print(f"ok    required entries present ({len(REQUIRED)})")

    if "manifest.json" not in names:
        return 1

    m = json.loads(z.read("manifest.json"))

    if m.get("cep_version") != "1.0":
        print(f"FAIL  unexpected cep_version {m.get('cep_version')!r}")
        ok = False
    else:
        print("ok    cep_version 1.0")

    errors: list[str] = []
    for art in m.get("artifacts", []):
        p = art["path"]
        if p not in names:
            errors.append(f"{p}: listed in manifest but absent from archive")
            continue
        data = z.read(p)
        if len(data) != art["bytes"]:
            errors.append(f"{p}: size {len(data)} != manifest {art['bytes']}")
            continue
        digest = hashlib.sha256(data).hexdigest()
        if digest != art["sha256"]:
            errors.append(f"{p}: sha256 {digest[:12]}… != manifest {art['sha256'][:12]}…")
            continue
        print(f"ok    {p:<22} {len(data):>9,d} B  sha256 matches")

    if errors:
        for e in errors:
            print(f"FAIL  {e}")
        ok = False
    else:
        print(f"ok    all {len(m.get('artifacts', []))} manifest hashes verify")

    v = m.get("verification", {})
    if "passed" not in v:
        print("FAIL  manifest has no verification verdict")
        ok = False
    else:
        b = v.get("error_pct", {}).get("beta")
        p = v.get("error_pct", {}).get("pressure_ratio")
        print(
            f"info  verdict={'PASS' if v['passed'] else 'FAIL'} "
            f"beta_error={b}% pressure_error={p}%"
        )
        # The manifest claims a 2 % criterion; check the claim is consistent with
        # the numbers it reports, rather than taking the flag on trust.
        if b is not None and p is not None:
            consistent = abs(b) < 2 and abs(p) < 2
            if consistent != bool(v["passed"]):
                print("FAIL  'passed' flag contradicts the reported errors")
                ok = False
            else:
                print("ok    'passed' flag agrees with the reported errors")

        if expect != "consistent":
            want = expect == "pass"
            if bool(v["passed"]) != want:
                print(f"FAIL  expected a {expect.upper()} verdict, manifest reports "
                      f"{'PASS' if v['passed'] else 'FAIL'}")
                ok = False
            else:
                print(f"ok    verdict is {expect.upper()} as expected")

    # The bundle hash cannot be inside the bundle; print it for external pinning.
    with open(path, "rb") as fh:
        print(f"info  bundle sha256 = {hashlib.sha256(fh.read()).hexdigest()}")

    print("\nRESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    expect = "consistent"
    if "--expect" in sys.argv:
        i = sys.argv.index("--expect")
        expect = sys.argv[i + 1]
        del sys.argv[i : i + 2]
    sys.exit(main(sys.argv[1], expect))
