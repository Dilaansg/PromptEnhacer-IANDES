import { LayerAOutput, QuestionDefinition } from '@shared/types';
import { pipelineLog } from '@shared/log-collector';
import { QUESTION_BANK } from './question-bank';
import {
  type QuestionSchema,
  getMatchingSchemas,
  resolveQuestionText,
  resolveQuestionOptions,
} from './question-schemas';

/**
 * Dimension priority order — determines which questions get selected first
 * when the max count cap is reached.
 *
 * Phase 1.3/1.4: Revised priorities. Intent question is now suppressed when
 * the classification is confident, and type-confirmation only fires in the
 * ambiguous range.  Paste-action and academic flows retain their priority.
 */
const DIMENSION_PRIORITY: readonly string[] = [
  'paste_action',
  'tipo',        // type confirmation (only in ambiguous range)
  'nivel',
  'intencion',   // only when truly unknown
  'proposito',
  'materia',
  'nivel_curso',
  'tipo_texto',
  'formato',
  'tono',
  'longitud',
  'audiencia',
  'contexto',
];

/**
 * Dimensions that genuinely contribute value to the final template.
 * When confidence is high (missing mode), only these dimensions are asked —
 * cosmetic or low‑impact dimensions are skipped.
 */
const HIGH_VALUE_DIMENSIONS = new Set<string>([
  'paste_action',
  'nivel',
  'intencion',
  'proposito',
  'materia',
  'nivel_curso',
  'tipo_texto',
  'formato',
  'tono',
  'contexto',
]);

export class QuestionSelector {
  /**
   * Main entry point — selects questions with the new schema‑driven logic.
   */
  selectQuestions(layerAOutput: LayerAOutput): QuestionDefinition[] {
    const confidence = layerAOutput.primary.confidence;
    const typeId = layerAOutput.primary.typeId;

    // Gather candidates from BOTH sources
    const bankQuestions = QUESTION_BANK.filter((q) => q.trigger(layerAOutput));
    const schemaQuestions = this._schemasToDefinitions(
      getMatchingSchemas(layerAOutput),
      layerAOutput,
    );

    // Merge: schemas take precedence over bank for the same dimension ID
    const triggered = this._mergeQuestions(schemaQuestions, bankQuestions);

    // Mejora #2: Use complexity-based recommendedQuestions when available
    const complexityMax = layerAOutput.complexity?.recommendedQuestions;
    const defaultMax = this._getDefaultMax(confidence, typeId);

    // Use the tighter cap between complexity recommendation and default logic,
    // but ensure at least 2 questions when mode='multi' to avoid type-confirmation
    // starving genuine dimension questions.
    let maxQuestions = complexityMax
      ? Math.min(complexityMax, defaultMax + 1)
      : defaultMax;

    if (layerAOutput.mode === 'multi' && maxQuestions < 2) {
      maxQuestions = 2;
    }

    const missingDims = this._computeMissingDimensions(layerAOutput);
    const attrInfo = {
      nivel: layerAOutput.detectedAttributes.nivel,
      formato: layerAOutput.detectedAttributes.formato,
      tono: layerAOutput.detectedAttributes.tono,
    };
    console.log(
      `[QuestionSelector] type="${typeId}" conf=${confidence.toFixed(2)} ` +
      `mode="${layerAOutput.mode}" complexityRec=${complexityMax} maxQ=${maxQuestions} ` +
      `triggered=${triggered.length} missingDims=[${[...missingDims].join(',')}] ` +
      `attrs=${JSON.stringify(attrInfo)}`,
    );

    if (!typeId || typeId === 'desconocido') {
      const result = this._selectAll(triggered, Math.max(maxQuestions, 3));
      console.log(`[QuestionSelector] → _selectAll: ${result.length} questions`);
      return result;
    }

    if (confidence > 0.85) {
      const result = this._selectMissing(layerAOutput, triggered, maxQuestions);
      pipelineLog('QuestionSelector', `${result.length} questions [${result.map(q=>q.id).join(',')}], mode=${layerAOutput.mode}, maxQ=${maxQuestions}`);
      console.log(`[QuestionSelector] → _selectMissing(${maxQuestions}): ${result.length} questions [${result.map(q => q.id).join(',')}]`);
      return result;
    }
    if (confidence > 0.6) {
      const result = this._selectAmbiguous(layerAOutput, triggered, maxQuestions);
      pipelineLog('QuestionSelector', `${result.length} questions [${result.map(q=>q.id).join(',')}], mode=${layerAOutput.mode}, maxQ=${maxQuestions}`);
      console.log(`[QuestionSelector] → _selectAmbiguous(${maxQuestions}): ${result.length} questions [${result.map(q => q.id).join(',')}]`);
      return result;
    }
    const result = this._selectAll(triggered, Math.max(maxQuestions, 2));
    pipelineLog('QuestionSelector', `${result.length} questions [${result.map(q=>q.id).join(',')}], mode=${layerAOutput.mode}, maxQ=${maxQuestions}`);
    console.log(`[QuestionSelector] → _selectAll(${maxQuestions}): ${result.length} questions`);
    return result;
  }

  /**
   * Determine default max questions based on confidence and type.
   */
  private _getDefaultMax(confidence: number, typeId: string): number {
    const highRiskType =
      typeId === 'transformacion' || typeId === 'desconocido' || typeId === '';
    if (highRiskType) return 3;
    if (confidence > 0.85) return 2;
    if (confidence > 0.6) return 2;
    return 3;
  }

  // ── Schema → Bank-compatible QuestionDefinition ─────────────────────────

  private _schemasToDefinitions(
    schemas: readonly QuestionSchema[],
    ctx: LayerAOutput,
  ): QuestionDefinition[] {
    return schemas.map((s) => ({
      id: s.id,
      dimension: s.dimension,
      trigger: () => true, // already pre-filtered
      question: resolveQuestionText(s, ctx),
      options: [...resolveQuestionOptions(s, ctx)],
      mapsTo: s.mapsTo,
      normalize: s.normalize,
    }));
  }

  /**
   * Merge schema-generated questions with the legacy bank.
   * Schema questions win when both have the same dimension.
   */
  private _mergeQuestions(
    schemaQs: QuestionDefinition[],
    bankQs: QuestionDefinition[],
  ): QuestionDefinition[] {
    const schemaDims = new Set(schemaQs.map((q) => q.dimension));
    // Keep schema questions, then add bank questions whose dimension isn't covered
    return [
      ...schemaQs,
      ...bankQs.filter((q) => !schemaDims.has(q.dimension)),
    ];
  }

  // ── Selection strategies ─────────────────────────────────────────────────

  /**
   * High confidence (> 0.85): only ask about HIGH-VALUE missing dimensions.
   * Skips cosmetic dimensions (audiencia, for most types) and always suppresses
   * the intent question when the classifier is confident.
   */
  private _selectMissing(
    layerAOutput: LayerAOutput,
    triggered: QuestionDefinition[],
    maxQuestions: number,
  ): QuestionDefinition[] {
    const missingDimensions = this._computeMissingDimensions(layerAOutput);
    const result: QuestionDefinition[] = [];

    for (const dim of DIMENSION_PRIORITY) {
      if (result.length >= maxQuestions) break;

      // Only ask about high-value dimensions at high confidence
      if (!HIGH_VALUE_DIMENSIONS.has(dim)) continue;

      if (missingDimensions.has(dim)) {
        const q = this._findBestQuestion(triggered, dim);
        if (q) result.push(q);
      }
    }

    return result;
  }

  /**
   * Medium confidence (0.6–0.85): ask about high-value missing dimensions
   * AND optionally one type‑confirmation question to disambiguate.
   *
   * Phase 1.3: This now differs from _selectMissing — it includes type
   * confirmation ONLY when the pipeline itself flagged the classification
   * as ambiguous (mode === 'multi').
   */
  private _selectAmbiguous(
    layerAOutput: LayerAOutput,
    triggered: QuestionDefinition[],
    maxQuestions: number,
  ): QuestionDefinition[] {
    const missingDimensions = this._computeMissingDimensions(layerAOutput);
    const result: QuestionDefinition[] = [];

    // 1. First fill with high-value missing dimensions (nivel, formato, etc.)
    for (const dim of DIMENSION_PRIORITY) {
      if (result.length >= maxQuestions) break;
      if (dim === 'tipo') continue; // type confirmation goes last

      if (!HIGH_VALUE_DIMENSIONS.has(dim)) continue;

      if (missingDimensions.has(dim)) {
        const q = this._findBestQuestion(triggered, dim);
        if (q) result.push(q);
      }
    }

    // 2. Type confirmation ONLY as a bonus if there's room AND mode is truly multi
    if (result.length < maxQuestions && layerAOutput.mode === 'multi') {
      const typeConfirm = triggered.find(
        (q) => q.dimension === 'tipo' && q.id === 'q-type-confirm',
      );
      if (typeConfirm) {
        result.push(typeConfirm);
      }
    }

    return result;
  }

  /**
   * Low confidence or high-risk: show up to maxQuestions from triggered set.
   */
  private _selectAll(
    triggered: QuestionDefinition[],
    maxQuestions: number,
  ): QuestionDefinition[] {
    const result: QuestionDefinition[] = [];

    for (const dim of DIMENSION_PRIORITY) {
      if (result.length >= maxQuestions) break;
      const q = this._findBestQuestion(triggered, dim);
      if (q) result.push(q);
    }

    return result;
  }

  // ── Dimension helpers ────────────────────────────────────────────────────

  private _findBestQuestion(
    triggered: QuestionDefinition[],
    dimension: string,
  ): QuestionDefinition | undefined {
    const candidates = triggered.filter((q) => q.dimension === dimension);
    // Prefer questions without 'generic' in their id (type-specific over generic)
    const specific = candidates.find((q) => !q.id.startsWith('q-generic-'));
    return specific ?? candidates[0];
  }

  /**
   * Phase 1.4: Intent question suppression.
   * If intentId is known AND confidence >= 0.7, intent is NOT considered missing
   * — the question "¿Cuál es tu intención?" is redundant when we already know.
   *
   * Also respects: entities.target → fills audiencia, academic context → adds
   * academic dimensions.
   */
  private _computeMissingDimensions(layerAOutput: LayerAOutput): Set<string> {
    const missing = new Set<string>();
    const detected = layerAOutput.detectedAttributes;
    const finalAttrs = layerAOutput.attributes ?? {};
    const entities = layerAOutput.entities;

    // Core dimensions
    if (!detected.nivel && !finalAttrs.nivel) missing.add('nivel');
    if (!detected.formato && !finalAttrs.formato) missing.add('formato');

    // Paste action
    if (entities.inputContent && entities.externalContext) {
      missing.add('paste_action');
    }

    // Audiencia: NOT missing if entities.target is present
    const hasAudiencia =
      !!(detected as Record<string, unknown>).audiencia ||
      !!(finalAttrs as Record<string, unknown>).audiencia ||
      !!entities.target;
    if (!hasAudiencia) missing.add('audiencia');

    // Contexto
    if (!detected.contexto && !finalAttrs.contexto) missing.add('contexto');

    // ── Phase 1.4: Intent is only missing when truly unknown ───────────────
    const classification = layerAOutput.classification;
    const confidence = layerAOutput.primary.confidence;
    const intentKnown =
      classification.intentId !== 'desconocido' && confidence >= 0.7;

    if (!intentKnown) {
      missing.add('intencion');
    }
    // ───────────────────────────────────────────────────────────────────────

    // Academic dimensions — only relevant when context is academic
    const isAcademic =
      layerAOutput.attributes?.contexto === 'academico' ||
      (detected as Record<string, unknown>).contexto === 'academico';

    if (isAcademic) {
      missing.add('proposito');
      missing.add('materia');
      missing.add('nivel_curso');
      missing.add('tipo_texto');
    }

    return missing;
  }
}
