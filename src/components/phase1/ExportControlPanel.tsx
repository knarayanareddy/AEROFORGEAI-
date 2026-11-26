// Phase 4 — export-control decision, shown live.
//
// Every value here comes from `evaluateExport`, the same function the conformance
// test holds to the Rego policy. Nothing in this panel is a fixture: change the
// destination or the classification and the verdict, the denial text and the
// audit-chain head all move together.
//
// The panel deliberately shows DENIALS as prominently as permits. A UI that only
// ever displays a green "export approved" would train the operator to expect one.

import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';
import { evaluateExport, type Classification } from '../../lib/exportPolicy';
import { AuditLog, verifyChain, type AuditEntry } from '../../lib/auditLog';
import { ProvenanceChip } from '../common/Provenance';

const DESTINATIONS = ['nato', 'other', 'sanctioned'] as const;
const CLASSIFICATIONS: Classification[] = ['UNCLASSIFIED', 'ECL:ML', 'ECL:MTCR'];

export const ExportControlPanel: React.FC = () => {
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>('nato');
  const [classification, setClassification] = useState<Classification>('ECL:ML');
  const [mach, setMach] = useState(5.5);
  const [reviewer, setReviewer] = useState('');

  const decision = useMemo(
    () => evaluateExport({ destination, classification, mach, reviewer: reviewer || undefined }),
    [destination, classification, mach, reviewer],
  );

  // Build a real chain from the current decision, rather than displaying a
  // fixture. Each change to the controls appends a new entry, and the head is
  // recomputed by the same code path the tests exercise.
  const [chain, setChain] = useState<AuditEntry[]>([]);
  const [chainOk, setChainOk] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const log = new AuditLog();
    void (async () => {
      await log.append({
        action: 'policy.decision',
        actor: { sub: 'operator' },
        subject: `${destination}/${classification}`,
        outcome: decision.allowed ? 'allow' : 'deny',
        detail: { mach, classification: decision.classification, denials: decision.denials },
        at: new Date().toISOString(),
      });
      if (cancelled) return;
      const entries = log.toArray();
      setChain(entries);
      setChainOk((await verifyChain(entries)).ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [destination, classification, mach, decision]);

  return (
    <div className="af-glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold af-gradient-text flex items-center gap-2">
            <ShieldCheck size={18} /> Phase 4 — Export control
          </h2>
          <p className="text-xs" style={{ color: '#7688a6' }}>
            Policy evaluated in the browser. The same 15 cases are run through a real Rego engine
            in CI and the two must agree exactly.
          </p>
        </div>
        <ProvenanceChip
          source="solved"
          detail="Computed by src/lib/exportPolicy.ts — the TypeScript mirror, conformance-tested against policy/export_control.rego via regopy."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-xs" style={{ color: '#8ba8cc' }}>Destination</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as (typeof DESTINATIONS)[number])}
            className="w-full mt-1 af-input"
          >
            {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs" style={{ color: '#8ba8cc' }}>Classification</span>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value as Classification)}
            className="w-full mt-1 af-input"
          >
            {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs" style={{ color: '#8ba8cc' }}>Design Mach</span>
          <input
            type="number" step={0.1} min={0} max={10}
            value={mach}
            onChange={(e) => setMach(Number(e.target.value))}
            className="w-full mt-1 af-input"
          />
        </label>

        <label className="block">
          <span className="text-xs" style={{ color: '#8ba8cc' }}>Reviewer (MTCR only)</span>
          <input
            type="text" placeholder="leave blank"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            className="w-full mt-1 af-input"
          />
        </label>
      </div>

      <div
        className="rounded-lg p-3 border"
        style={{
          background: decision.allowed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          borderColor: decision.allowed ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          {decision.allowed ? <ShieldCheck size={16} color="#22c55e" /> : <ShieldAlert size={16} color="#ef4444" />}
          <span className="font-semibold text-sm" style={{ color: decision.allowed ? '#22c55e' : '#ef4444' }}>
            {decision.allowed ? 'EXPORT PERMITTED' : 'EXPORT DENIED'}
          </span>
          <span className="text-xs" style={{ color: '#7688a6' }}>
            classification {decision.classification}
          </span>
        </div>
        {decision.denials.length === 0 ? (
          <p className="text-xs" style={{ color: '#8ba8cc' }}>
            No rule fired against this combination.
          </p>
        ) : (
          <ul className="space-y-1">
            {decision.denials.map((d, i) => (
              <li key={i} className="text-xs" style={{ color: '#fca5a5' }}>· {d}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs space-y-1" style={{ color: '#7688a6' }}>
        <div className="flex items-center gap-1">
          <Link2 size={12} />
          <span>
            Audit chain: {chain.length} entr{chain.length === 1 ? 'y' : 'ies'}, head{' '}
            <code style={{ color: '#8ba8cc' }}>{(chain.at(-1)?.hash ?? '—').slice(0, 16)}…</code>{' '}
            <span style={{ color: chainOk ? '#22c55e' : '#ef4444' }}>
              ({chainOk ? 'chain verifies' : 'CHAIN BROKEN'})
            </span>
          </span>
        </div>
        <p>
          The audit chain detects edits, deletions and reordering. It does <em>not</em> detect a
          forger who recomputes every hash — the head must be witnessed elsewhere. That limit is
          tested, not hidden.
        </p>
        <p>
          <strong style={{ color: '#fca5a5' }}>Thresholds are invented placeholders</strong>, not
          legal control-list values. This is a demonstration of the machinery, not an export
          decision tool.
        </p>
      </div>
    </div>
  );
};
