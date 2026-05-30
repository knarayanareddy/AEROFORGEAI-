"""Enterprise features — interface stubs (Part 3 roadmap).

Defines the contracts for authentication, multi-tenant projects, and team
collaboration that a production deployment would implement (e.g. OIDC/SAML auth,
per-tenant data isolation, role-based access). These are deliberately minimal
stubs so the API/platform can reference a stable surface; production
implementations (identity provider, database, RBAC) are future work.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class User:
    id: str
    email: str
    roles: List[str] = field(default_factory=lambda: ["engineer"])


@dataclass
class Project:
    id: str
    name: str
    tenant_id: str
    members: List[str] = field(default_factory=list)


class AuthProvider(abc.ABC):
    """Authentication contract (OIDC/SAML/API-key in production)."""

    @abc.abstractmethod
    def authenticate(self, token: str) -> Optional[User]: ...


class NullAuthProvider(AuthProvider):
    """Open/no-auth default for local/dev use. Replace in production."""

    def authenticate(self, token: str) -> Optional[User]:
        return User(id="local", email="local@aeroforge.dev", roles=["engineer", "admin"])


class InMemoryTenantStore:
    """Minimal multi-tenant project store (in-memory dev stub)."""

    def __init__(self) -> None:
        self._projects: Dict[str, Project] = {}

    def create_project(self, project: Project) -> Project:
        self._projects[project.id] = project
        return project

    def list_projects(self, tenant_id: str) -> List[Project]:
        return [p for p in self._projects.values() if p.tenant_id == tenant_id]
