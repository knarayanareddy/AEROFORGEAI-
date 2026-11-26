#!/usr/bin/env python3
"""Validate the manifests in deploy/k8s against real Kubernetes schemas.

`kubernetes-validate` ships the upstream OpenAPI schemas, so this checks that
each object is a VALID Kubernetes resource at a pinned API version — not merely
that the YAML parses. The distinction matters: a Deployment with `replicas` as a
string parses fine and is rejected by the API server.

    python3 oracle/validate_k8s.py [--version 1.29.0] deploy/k8s/*.yaml
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import kubernetes_validate
    import yaml
except ImportError:
    print("FAIL  kubernetes-validate / pyyaml not installed")
    sys.exit(1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+", type=Path)
    ap.add_argument("--version", default="1.29.0")
    args = ap.parse_args()

    ok = True
    total = 0

    for path in args.paths:
        for doc in yaml.safe_load_all(path.read_text()):
            if not doc:
                continue
            total += 1
            kind = doc.get("kind", "<no kind>")
            try:
                # strict=True rejects unknown fields, which is what catches typos
                # like `readinessProb:` that would otherwise be ignored.
                kubernetes_validate.validate(doc, args.version, strict=True)
                print(f"ok    {path.name:<18} {kind}")
            except Exception as e:  # noqa: BLE001 - the library raises several types
                ok = False
                first = str(e).strip().splitlines()[0]
                print(f"FAIL  {path.name:<18} {kind}: {first}")

    if total == 0:
        print("FAIL  no documents found")
        return 1

    print(f"\nvalidated {total} object(s) against Kubernetes {args.version}")
    print("RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
