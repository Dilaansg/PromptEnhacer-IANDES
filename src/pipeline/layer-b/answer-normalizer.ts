/**
 * Answer Normalizer — maps raw user-selected answers to canonical values.
 *
 * Phase 1.2 of the Mitigation Plan.
 * Resolves B-05: "Introductorio" → "basico", "Técnico moderado" → "intermedio",
 * etc. so downstream templates always receive predictable canonical strings.
 */

/**
 * Normalize a raw user answer to its canonical form.
 *
 * Priority:
 *  1. `normalizeMap[rawAnswer]` — schema's own mapping
 *  2. `rawAnswer.toLowerCase().replace(/\s+/g, '_')` — fallback
 */
export function normalizeAnswer(
  rawAnswer: string,
  normalizeMap?: Record<string, string>,
): string {
  const trimmed = rawAnswer.trim();

  if (normalizeMap) {
    const mapped = normalizeMap[trimmed];
    if (mapped) return mapped;
  }

  return trimmed.toLowerCase().replace(/\s+/g, '_');
}
