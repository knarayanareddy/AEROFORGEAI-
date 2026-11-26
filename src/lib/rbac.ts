// Role-based access control.
//
// Kept intentionally small and total: a role maps to a fixed set of permissions,
// and a permission check is a set membership test. Anything more elaborate
// (attribute rules, delegation, time-boxing) belongs in the policy engine, not
// in a table that people will inevitably hard-code around.

export type Role = 'viewer' | 'engineer' | 'reviewer' | 'export_officer' | 'admin';

export type Permission =
  | 'case:read'
  | 'case:create'
  | 'case:run'
  | 'bundle:read'
  | 'bundle:export'
  | 'bundle:sign'
  | 'policy:read'
  | 'policy:write'
  | 'audit:read'
  | 'user:manage';

/**
 * Role → permissions.
 *
 * Deliberate separations:
 *   - `engineer` can run cases but cannot export bundles. Running a solve is an
 *     internal act; shipping the geometry out is not.
 *   - `export_officer` can export but cannot run new cases. Whoever is
 *     accountable for a release should not also be able to produce the artefact
 *     that justifies it without a second pair of eyes.
 *   - `admin` holds no `bundle:export` by default. Convenience roles that
 *     accumulate every permission are how separation of duties dies.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set<Permission>(['case:read', 'bundle:read', 'policy:read']),
  engineer: new Set<Permission>(['case:read', 'case:create', 'case:run', 'bundle:read', 'policy:read']),
  reviewer: new Set<Permission>(['case:read', 'bundle:read', 'policy:read', 'audit:read']),
  export_officer: new Set<Permission>([
    'case:read',
    'bundle:read',
    'bundle:export',
    'bundle:sign',
    'policy:read',
    'audit:read',
  ]),
  admin: new Set<Permission>([
    'case:read',
    'case:create',
    'case:run',
    'bundle:read',
    'policy:read',
    'policy:write',
    'audit:read',
    'user:manage',
  ]),
};

export interface Principal {
  sub: string;
  roles: Role[];
}

export function permissionsOf(principal: Principal): Set<Permission> {
  const out = new Set<Permission>();
  for (const r of principal.roles) {
    const perms = ROLE_PERMISSIONS[r];
    if (!perms) continue; // unknown role contributes nothing, never everything
    for (const p of perms) out.add(p);
  }
  return out;
}

export function hasPermission(principal: Principal, permission: Permission): boolean {
  return permissionsOf(principal).has(permission);
}

/**
 * Separation of duties for signing.
 *
 * A bundle may not be signed by the same principal who exported it, when the
 * deployment is configured for two-person control. This is a policy on the pair
 * of actions, so it cannot live in the permission table — it needs the history.
 */
export function maySignExport(
  signer: Principal,
  exporterSub: string,
  twoPersonRequired: boolean,
): { allowed: boolean; reason: string } {
  if (!hasPermission(signer, 'bundle:sign')) {
    return { allowed: false, reason: `${signer.sub} lacks bundle:sign` };
  }
  if (twoPersonRequired && signer.sub === exporterSub) {
    return {
      allowed: false,
      reason:
        'two-person control is enabled and the signer is the exporter; ' +
        'the same principal may not both produce and attest a release',
    };
  }
  return { allowed: true, reason: 'signing permitted' };
}
