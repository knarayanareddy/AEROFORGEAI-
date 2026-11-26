// The export gate: auth → RBAC → policy → audit → signature.
//
// Each layer is tested separately. This module exists because the interesting
// failures are at the JOINTS: a policy that allows what RBAC would forbid, an
// audit entry written after the artefact already left, a signature over the
// wrong bytes. Ordering is therefore explicit and asserted.

import { AuditLog, type AuditEntry } from './auditLog';
import { evaluateExport, type ExportInput } from './exportPolicy';
import { hasPermission, maySignExport, type Principal } from './rbac';
import { nodeSigner, signDigest, type SignatureBlock, type SignerDeps } from './signature';
import { sha256Hex } from './zip';

export interface ExportRequest {
  principal: Principal;
  /** Digest of the bundle being exported, already computed by the caller. */
  digest: string;
  /**
   * Export-control inputs. `category` is required: the gate must not invent one,
   * because inventing it is exactly the inference the policy refuses to make.
   */
  controls: Pick<ExportInput, 'category' | 'destination' | 'classification' | 'reviewer'>;
  /** Mach number of the design in the bundle, from the actual run. */
  mach: number;
}

export interface ExportOutcome {
  allowed: boolean;
  /** Every reason for refusal, so the caller does not have to reconstruct them. */
  reasons: string[];
  signature?: SignatureBlock;
  audit: AuditEntry[];
}

export interface GateOptions {
  now: string;
  twoPersonRequired: boolean;
  /** Who produced the artefact. For a single-actor flow this is the principal. */
  exporterSub: string;
  signingKeyB64u?: string;
  deps?: SignerDeps;
}

/**
 * Run a request through every gate, in order.
 *
 * The order is the security property, not an implementation detail:
 *   1. permission  — cheapest, and a refusal here must not touch the policy
 *   2. policy      — whether this specific design may leave
 *   3. signing     — two-person control is checked against the exporter
 * Only if all three pass is a signature produced.
 *
 * The audit log records every outcome including denials. A gate that logs only
 * successes hides exactly the events an auditor is looking for.
 */
export async function gatedExport(req: ExportRequest, opts: GateOptions): Promise<ExportOutcome> {
  const log = new AuditLog();
  const actor = { sub: req.principal.sub };
  const reasons: string[] = [];

  const deny = async (action: 'bundle.export.denied', why: string, extra?: Record<string, unknown>) => {
    await log.append({
      action,
      actor,
      subject: req.digest.slice(0, 16),
      outcome: 'deny',
      detail: { reason: why, ...extra },
      at: opts.now,
    });
    reasons.push(why);
    return { allowed: false, reasons, audit: log.toArray() };
  };

  // 1. Permission.
  if (!hasPermission(req.principal, 'bundle:export')) {
    return deny('bundle.export.denied', `principal ${req.principal.sub} lacks bundle:export`, {
      stage: 'rbac',
    });
  }
  await log.append({
    action: 'policy.decision',
    actor,
    subject: req.digest.slice(0, 16),
    outcome: 'allow',
    detail: { stage: 'rbac', permission: 'bundle:export' },
    at: opts.now,
  });

  // 2. Export-control policy.
  const decision = evaluateExport({ ...req.controls, mach: req.mach });
  if (!decision.allowed) {
    return deny('bundle.export.denied', decision.denials.join('; '), {
      stage: 'policy',
      classification: decision.classification,
    });
  }
  await log.append({
    action: 'policy.decision',
    actor,
    subject: req.digest.slice(0, 16),
    outcome: 'allow',
    detail: { stage: 'policy', classification: decision.classification },
    at: opts.now,
  });

  // 3. Signing, including two-person control.
  if (opts.signingKeyB64u === undefined) {
    return deny('bundle.export.denied', 'no signing key configured; an unsigned export is not permitted', {
      stage: 'signing',
    });
  }
  const signing = maySignExport(req.principal, opts.exporterSub, opts.twoPersonRequired);
  if (!signing.allowed) {
    return deny('bundle.export.denied', signing.reason, { stage: 'signing' });
  }

  const signature = await signDigest(
    opts.deps ?? nodeSigner,
    req.digest,
    opts.signingKeyB64u,
    opts.now,
    req.principal.sub,
  );

  await log.append({
    action: 'bundle.exported',
    actor,
    subject: req.digest.slice(0, 16),
    outcome: 'allow',
    detail: {
      classification: decision.classification,
      destination: req.controls.destination,
      publicKey: signature.publicKey,
    },
    at: opts.now,
  });

  return { allowed: true, reasons: [], signature, audit: log.toArray() };
}

/** Convenience: the digest of a bundle's bytes, which is what gets signed. */
export async function digestOf(bytes: Uint8Array): Promise<string> {
  return sha256Hex(bytes);
}
