import { Normalizer } from './normalizer';
import { TypeScorer } from './scorer';
import { SemanticClassifier } from './semantic-classifier';
import { EntityExtractor } from './entity-extractor';
import { AttributeDetector } from './attribute-detector';
import { DomainClassifier } from './domain-classifier';
import { analyzeComplexity } from './complexity-analyzer';
import { EmbeddingEngine } from '../embedding-engine';
import { PROMPT_TYPE_REGISTRY } from '@/data/prompt-types';
import { LayerAOutput, ClassificationMode, PasteMetadata } from '@shared/types';
import { pipelineLog } from '@shared/log-collector';

export class LayerA {
  private readonly normalizer = new Normalizer();
  private readonly scorer = new TypeScorer();
  private readonly semanticClassifier = new SemanticClassifier();
  private readonly extractor = new EntityExtractor();
  private readonly detector = new AttributeDetector();
  private readonly domainClassifier = new DomainClassifier();

  async process(text: string, pasteMetadata?: PasteMetadata): Promise<LayerAOutput> {
    let textToAnalyze = text;
    let pasteIsMainContent = false;
    let externalContext: string | undefined;

    if (pasteMetadata && pasteMetadata.pastedLength > (pasteMetadata.totalLength * 0.6)) {
      // It's mostly pasted text. Try to extract the instruction part.
      const cleaned = text.replace(pasteMetadata.pastedText, '').trim();
      // Only separate if there's a meaningful instruction left
      if (cleaned.length > 5) {
        textToAnalyze = cleaned;
      }
      pasteIsMainContent = true;
      externalContext = pasteMetadata.pastedText;
      console.log(`[LayerA] Paste detected. Analyzing instruction: "${textToAnalyze.substring(0, 50)}..."`);
    }

    const normalized = this.normalizer.normalize(textToAnalyze);

    // ── STEP 1: Type classification — embeddings first, TypeScorer as fallback ──

    let typeId = 'desconocido';
    let typeConfidence = 0;
    let intentId = 'desconocido';
    let mode: ClassificationMode = 'single';

    // Always run TypeScorer — we need the ambiguity score regardless
    const scoringResult = this.scorer.scoreTypes(normalized, PROMPT_TYPE_REGISTRY);

    const semanticType = await this.semanticClassifier.classifyType(normalized);

    if (semanticType && semanticType.confidence >= this.semanticClassifier.typeThreshold) {
      // High-confidence semantic classification
      typeId = semanticType.typeId;
      typeConfidence = semanticType.confidence;

      // Mejora #3: Verify the classification is coherent
      const verification = await this.semanticClassifier.verifyClassification(normalized, typeId);
      if (!verification.isCoherent) {
        console.log(
          `[LayerA] Type misclassification detected: classified="${typeId}" ` +
          `but best semantic match is "${verification.actualBestType}" ` +
          `(score: ${verification.confidence.toFixed(2)} vs best: semantic). Re-classifying.`,
        );
        typeId = verification.actualBestType;
        typeConfidence = verification.confidence;
      }

      // Lexical override: if TypeScorer has a STRONG unambiguous signal for a
      // different type, the keyword wins. The embedding model sometimes maps
      // "haz un ensayo" → conversacion but the keyword "haz un" is unambiguously
      // generacion. Trust the explicit lexical signal over the embedding noise.
      const scorerTop = scoringResult.topType;
      const scorerScores = scoringResult.scores;
      const scorerTopScore = scorerTop ? (scorerScores[scorerTop.id] ?? 0) : 0;
      const scorerSecondScore = Object.values(scorerScores)
        .filter((s) => s !== scorerTopScore)
        .sort((a, b) => b - a)[0] ?? 0;

      if (
        scorerTop &&
        scorerTop.id !== typeId &&
        scorerTopScore >= 0.8 &&
        scorerTopScore - scorerSecondScore >= 0.3
      ) {
        pipelineLog('LayerA', `Lexical override: semantic="${typeId}" → keyword="${scorerTop.id}" (${scorerTopScore.toFixed(2)})`, 'warn');
        console.log(
          `[LayerA] Lexical override: semantic="${typeId}" (${typeConfidence.toFixed(2)}) ` +
          `→ keyword="${scorerTop.id}" (${scorerTopScore.toFixed(2)}, gap=${(scorerTopScore - scorerSecondScore).toFixed(2)})`,
        );
        typeId = scorerTop.id;
        typeConfidence = Math.max(typeConfidence, scorerTopScore);
        mode = 'single'; // clear multi-mode from false top-2 ambiguity

        // When semantic model is confused about the type, it's likely confused
        // about the intent too. Use keyword matching + content-noun heuristics.
        intentId = this._bestMatchingIntent(normalized, scorerTop.intents ?? []);

        // Content-noun override: certain nouns bias toward specific intents.
        const lower = normalized.toLowerCase();
        if (typeId === 'generacion') {
          if (/\bensayo\b|\bpoema\b|\bcuento\b|\bhistoria\b|\bnarrativa\b|\bnovela\b/i.test(lower)) {
            intentId = 'texto_creativo';
          } else if (/\bart[ií]culo\b|\binforme\b|\breporte\b|\bemail\b|\bcorreo\b/i.test(lower)) {
            intentId = 'contenido_profesional';
          } else if (/\bcampaña\b|\banuncio\b|\bcopy\b|\bslogan\b/i.test(lower)) {
            intentId = 'contenido_marketing';
          }
        }
      }

      // Lexical override happened — skip redundant semantic re-classification
      if (intentId === 'desconocido') {
        const semanticIntent = await this.semanticClassifier.classifyIntent(normalized, typeId);
        intentId = semanticIntent?.intentId ?? this._bestMatchingIntent(normalized, scorerTop?.intents ?? []);
      }

      console.log(
        `[LayerA] Semantic → type="${typeId}" (${typeConfidence.toFixed(2)}), intent="${intentId}"`,
      );

      // Tarea 5.2: Detect multi-mode from semantic confidence and TypeScorer ambiguity.
      // Skip if mode was already cleared by lexical override or verifyClassification.
      if (mode !== 'single') {
        const scoreValues = Object.values(scoringResult.scores).sort((a, b) => b - a);
        const scorerAmbiguous =
          scoreValues.length >= 2 && scoreValues[0] > 0 && (scoreValues[0] - scoreValues[1]) < 0.20;

        const semanticAmbiguous = semanticType.confidence < 0.65;

        const top2Scores = await this.semanticClassifier.getTop2Scores(normalized);
        const top2Ambiguous =
          top2Scores.length >= 2 && (top2Scores[0].confidence - top2Scores[1].confidence) < 0.12;

        if (top2Ambiguous) {
          mode = 'multi';
          console.log(
            `[LayerA] Multi-mode (semantic top-2 close): "${top2Scores[0].typeId}" (${top2Scores[0].confidence.toFixed(2)}) ` +
            `vs "${top2Scores[1].typeId}" (${top2Scores[1].confidence.toFixed(2)})`,
          );
        } else if (scorerAmbiguous && semanticAmbiguous) {
          mode = 'multi';
          console.log('[LayerA] Detected multi-mode (semantic ambiguous + scorer ambiguous)');
        }
      }
    } else {
      // Fallback: keyword-based TypeScorer
      const topType = scoringResult.topType;

      typeId = topType ? topType.id : 'desconocido';
      typeConfidence = scoringResult.scores[typeId] ?? 0;
      // Phase 3.4: Smart intent fallback — match by keyword instead of intents[0]
      intentId = this._bestMatchingIntent(normalized, topType?.intents ?? []);

      console.log(
        `[LayerA] TypeScorer fallback → type="${typeId}" (${typeConfidence.toFixed(2)}), intent="${intentId}"` +
        (semanticType
          ? ` [semantic conf was ${semanticType.confidence.toFixed(2)}]`
          : ' [engine not ready]'),
      );

      // Tarea 5.2: Detect ambiguity from TypeScorer scores.
      // Case A: two types have close normalized scores
      const scoreValues = Object.values(scoringResult.scores).sort((a, b) => b - a);
      const scoresClose =
        scoreValues.length >= 2 &&
        scoreValues[0] > 0 &&
        scoreValues[0] - scoreValues[1] < 0.15;

      // Case B: no type matched at all — prompt is truly ambiguous
      const noTypeMatched = topType === null;

      if (scoresClose || noTypeMatched) {
        mode = 'multi';
        console.log(
          `[LayerA] Detected multi-mode (${noTypeMatched ? 'no type matched' : 'close scores'})`,
        );
      }
    }

    // ── STEP 2: Domain classification (semantic + keyword fallback) ──
    const domainResult = await this.domainClassifier.classify(normalized);

    // ── STEP 3: Entity & attribute extraction ──
    const extractedEntities = await this.extractor.extract(normalized, typeId);
    const attributes = await this.detector.detectAttributes(normalized, typeId, intentId);
    
    // ── STEP 3.5: Complexity analysis (Mejora #2) ──
    const complexity = await analyzeComplexity(normalized, EmbeddingEngine.getInstance());
    console.log(
      `[LayerA] Complexity: completeness=${complexity.completeness.toFixed(2)} ` +
      `vagueness=${complexity.vagueness.toFixed(2)} ` +
      `recommendedQuestions=${complexity.recommendedQuestions}`,
    );
    
    // Inject paste data (Tarea 3.2)
    const entities = {
      ...extractedEntities,
      inputContent: extractedEntities.inputContent || pasteIsMainContent,
      externalContext: externalContext,
    };

    // ── STEP 4: Puente entities.target → attributes.audiencia (Tarea 2.3) ──
    // If we know the target audience from entities but audiencia isn't set, map it.
    const audiencia: string | undefined =
      (attributes as Record<string, unknown>).audiencia as string | undefined ??
      (entities.target ? entities.target : undefined);

    // Build enriched attributes (domain as contexto when detected)
    const enrichedAttributes = {
      ...attributes,
      ...(audiencia ? { audiencia } : {}),
      contexto:
        domainResult.domain !== 'desconocido'
          ? domainResult.domain
          : (attributes as Record<string, unknown>).contexto as string | undefined,
      // Phase 4.2: Propagate domainConfidence so Layer C can threshold rigor rules
      domainConfidence: domainResult.confidence,
    };

    // ── STEP 5: Build classification result (for backward compat with panel) ──
    const topTypeDefinition = PROMPT_TYPE_REGISTRY.find((t) => t.id === typeId) ?? null;

    return {
      input: text,
      original: text,
      normalized,
      primary: {
        typeId,
        confidence: typeConfidence,
        intent: intentId,
        domain: domainResult.domain,
        domainConfidence: domainResult.confidence,
      },
      classification: {
        typeId,
        typeLabel: topTypeDefinition?.label ?? 'Desconocido',
        intentId,
        intentLabel:
          topTypeDefinition?.intents.find((i) => i.id === intentId)?.label ??
          intentId,
        confidence: typeConfidence,
        ambiguityScore: scoringResult.ambiguityScore,
        allScores: scoringResult.scores,
      },
      entities,
      attributes: enrichedAttributes,
      detectedAttributes: attributes,
      mode,
      complexity,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 3.4: Smart intent matching for the TypeScorer fallback.
   *
   * Instead of blindly taking the first intent, score each intent's label
   * against the normalized text using simple keyword overlap.
   */
  private _bestMatchingIntent(
    text: string,
    intents: readonly { id: string; label: string }[],
  ): string {
    if (intents.length === 0) return 'desconocido';

    const lower = text.toLowerCase();
    let bestId = intents[0].id;
    let bestScore = 0;

    for (const intent of intents) {
      const labelLower = intent.label.toLowerCase();
      // Count keyword overlaps between intent label and text
      const labelWords = new Set(labelLower.split(/\s+/));
      const textWords = new Set(lower.split(/\s+/));
      let overlap = 0;
      for (const w of labelWords) {
        if (w.length > 2 && textWords.has(w)) overlap++;
      }

      // Also check if the label itself appears in the text
      if (lower.includes(labelLower)) overlap += 3;

      if (overlap > bestScore) {
        bestScore = overlap;
        bestId = intent.id;
      }
    }

    return bestScore > 0 ? bestId : intents[0].id;
  }
}
