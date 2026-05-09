/**
 * Quality Scorer — evaluates SuperPrompt richness and completeness.
 *
 * Phase 4.3 of the Mitigation Plan.
 *
 * Produces a score from 0.0 to 1.0 based on:
 *  1. Presence of role/persona assignment
 *  2. Clear instruction/objective
 *  3. Output structure/format guidance
 *  4. Constraints (level, tone, length)
 *  5. Enrichment ratio (how much the prompt grew vs. original)
 *  6. Absence of unresolved template variables
 *
 * This enables the UI to display a quality indicator and helps the pipeline
 * self‑diagnose when the prompt generation falls short.
 */

import { EmbeddingEngine } from '../embedding-engine';

export interface QualityScore {
  /** Overall score from 0.0 to 1.0. */
  readonly total: number;
  /** Breakdown of contributing factors. */
  readonly factors: {
    readonly hasPersona: boolean;
    readonly hasInstruction: boolean;
    readonly hasStructureGuide: boolean;
    readonly hasConstraints: boolean;
    readonly enrichmentRatio: number;
    readonly noUnresolvedVars: boolean;
  };
  /** Human-readable quality label. */
  readonly label: 'excelente' | 'bueno' | 'aceptable' | 'deficiente';
}

/**
 * Score the quality of a generated SuperPrompt.
 *
 * @param superPrompt  The enriched prompt produced by Layer C.
 * @param originalPrompt  The user's original (short) prompt.
 * @returns A detailed quality assessment.
 */
export function scorePromptQuality(
  superPrompt: string,
  originalPrompt: string,
): QualityScore {
  const factors = {
    hasPersona: /actúa como|eres un|rol\s+de/i.test(superPrompt),
    hasInstruction:
      /tu tarea|objetivo|instrucción|instruccion|define|explica|escribe|analiza|resuelve|genera|crea/i.test(
        superPrompt,
      ),
    hasStructureGuide:
      /estructura|organiza|formato|tabla|lista|pasos|párrafos|parrafos|guía|guia/i.test(
        superPrompt,
      ),
    hasConstraints:
      /nivel|restricción|restriccion|evita|no incluyas|tono|extensión|extension|mantén|manten/i.test(
        superPrompt,
      ),
    enrichmentRatio:
      superPrompt.length / Math.max(originalPrompt.length, 1),
    noUnresolvedVars: !/\{\{/.test(superPrompt),
  };

  // Weighted scoring
  let score = 0;

  // 1. Persona — essential for role-based prompting (+0.20)
  if (factors.hasPersona) score += 0.20;

  // 2. Instruction — the core task (+0.25)
  if (factors.hasInstruction) score += 0.25;

  // 3. Structure guide — ensures well-formatted output (+0.10)
  if (factors.hasStructureGuide) score += 0.10;

  // 4. Constraints — explicit user preferences (+0.10)
  if (factors.hasConstraints) score += 0.10;

  // 5. Enrichment efficiency — optimal ratio ~2-5x; penalize bloat (+0.20 max)
  //    ≤ 2x  → +0.20 (concise but enriched)
  //    2-5x  → +0.15 (good balance)
  //    5-10x → +0.10 (getting verbose)
  //    >10x  → +0.00 (excessive, unsustainable)
  const ratio = factors.enrichmentRatio;
  if (ratio <= 2) score += 0.20;
  else if (ratio <= 5) score += 0.15;
  else if (ratio <= 10) score += 0.10;
  // > 10x → 0 points for enrichment (wasteful)

  // 6. No unresolved variables — template rendered completely (+0.15)
  if (factors.noUnresolvedVars) score += 0.15;

  const total = Math.min(1.0, Math.round(score * 100) / 100);

  // Label assignment
  let label: QualityScore['label'];
  if (total >= 0.80) label = 'excelente';
  else if (total >= 0.60) label = 'bueno';
  else if (total >= 0.40) label = 'aceptable';
  else label = 'deficiente';

  return { total, factors, label };
}

/**
 * Quick check: does this prompt meet the minimum quality bar?
 */
export function meetsMinimumQuality(score: QualityScore): boolean {
  return score.total >= 0.40;
}

// ────────────────────────────────────────────────────────────────────────────
// Semantic quality scoring (Mejora #9)
// ────────────────────────────────────────────────────────────────────────────

const IDEAL_PROMPT_ANCHORS: string[] = [
  'Actúa como experto en el tema. Explica de forma clara y estructurada, incluyendo ejemplos concretos. Adapta el lenguaje al nivel solicitado.',
  'Eres un especialista en la materia. Proporciona una respuesta detallada con fundamentos teóricos y aplicaciones prácticas. Estructura tu respuesta en secciones lógicas.',
  'Como profesional del área, analiza el tema con rigor. Incluye definiciones precisas, contexto histórico si aplica, y recomendaciones accionables.',
  'Actúa como tutor especializado. Guía al usuario paso a paso, verificando comprensión en cada etapa. Usa ejemplos relevantes al contexto.',
  'Eres un asistente técnico experto. Proporciona soluciones precisas, explica el razonamiento detrás de cada decisión, y anticipa posibles problemas.',
];

let cachedIdealCentroid: Float32Array | null = null;

export async function scorePromptQualitySemantic(
  superPrompt: string,
  engine: EmbeddingEngine,
): Promise<number | null> {
  if (!engine.isReady()) return null;

  try {
    if (!cachedIdealCentroid) {
      cachedIdealCentroid = await engine.getCentroid(IDEAL_PROMPT_ANCHORS, 'passage');
    }

    if (!cachedIdealCentroid) return null;

    const promptVec = await engine.embed(superPrompt, 'query');
    const similarity = engine.cosineSimilarity(promptVec, cachedIdealCentroid);

    // Normalize: typical cosine similarity is in [0.25, 0.8]
    // Map to [0, 1]
    return Math.min(1.0, Math.max(0, (similarity - 0.25) / 0.55));
  } catch {
    return null;
  }
}
