import { PromptAttributes, NivelAttribute } from '@shared/types';
import ANCHORS from '@/data/anchor-embeddings.json';
import { EmbeddingEngine } from '../embedding-engine';

type MutableAttributes = {
  nivel?: NivelAttribute;
  formato?: string;
  longitud?: string;
  tono?: string;
  audiencia?: string;
};

const ATTRIBUTE_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = (ANCHORS as any).attributes ?? {};
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec as number[]);
  }
  return out;
})();

const AUDIENCE_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = (ANCHORS as any).audience ?? {};
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec as number[]);
  }
  return out;
})();

export class AttributeDetector {
  /**
   * Phase 3.2: Now accepts optional typeId and intentId for implicit inference.
   * When the user doesn't explicitly state level/format/tone, we can infer
   * reasonable defaults based on what type of prompt they're making.
   */
  async detectAttributes(
    text: string,
    typeId?: string,
    intentId?: string,
  ): Promise<PromptAttributes> {
    // 1. First attempt semantic detection (embeddings)
    const semanticAttrs = await this.detectAttributesSemantic(text);

    // 2. Then regex detection for what wasn't captured semantically
    const regexAttrs = this.detectAttributesRegex(text);

    // 3. Implicit inference by type/intent
    const implicitAttrs = this.inferFromType(typeId, intentId);

    // Merge: semantic > regex > inferred
    return {
      nivel: semanticAttrs.nivel ?? regexAttrs.nivel ?? implicitAttrs.nivel,
      formato: semanticAttrs.formato ?? regexAttrs.formato ?? implicitAttrs.formato,
      tono: semanticAttrs.tono ?? regexAttrs.tono ?? implicitAttrs.tono,
      longitud: regexAttrs.longitud ?? implicitAttrs.longitud,
    };
  }

  /**
   * Semantic attribute detection using pre-computed embeddings.
   * Compares the prompt embedding against ATTRIBUTE_ANCHORS for nivel, tono, and formato.
   *
   * Requires BOTH:
   *  - Absolute score > 0.56 (genuine alignment, not noise)
   *  - Gap between top-2 scores > 0.06 (clear winner, not ambiguous)
   *
   * Without the gap requirement, generic prompts like "explicame la historia"
   * would falsely trigger nivel='basico' simply because all 3 anchors score
   * similarly in a noisy region.
   */
  private async detectAttributesSemantic(text: string): Promise<MutableAttributes> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) return {};

    try {
      const inputVec = await engine.embed(text, 'query');
      const result: MutableAttributes = {};

      const SEMANTIC_MIN_SCORE = 0.62;
      const SEMANTIC_MIN_GAP = 0.10;

      const nivelScores = {
        basico: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:basico']),
        intermedio: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:intermedio']),
        avanzado: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:avanzado']),
      };
      const nivelEntries = Object.entries(nivelScores).sort(([, a], [, b]) => b - a);
      if (nivelEntries[0][1] > SEMANTIC_MIN_SCORE && (nivelEntries[0][1] - nivelEntries[1][1]) > SEMANTIC_MIN_GAP) {
        result.nivel = nivelEntries[0][0] as PromptAttributes['nivel'];
        console.log(`[AttributeDetector] Semantic nivel=${result.nivel} (${nivelEntries[0][1].toFixed(3)}, gap=${(nivelEntries[0][1] - nivelEntries[1][1]).toFixed(3)})`);
      }

      const tonoScores = {
        formal: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:formal']),
        informal: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:informal']),
        entusiasta: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:entusiasta']),
        neutral: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:neutral']),
        creativo: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:creativo']),
        tecnico: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:tecnico']),
      };

      const formatoScores = {
        lista: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:lista']),
        parrafos: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:parrafos']),
        tabla: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:tabla']),
        codigo: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:codigo']),
        paso_a_paso: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:paso_a_paso']),
        resumen: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:resumen']),
      };

      // Length detection (Mejora #6 — nuevos anchors)
      const longitudScores = {
        corto: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['longitud:corto']),
        largo: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['longitud:largo']),
      };
      const longitudEntries = Object.entries(longitudScores).sort(([, a], [, b]) => b - a);
      if (longitudEntries[0][1] > SEMANTIC_MIN_SCORE && (longitudEntries[0][1] - longitudEntries[1][1]) > SEMANTIC_MIN_GAP) {
        result.longitud = longitudEntries[0][0];
        console.log(`[AttributeDetector] Semantic longitud=${result.longitud} (${longitudEntries[0][1].toFixed(3)}, gap=${(longitudEntries[0][1] - longitudEntries[1][1]).toFixed(3)})`);
      }
      const tonoEntries = Object.entries(tonoScores).sort(([, a], [, b]) => b - a);
      if (tonoEntries[0][1] > SEMANTIC_MIN_SCORE && (tonoEntries[0][1] - tonoEntries[1][1]) > SEMANTIC_MIN_GAP) {
        result.tono = tonoEntries[0][0];
        console.log(`[AttributeDetector] Semantic tono=${result.tono} (${tonoEntries[0][1].toFixed(3)}, gap=${(tonoEntries[0][1] - tonoEntries[1][1]).toFixed(3)})`);
      }

      const formatoEntries = Object.entries(formatoScores).sort(([, a], [, b]) => b - a);
      if (formatoEntries[0][1] > SEMANTIC_MIN_SCORE && (formatoEntries[0][1] - formatoEntries[1][1]) > SEMANTIC_MIN_GAP) {
        result.formato = formatoEntries[0][0];
        console.log(`[AttributeDetector] Semantic formato=${result.formato} (${formatoEntries[0][1].toFixed(3)}, gap=${(formatoEntries[0][1] - formatoEntries[1][1]).toFixed(3)})`);
      }

      // Audience detection (Mejora #6)
      if (Object.keys(AUDIENCE_ANCHORS_F32).length > 0) {
        const audienciaScores: Record<string, number> = {};
        for (const [id, anchorVec] of Object.entries(AUDIENCE_ANCHORS_F32)) {
          audienciaScores[id] = engine.cosineSimilarity(inputVec, anchorVec);
        }
        const audienciaEntries = Object.entries(audienciaScores).sort(([, a], [, b]) => b - a);
        if (audienciaEntries[0][1] > SEMANTIC_MIN_SCORE && (audienciaEntries[0][1] - audienciaEntries[1][1]) > SEMANTIC_MIN_GAP) {
          result.audiencia = audienciaEntries[0][0];
        }
      }

      return result;
    } catch {
      return {};
    }
  }

  /**
   * Regex-based attribute detection (existing logic).
   */
  private detectAttributesRegex(text: string): MutableAttributes {
    const lower = text.toLowerCase();

    let nivel: string | undefined;
    let formato: string | undefined;
    let longitud: string | undefined;
    let tono: string | undefined;

    // Level detection
    if (/básico|básica|simple|principiante|fácil|niños|introducción|introduccion/i.test(lower)) {
      nivel = 'basico';
    } else if (/avanzado|avanzada|experto|complejo|profundo|detallado/i.test(lower)) {
      nivel = 'avanzado';
    } else if (/intermedio/i.test(lower)) {
      nivel = 'intermedio';
    }

    // Format detection
    if (/json/i.test(lower)) {
      formato = 'json';
    } else if (/markdown|md/i.test(lower)) {
      formato = 'markdown';
    } else if (/tabla|cuadro/i.test(lower)) {
      formato = 'tabla';
    } else if (/lista|puntos\s+clave|viñetas/i.test(lower)) {
      formato = 'lista';
    } else if (/paso\s+a\s+paso|pasos/i.test(lower)) {
      formato = 'paso_a_paso';
    } else if (/código|bloque\s+de\s+código|code/i.test(lower)) {
      formato = 'codigo';
    } else if (/resumen|breve|conciso|sintetiza/i.test(lower)) {
      formato = 'resumen';
    }

    // Length detection
    if (/corto|breve|resumido|conciso|rápido|rapido/i.test(lower)) {
      longitud = 'corto';
    } else if (/largo|detallado|extenso|exhaustivo|profundo/i.test(lower)) {
      longitud = 'largo';
    }

    // Tone detection
    if (/formal|académico|academico|serio|profesional|objetivo/i.test(lower)) {
      tono = 'formal';
    } else if (/informal|casual|divertido|gracioso|coloquial/i.test(lower)) {
      tono = 'informal';
    } else if (/creativo|inspirador|motivador|poético|poetico/i.test(lower)) {
      tono = 'creativo';
    } else if (/técnico|tecnico|preciso/i.test(lower)) {
      tono = 'tecnico';
    }

    return { nivel: nivel as NivelAttribute | undefined, formato, longitud, tono };
  }

  /**
   * Implicit inference based on classified type/intent.
   * Only sets defaults that are structural necessities (code format for code prompts,
   * etc.), never opinionated preferences like nivel or tono.
   */
  private inferFromType(
    typeId?: string,
    _intentId?: string,
  ): MutableAttributes {
    const result: MutableAttributes = {};

    if (!typeId) return result;

    // Code prompts always benefit from code-format output
    if (typeId === 'codigo') {
      result.formato = 'codigo';
    }

    // For accion (tutorials/plans), default format is paso_a_paso
    if (typeId === 'accion') {
      result.formato = 'paso_a_paso';
    }

    // For razonamiento, default format is logical structure
    if (typeId === 'razonamiento') {
      result.formato = 'paso_a_paso';
    }

    // For transformacion, default length is short
    if (typeId === 'transformacion') {
      result.longitud = 'corto';
    }

    return result;
  }
}
