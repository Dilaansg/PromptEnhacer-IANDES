/**
 * SemanticClassifier — clasificación por embeddings pre-computados.
 *
 * Usa los vectores de `anchor-embeddings.json` (keys `types` e `intents`)
 * para clasificar tipo e intent semánticamente sin re-computar embeddings
 * de los anchors en runtime (fix bug MED-07).
 *
 * Si EmbeddingEngine no está listo devuelve null → señal para usar TypeScorer.
 */
import { EmbeddingEngine } from '../embedding-engine';
import ANCHORS from '@/data/anchor-embeddings.json';

export interface SemanticTypeResult {
  typeId: string;
  confidence: number;
}

export interface SemanticIntentResult {
  intentId: string;
  confidence: number;
}

// Pre-convert anchor arrays to Float32Array once at module load
// anchor-embeddings.json stores arrays of numbers; EmbeddingEngine.classify()
// requires Float32Array so we normalise here (they're already unit vectors).
const TYPE_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = ((ANCHORS as any).types ?? {}) as Record<string, number[]>;
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec);
  }
  return out;
})();

const INTENT_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = ((ANCHORS as any).intents ?? {}) as Record<string, number[]>;
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec);
  }
  return out;
})();

export class SemanticClassifier {
  private readonly TYPE_THRESHOLD = 0.45;

  isReady(): boolean {
    return EmbeddingEngine.getInstance().isReady();
  }

  /**
   * Clasifica el tipo de prompt por similitud coseno contra TYPE_ANCHORS.
   * Retorna null si el EmbeddingEngine no está listo.
   */
  async classifyType(text: string): Promise<SemanticTypeResult | null> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) return null;

    try {
      const result = await engine.classify(text, TYPE_ANCHORS_F32);
      return { typeId: result.id, confidence: result.confidence };
    } catch {
      return null;
    }
  }

  /**
   * Clasifica el intent filtrado por typeId (ej. "informacion.*").
   * Retorna null si no hay vectores para ese typeId o si el engine no está listo.
   */
  async classifyIntent(
    text: string,
    typeId: string,
  ): Promise<SemanticIntentResult | null> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) return null;

    // Filter intent anchors to only those matching `typeId.*`
    const prefix = `${typeId}.`;
    const filteredAnchors: Record<string, Float32Array> = {};
    for (const [id, vec] of Object.entries(INTENT_ANCHORS_F32)) {
      if (id.startsWith(prefix)) {
        filteredAnchors[id] = vec;
      }
    }

    if (Object.keys(filteredAnchors).length === 0) return null;

    try {
      const result = await engine.classify(text, filteredAnchors);
      // Strip the "typeId." prefix to get the bare intent id
      const bareIntentId = result.id.replace(prefix, '');
      return { intentId: bareIntentId, confidence: result.confidence };
    } catch {
      return null;
    }
  }

  get typeThreshold(): number {
    return this.TYPE_THRESHOLD;
  }

  /**
   * Verify that the classified type is coherent with the prompt embedding.
   * Compares against ALL types and returns whether the classified type is the
   * best or within a close margin.
   */
  async verifyClassification(
    text: string,
    classifiedTypeId: string,
  ): Promise<{ isCoherent: boolean; actualBestType: string; confidence: number }> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) {
      return { isCoherent: true, actualBestType: classifiedTypeId, confidence: 1 };
    }

    try {
      const inputVec = await engine.embed(text, 'query');

      let bestType = '';
      let bestScore = -1;
      const allScores: Record<string, number> = {};

      for (const [typeId, anchorVec] of Object.entries(TYPE_ANCHORS_F32)) {
        const score = engine.cosineSimilarity(inputVec, anchorVec);
        allScores[typeId] = score;
        if (score > bestScore) {
          bestScore = score;
          bestType = typeId;
        }
      }

      const classifiedScore = allScores[classifiedTypeId] ?? 0;
      const isCoherent = classifiedScore >= bestScore - 0.08;

      return {
        isCoherent,
        actualBestType: bestType,
        confidence: classifiedScore,
      };
    } catch {
      return { isCoherent: true, actualBestType: classifiedTypeId, confidence: 1 };
    }
  }

  /**
   * Get the top 2 type scores for multi-mode detection (Mejora #4).
   */
  async getTop2Scores(
    text: string,
  ): Promise<Array<{ typeId: string; confidence: number }>> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) return [];

    try {
      const inputVec = await engine.embed(text, 'query');
      const scores: Array<{ typeId: string; confidence: number }> = [];

      for (const [typeId, anchorVec] of Object.entries(TYPE_ANCHORS_F32)) {
        scores.push({
          typeId,
          confidence: engine.cosineSimilarity(inputVec, anchorVec),
        });
      }

      return scores.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
    } catch {
      return [];
    }
  }
}
