// RBAC tests.
//
// The interesting assertions are the NEGATIVE ones: engineers cannot export,
// admins cannot export by default, and an unknown role grants nothing.

import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, hasPermission, maySignExport, permissionsOf, type Role } from './rbac';

const p = (roles: Role[]) => ({ sub: 'u1', roles });

describe('role grants', () => {
  it('viewers can read but not run or export', () => {
    expect(hasPermission(p(['viewer']), 'case:read')).toBe(true);
    expect(hasPermission(p(['viewer']), 'case:run')).toBe(false);
    expect(hasPermission(p(['viewer']), 'bundle:export')).toBe(false);
  });

  it('engineers can run but NOT export', () => {
    // Running a solve is an internal act; shipping geometry out is not.
    expect(hasPermission(p(['engineer']), 'case:run')).toBe(true);
    expect(hasPermission(p(['engineer']), 'bundle:export')).toBe(false);
  });

  it('export officers can export but not run new cases', () => {
    expect(hasPermission(p(['export_officer']), 'bundle:export')).toBe(true);
    expect(hasPermission(p(['export_officer']), 'case:run')).toBe(false);
  });

  it('admins do not get bundle:export by convenience', () => {
    // Roles that accumulate every permission are how separation of duties dies.
    expect(hasPermission(p(['admin']), 'bundle:export')).toBe(false);
    expect(hasPermission(p(['admin']), 'user:manage')).toBe(true);
  });

  it('an unknown role grants nothing', () => {
    expect(permissionsOf(p(['nonsense' as Role])).size).toBe(0);
    expect(hasPermission(p(['nonsense' as Role]), 'case:read')).toBe(false);
  });

  it('roles union rather than intersect', () => {
    const both = p(['viewer', 'export_officer']);
    expect(hasPermission(both, 'bundle:export')).toBe(true);
    expect(hasPermission(both, 'case:read')).toBe(true);
  });

  it('every role in the table is reachable and non-empty', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      expect(ROLE_PERMISSIONS[role].size, role).toBeGreaterThan(0);
    }
  });
});

describe('two-person control', () => {
  const officer = { sub: 'officer-1', roles: ['export_officer' as Role] };

  it('allows signing your own export when two-person control is off', () => {
    expect(maySignExport(officer, 'officer-1', false).allowed).toBe(true);
  });

  it('refuses signing your own export when it is on', () => {
    const r = maySignExport(officer, 'officer-1', true);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/two-person/);
  });

  it('allows signing someone else\'s export', () => {
    expect(maySignExport(officer, 'officer-2', true).allowed).toBe(true);
  });

  it('refuses a principal without bundle:sign entirely', () => {
    const engineer = { sub: 'eng-1', roles: ['engineer' as Role] };
    const r = maySignExport(engineer, 'officer-2', false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/lacks bundle:sign/);
  });
});
