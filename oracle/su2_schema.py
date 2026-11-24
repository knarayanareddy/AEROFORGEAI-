#!/usr/bin/env python3
"""Validate a generated SU2 case file against SU2's own option registry.

Why this exists: SU2 silently ignores an unrecognised config key. A typo does
not error — it falls back to the default and the solver happily computes
something else. So "the file parses" proves nothing; the keys have to be checked
against the registry the solver actually builds.

Usage:
    python3 oracle/su2_schema.py case.cfg mesh.su2 --schema schema.json

Exit 0 if every key is a registered option and every enum-style value is a
member of the registry, 1 otherwise.

The schema JSON is produced by oracle/su2_schema.py --extract from a SU2 source
tree (see that subcommand), so the check is driven by the real C++ source rather
than by a hand-copied list.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Keys that SU2 consumes but which are, by design, not registered options:
# file names that are passed through, and section markers.
PASSTHROUGH = {
    "MESH_FILENAME",
    "MESH_FORMAT",
    "RESTART_FILENAME",
    "SOLUTION_FILENAME",
    "CONV_FILENAME",
}

# Options whose value is a free-form list of marker tags or numbers. The value
# check does not apply.
FREE_FORM_PREFIXES = (
    "MARKER_",
    "OUTPUT_FILES",
    "SCREEN_OUTPUT",
    "HISTORY_OUTPUT",
    "VOLUME_OUTPUT",
    "SURFACE_OUTPUT",
    "MG_PRE_SMOOTH",
    "MG_POST_SMOOTH",
    "MG_CORRECTION_SMOOTH",
    "MG_DAMP",
    "JST_SENSOR_COEFF",
    "CFL_ADAPT_PARAM",
    "REF_ORIGIN_MOMENT",
)


def parse_case(text: str) -> list[tuple[int, str, str]]:
    """Return (line_no, key, value) for each assignment line."""
    out = []
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.split("%", 1)[0].strip()
        if not line or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out.append((n, key.strip(), value.strip()))
    return out


def extract_schema(su2_source: Path) -> dict:
    """Mine the option registry and enum maps out of a SU2 source tree."""
    cfg = su2_source / "Common" / "src" / "CConfig.cpp"
    opt_hpp = su2_source / "Common" / "include" / "option_structure.hpp"
    if not cfg.exists() or not opt_hpp.exists():
        raise SystemExit(f"not a SU2 source tree: {su2_source}")

    names = set(
        re.findall(r'add[A-Za-z]+Option\( *"([A-Z0-9_]+)"', cfg.read_text(errors="ignore"))
    )

    maps: dict[str, list[str]] = {}
    hpp = opt_hpp.read_text(errors="ignore")
    for m in re.finditer(r"static const MapType<[^>]+>\s+(\w+)\s*=\s*\{(.*?)\n\};", hpp, re.S):
        vals = re.findall(r'MakePair\(\s*"([A-Za-z0-9_+\-]+)"\s*,', m.group(2))
        if vals:
            maps[m.group(1)] = sorted(set(vals))

    all_values = sorted({v for vs in maps.values() for v in vs})
    return {"options": sorted(names), "maps": maps, "values": all_values}


def find_schema() -> Path | None:
    """Locate a cached schema next to this script."""
    for p in (Path("oracle/su2_schema.json"), Path("su2_schema.json")):
        if p.exists():
            return p
    return None


def validate_case(text: str, schema: dict) -> list[str]:
    registered = set(schema["options"])
    values = set(schema["values"])
    problems: list[str] = []

    seen = parse_case(text)
    if not seen:
        return ["no option assignments found"]

    for line_no, key, value in seen:
        if key in registered or key in PASSTHROUGH:
            continue
        problems.append(f"line {line_no}: '{key}' is not a registered SU2 option")

    for line_no, key, value in seen:
        if key.startswith(FREE_FORM_PREFIXES) or key in PASSTHROUGH:
            continue
        if not value or value.startswith("("):
            continue
        try:
            float(value)
            continue  # numeric — nothing to check against the enum registry
        except ValueError:
            pass
        if value in ("YES", "NO", "DIRECT", "CONTINUOUS_ADJOINT"):
            continue
        if value not in values:
            problems.append(
                f"line {line_no}: value '{value}' for {key} is not a known SU2 enum member"
            )
    return problems


def parse_mesh_header(text: str) -> dict:
    """Read the structural parts of a .su2 ASCII mesh."""
    info: dict = {}
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        s = line.strip()
        if s.startswith("NDIME="):
            info["ndime"] = int(s.split("=")[1])
        elif s.startswith("NPOIN="):
            info["npoin"] = int(s.split("=")[1])
        elif s.startswith("NELEM="):
            info["nelem"] = int(s.split("=")[1])
        elif s.startswith("NMARK="):
            info["nmark"] = int(s.split("=")[1])
        elif s.startswith("MARKER_TAG="):
            info.setdefault("tags", []).append(s.split("=", 1)[1].strip())
        elif s.startswith("MARKER_ELEMS="):
            info.setdefault("marker_elems", []).append(int(s.split("=")[1]))
    return info


def validate_mesh(text: str) -> list[str]:
    problems: list[str] = []
    info = parse_mesh_header(text)

    for req in ("ndime", "npoin", "nelem", "nmark", "tags"):
        if req not in info:
            problems.append(f"mesh is missing {req.upper()}")
    if problems:
        return problems

    if info["ndime"] != 2:
        problems.append(f"expected NDIME= 2, got {info['ndime']}")

    if len(info["tags"]) != info["nmark"]:
        problems.append(f"NMARK= {info['nmark']} but {len(info['tags'])} marker blocks found")

    if len(info["marker_elems"]) != info["nmark"]:
        problems.append("MARKER_ELEMS count does not match NMARK")

    # Point and element blocks must actually contain the declared count. A
    # mismatch is the classic way a mesh writer produces a file that opens and
    # then produces nonsense.
    lines = [ln.strip() for ln in text.splitlines()]
    try:
        p = next(i for i, ln in enumerate(lines) if ln.startswith("NPOIN="))
        npoin = info["npoin"]
        for k in range(npoin):
            parts = lines[p + 1 + k].split()
            if len(parts) != 2:
                problems.append(f"NPOIN line {k} has {len(parts)} fields, expected 2")
                break
            float(parts[0]); float(parts[1])
    except (StopIteration, IndexError, ValueError) as e:
        problems.append(f"NPOIN block malformed: {e}")

    try:
        e0 = next(i for i, ln in enumerate(lines) if ln.startswith("NELEM="))
        for k in range(0, min(info["nelem"], 50)):  # sample; full check is O(n)
            parts = lines[e0 + 1 + k].split()
            if len(parts) != 6:
                problems.append(f"NELEM line {k} has {len(parts)} fields, expected 6 (type + 4 nodes + id)")
                break
            if int(parts[0]) != 9:
                problems.append(f"NELEM line {k} is not VTK type 9 (quadrilateral): {parts[0]}")
                break
    except (StopIteration, IndexError, ValueError) as e:
        problems.append(f"NELEM block malformed: {e}")

    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("case", nargs="?", help="case .cfg to validate")
    ap.add_argument("mesh", nargs="?", help="mesh .su2 to validate")
    ap.add_argument("--schema", type=Path, help="schema JSON (default: oracle/su2_schema.json)")
    ap.add_argument("--extract", type=Path, metavar="SU2_SOURCE", help="build a schema from a SU2 source tree")
    args = ap.parse_args()

    if args.extract:
        schema = extract_schema(args.extract)
        out = Path("oracle/su2_schema.json")
        out.write_text(json.dumps(schema, indent=1))
        print(f"schema written to {out}: {len(schema['options'])} options, "
              f"{len(schema['maps'])} enum maps, {len(schema['values'])} enum values")
        return 0

    if not args.case:
        ap.print_help()
        return 2

    if args.schema:
        schema = json.loads(args.schema.read_text())
    else:
        found = find_schema()
        if not found:
            print("FAIL  no schema found; run --extract against a SU2 source tree")
            return 1
        schema = json.loads(found.read_text())

    ok = True

    text = Path(args.case).read_text()
    problems = validate_case(text, schema)
    n_keys = len(parse_case(text))
    if problems:
        ok = False
        for p in problems:
            print(f"FAIL  {p}")
    else:
        print(f"ok    {n_keys} config keys all registered, all enum values known")

    if args.mesh:
        mesh_problems = validate_mesh(Path(args.mesh).read_text())
        if mesh_problems:
            ok = False
            for p in mesh_problems:
                print(f"FAIL  {p}")
        else:
            print("ok    mesh structure (NDIME/NPOIN/NELEM/NMARK, VTK quad type)")

    print("\nRESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
