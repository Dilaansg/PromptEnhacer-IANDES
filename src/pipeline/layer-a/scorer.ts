import type { PromptTypeDefinition, ScoringResult } from '@shared/types';

function getPositionWeight(startIndex: number, totalTokens: number): number {
  if (totalTokens === 0) return 1.0;
  if (startIndex < 3) return 1.3;
  if (startIndex === totalTokens - 1) return 0.8;
  return 1.0;
}

/**
 * TypeScorer — scores each prompt type based on trigger matches.
 *
 * Scoring rules:
 * - strong trigger  → +1.0 × positionWeight
 * - weak trigger    → +0.4 × positionWeight
 * - negative trigger → –0.6 (fixed penalty, no position weight)
 *
 * positionWeight:
 * - starts in first 3 tokens → ×1.3
 * - starts at last token      → ×0.8
 * - otherwise                 → ×1.0
 *
 * Final scores are min-max normalised to [0, 1].
 */
export class TypeScorer {
  scoreTypes(
    normalizedInput: string,
    registry: readonly PromptTypeDefinition[],
  ): ScoringResult {
    const tokens = normalizedInput.split(/\s+/).filter(Boolean);
    const totalTokens = tokens.length;

    const rawScores = new Map<string, number>();

    for (const type of registry) {
      let score = 0;

      // strong triggers
      for (const trigger of type.triggers.strong) {
        const idx = normalizedInput.indexOf(trigger);
        if (idx !== -1) {
          const startTokenIndex = this._tokenIndexAtChar(tokens, idx);
          const weight = getPositionWeight(startTokenIndex, totalTokens);
          score += 1.0 * weight;
        }
      }

      // weak triggers
      for (const trigger of type.triggers.weak) {
        const idx = normalizedInput.indexOf(trigger);
        if (idx !== -1) {
          const startTokenIndex = this._tokenIndexAtChar(tokens, idx);
          const weight = getPositionWeight(startTokenIndex, totalTokens);
          score += 0.4 * weight;
        }
      }

      // negative triggers
      for (const trigger of type.triggers.negative) {
        if (normalizedInput.includes(trigger)) {
          score -= 0.6;
        }
      }

      rawScores.set(type.id, score);
    }

    const normalized = this._normalizeScores(rawScores);
    const sorted = Array.from(normalized.entries()).sort((a, b) => b[1] - a[1]);

    const topEntry = sorted[0] ?? [null, 0];
    const secondEntry = sorted[1] ?? [null, 0];

    const topTypeId = topEntry[0];
    const topScore = topEntry[1];
    const secondScore = secondEntry[1];

    const rawMax = Math.max(...Array.from(rawScores.values()));

    const topType =
      rawMax > 0 && topTypeId !== null
        ? registry.find((t) => t.id === topTypeId) ?? null
        : null;

    const candidates = registry.filter((t) => (rawScores.get(t.id) ?? 0) > 0);

    // Ambiguity: high when top and second are close.
    let ambiguityScore = 0;
    if (topScore > 0) {
      ambiguityScore = Math.min(1, Math.max(0, 1 - (topScore - secondScore)));
    }

    const scoresRecord: Record<string, number> = {};
    for (const [id, score] of normalized) {
      scoresRecord[id] = score;
    }

    return {
      topType,
      candidates,
      scores: scoresRecord,
      ambiguityScore,
    };
  }

  /** Map a character offset back to the token index it falls inside. */
  private _tokenIndexAtChar(tokens: string[], charIndex: number): number {
    let acc = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const start = acc;
      const end = acc + token.length;
      if (charIndex >= start && charIndex < end) {
        return i;
      }
      acc += token.length + 1; // +1 for the space between tokens
    }
    return tokens.length - 1;
  }

  /** Min-max normalise scores to the [0, 1] interval.
   *  Negative raw scores are clipped to 0 so they don't inflate other types.
   */
  private _normalizeScores(raw: Map<string, number>): Map<string, number> {
    const clipped = new Map<string, number>();
    for (const [id, val] of raw) {
      clipped.set(id, Math.max(0, val));
    }

    const values = Array.from(clipped.values());
    const max = Math.max(...values);
    const min = Math.min(...values);

    const out = new Map<string, number>();

    if (max === min) {
      for (const [id, val] of clipped) {
        out.set(id, val > 0 ? 1.0 : 0.0);
      }
      return out;
    }

    for (const [id, val] of clipped) {
      const norm = (val - min) / (max - min);
      out.set(id, Math.max(0, norm));
    }
    return out;
  }
}
