"""Orchestration Agent — the top-level ``AeroForge`` entry point.

Wires the full Phase-1 pipeline and runs it end to end:

    natural language
      -> Intent Agent            (StructuredDesignIntent)
      -> Physics Constraint Agent (PhysicsAugmentedIntent)
      -> Geometry Planning Agent  (GeometryTaskDAG)
      -> Execution Agent          (codegen -> sandbox -> error correction)
      -> Validation Agent         (5-stage ValidationReport)
      -> Report Agent             (Markdown report + CEP manifest)

Everything runs offline by default; an LLM is used only if one is configured and
reachable.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from .. import __version__
from ..adapters import available_adapters, get_adapter
from ..adapters.base import CadToolAdapter
from ..config import AeroForgeConfig
from ..exceptions import CadGenerationError
from ..geometry.engine import AerospaceGeometryEngine
from ..llm.gateway import LLMGateway
from ..memory.episodic_memory import EpisodicMemory
from ..memory.session_memory import AgentMemory
from ..security.audit_logger import AuditLogger
from ..security.ip_classifier import IPClassifier
from ..types import AutonomyLevel, CadOutputPackage, StructuredDesignIntent
from .cad_code_generation_agent import CADCodeGenerationAgent
from .error_correction_agent import ErrorCorrectionAgent
from .execution_agent import ExecutionAgent
from .geometry_planning_agent import GeometryPlanningAgent
from .intent_agent import IntentAgent
from .physics_constraint_agent import PhysicsConstraintAgent
from .report_agent import ReportAgent
from .validation_agent import ValidationAgent


class AeroForge:
    """High-level façade for the AeroForge CAD automation pipeline."""

    def __init__(
        self,
        config: Optional[AeroForgeConfig] = None,
        adapter: Optional[CadToolAdapter] = None,
        llm: Optional[LLMGateway] = None,
    ):
        self.config = config or AeroForgeConfig.load()
        self.audit = AuditLogger(self.config.config_home / "audit.log")
        self.llm = llm or LLMGateway(self.config.llm, audit_logger=self.audit)

        # Only hand the LLM to agents if a real (non-offline) provider is live.
        providers = self.llm.available_providers()
        self._llm_active = any(v for k, v in providers.items() if k != "offline")
        agent_llm = self.llm if self._llm_active else None

        self.adapter = adapter or get_adapter(
            self.config.default_adapter, timeout_s=self.config.execution_timeout_s
        )
        self.engine = AerospaceGeometryEngine()

        self.intent_agent = IntentAgent(llm=agent_llm)
        self.physics_agent = PhysicsConstraintAgent()
        self.planning_agent = GeometryPlanningAgent()
        self.codegen_agent = CADCodeGenerationAgent(engine=self.engine, llm=agent_llm)
        self.corrector = ErrorCorrectionAgent(llm=agent_llm)
        self.execution_agent = ExecutionAgent(
            self.adapter, codegen=self.codegen_agent, corrector=self.corrector, llm=agent_llm
        )
        self.validation_agent = ValidationAgent()
        self.report_agent = ReportAgent(aeroforge_version=__version__)

        self.memory = AgentMemory()
        self.episodic = EpisodicMemory(self.config.config_home / "episodes")
        self.ip_classifier = IPClassifier()

    # ------------------------------------------------------------------ #
    def design(
        self,
        request: str,
        out_dir: Optional[Path] = None,
        autonomy_level: Optional[AutonomyLevel] = None,
    ) -> CadOutputPackage:
        """Run the full pipeline for a natural-language design request."""
        intent = self.intent_agent.parse(request)
        return self.design_intent(intent, out_dir=out_dir, raw_request=request)

    def design_intent(
        self,
        intent: StructuredDesignIntent,
        out_dir: Optional[Path] = None,
        raw_request: Optional[str] = None,
    ) -> CadOutputPackage:
        """Run the pipeline from an already-parsed intent.

        Used by the Part-3 optimization loop to iterate on parameters without
        re-parsing natural language each time.
        """
        ip = self.ip_classifier.classify(raw_request or intent.raw_input or intent.geometry_type)
        session = self.memory.new_session(intent)
        session.log(
            "intent_parsed",
            geometry_type=intent.geometry_type,
            confidence=intent.intent_confidence,
            ip_sensitive=ip.is_sensitive,
        )

        try:
            augmented = self.physics_agent.augment(intent)
            session.log("physics_augmented", computations=augmented.physics_computations)

            dag = self.planning_agent.plan(augmented)
            session.log("planned", n_tasks=len(dag.tasks))

            run_dir = Path(out_dir) if out_dir else (self.config.output_dir / intent.design_id)
            results = self.execution_agent.execute(dag, augmented, run_dir, session)

            if not results.succeeded:
                err = next((r.error for r in results.results if not r.success), "unknown error")
                self.memory.record_failure(session, err or "geometry generation failed")
                self.audit.log_event(
                    {
                        "type": "design_run",
                        "status": "failed",
                        "design_id": intent.design_id,
                        "error": err,
                    }
                )
                raise CadGenerationError(f"Geometry generation failed: {err}")

            validation = self.validation_agent.validate(results, augmented)
            session.log(
                "validated", passed=validation.passed, confidence=validation.confidence.overall
            )

            provider, model = self._provenance()
            pkg = self.report_agent.package(
                results,
                augmented,
                validation,
                run_dir,
                session.session_id,
                provider=provider,
                model=model,
            )

            self._record(pkg, session, ip)
            return pkg
        except CadGenerationError:
            raise
        except Exception as exc:  # noqa: BLE001
            self.memory.record_failure(session, str(exc))
            self.audit.log_event(
                {
                    "type": "design_run",
                    "status": "error",
                    "design_id": intent.design_id,
                    "error": str(exc),
                }
            )
            raise

    # ------------------------------------------------------------------ #
    def doctor(self) -> Dict[str, Any]:
        """Diagnostics for ``aeroforge doctor``."""
        from ..templates import default_library

        return {
            "version": __version__,
            "default_adapter": self.config.default_adapter,
            "adapters": available_adapters(),
            "llm_providers": self.llm.available_providers(),
            "llm_active": self._llm_active,
            "templates": len(default_library().ids()),
            "output_dir": str(self.config.output_dir),
            "geometry_types": self.engine.supported_types(),
        }

    # ------------------------------------------------------------------ #
    def _provenance(self):
        if not self._llm_active:
            return "offline/heuristic", "rule-based"
        live = [k for k, v in self.llm.available_providers().items() if v and k != "offline"]
        provider = (
            f"local/{live[0]}"
            if live and live[0] in ("ollama", "llama_cpp")
            else (live[0] if live else "offline")
        )
        return provider, "configured"

    def _record(self, pkg: CadOutputPackage, session, ip) -> None:
        summary = {
            "design_id": pkg.design_id,
            "geometry_type": pkg.intent.geometry_type,
            "mach_design_point": pkg.intent.mach_design_point,
            "confidence": pkg.validation.confidence.overall,
            "passed": pkg.validation.passed,
            "artifacts": list(pkg.artifacts.keys()),
            "ip_sensitive": ip.is_sensitive,
        }
        self.memory.record_success(session, summary)
        self.episodic.record(summary)
        self.audit.log_event({"type": "design_run", "status": "ok", **summary})
