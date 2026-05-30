# AeroForge Quickstart

## 1. Install

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[cad]"
# headless Linux: install the OpenGL runtime first
#   Amazon Linux / Fedora:  sudo dnf install -y mesa-libGL
#   Debian / Ubuntu:        sudo apt-get install -y libgl1
```

## 2. Check the environment

```bash
aeroforge doctor
```

You should see `cadquery: yes`. LLM providers will show `no` unless you configure
one — that's fine, the pipeline runs offline using the heuristic parser.

## 3. Generate geometry

```bash
aeroforge design "Design a NACA 2412 airfoil at 2 m chord, 5 m span" --out ./out
```

Each run writes, into the output directory:

- `*.step`, `*.iges`, `*.stl`, `*.brep` — the geometry
- `design_report.md` — physics, validation, confidence, export-control advisory
- `cep_manifest.json` — the CFD handoff package (Phase 1 → Phase 2 boundary)

## 4. Run the example suite

```bash
python examples/run_examples.py ./out
```

## 5. (Optional) Enable a local LLM

Install [Ollama](https://ollama.com), pull a coding model, and create
`~/.aeroforge/llm_config.yaml`:

```yaml
providers:
  ollama:
    endpoint: "http://localhost:11434"
    models:
      coding: "qwen2.5-coder:32b"
      fast: "qwen2.5-coder:7b"
    enabled: true
    privacy_mode: true
routing:
  default_provider: "ollama"
  code_generation: "ollama/qwen2.5-coder:32b"
fallback_chain:
  - "ollama/qwen2.5-coder:32b"
```

`aeroforge doctor` will then report `ollama: yes` and `Mode: LLM-assisted`.
