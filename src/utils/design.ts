// Pure, unit-testable helpers shared by the panels.

import type { DesignLibraryItem, ValidationStatus } from '../types/aeroforge';

/** Filter the geometry library by free-text search and tag filter. */
export function filterDesignLibrary(
  items: DesignLibraryItem[],
  search: string,
  filter: string,
): DesignLibraryItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((d) => {
    const matchSearch =
      q === '' ||
      d.name.toLowerCase().includes(q) ||
      d.tags.some((t) => t.includes(q));
    const matchFilter = filter === 'all' || d.tags.includes(filter);
    return matchSearch && matchFilter;
  });
}

/**
 * Overall validation score in [0, 100]: pass = 1, warn = 0.5, fail/pending = 0.
 */
export function computeValidationScore(
  results: { status: ValidationStatus }[],
): number {
  if (results.length === 0) return 0;
  const pass = results.filter((r) => r.status === 'pass').length;
  const warn = results.filter((r) => r.status === 'warn').length;
  return Math.round(((pass + warn * 0.5) / results.length) * 100);
}

/** Human-readable duration, e.g. 1840 -> "31m 0s", 2.1 -> "2.1s". */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return '—';
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  }
  return `${seconds}s`;
}
