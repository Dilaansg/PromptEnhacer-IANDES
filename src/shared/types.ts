export type SiteType = 'chatgpt' | 'claude' | 'gemini';

export interface EnvironmentalImpact {
  readonly estimatedTokens: number;
  readonly waterMl: number;
  readonly co2G: number;
}

export interface PromptAnalysis {
  readonly originalLength: number;
  readonly tokenCount: number;
  readonly language: string;
  readonly intent: string;
  readonly qualityScore: number;
}

export interface OptimizationResult {
  readonly optimizedText: string;
  readonly savingsPercent: number;
  readonly impact: EnvironmentalImpact;
  readonly analysis: PromptAnalysis;
}

export type NivelAttribute = 'basico' | 'intermedio' | 'avanzado' | 'desconocido';

export interface PromptAttributes {
  readonly tipo?: string;
  readonly nivel?: NivelAttribute;
  readonly formato?: string;
  readonly longitud?: string;
  readonly tono?: string;
  readonly audiencia?: string;
  readonly contexto?: string;
  readonly intencion?: string;
}

export interface ComplexityResult {
  readonly completeness: number;
  readonly vagueness: number;
  readonly recommendedQuestions: number;
}

export interface LayerAOutput {
  readonly input: string;
  readonly original: string;
  readonly normalized: string;
  readonly classification: ClassificationResult;
  readonly entities: ExtractedEntities;
  readonly attributes: PromptAttributes;
  readonly detectedAttributes: PromptAttributes;
  readonly mode: ClassificationMode;
  readonly timestamp: number;
  readonly complexity?: ComplexityResult;
  readonly primary: {
    readonly typeId: string;
    readonly confidence: number;
    readonly intent?: string;
    readonly domain?: string;
    readonly domainConfidence?: number;
  };
  readonly secondary?: {
    readonly typeId: string;
    readonly confidence: number;
    readonly intent?: string;
    readonly domain?: string;
    readonly domainConfidence?: number;
  };
}

export interface QuestionDefinition {
  readonly id: string;
  readonly dimension: string;
  readonly trigger: (output: LayerAOutput) => boolean;
  readonly question: string;
  readonly options: string[];
  readonly mapsTo: string;
  /** Optional normalisation map: raw answer → canonical value. Phase 1.2. */
  readonly normalize?: Record<string, string>;
}

export interface LayerBOutput {
  readonly questionsAsked: number;
  readonly skipped: boolean;
  readonly answers: Record<string, string>;
  readonly enrichedAttributes: Record<string, unknown>;
  readonly entities: Record<string, unknown>;
  readonly resolvedType: string;
  readonly resolvedIntent: string;
  readonly originalPrompt: string;
}

// ───────────────────────────────────────────────
// Layer A — Semantic Classification Types
// ───────────────────────────────────────────────

export interface PromptIntent {
  readonly id: string;
  readonly label: string;
}

export interface PromptTypeTriggers {
  readonly strong: readonly string[];
  readonly weak: readonly string[];
  readonly negative: readonly string[];
}

export interface PromptTypeEntities {
  readonly contextHints: readonly string[];
}

export interface PromptTypeAttributes {
  readonly nivel: string;
  readonly formato: string;
  readonly longitud: string;
  readonly tono: string;
}

export interface PromptTypeDefinition {
  readonly id: string;
  readonly label: string;
  readonly triggers: PromptTypeTriggers;
  readonly intents: readonly PromptIntent[];
  readonly entities: PromptTypeEntities;
  readonly defaultAttributes: PromptTypeAttributes;
}

export interface ScoringResult {
  readonly topType: PromptTypeDefinition | null;
  readonly candidates: readonly PromptTypeDefinition[];
  readonly scores: Readonly<Record<string, number>>;
  readonly ambiguityScore: number;
}

export interface ClassificationResult {
  readonly typeId: string;
  readonly typeLabel: string;
  readonly intentId: string;
  readonly intentLabel: string;
  readonly confidence: number;
  readonly ambiguityScore: number;
  readonly allScores: Readonly<Record<string, number>>;
}

export interface PasteMetadata {
  readonly pastedText: string;
  readonly pastedLength: number;
  readonly totalLength: number;
}

export interface ExtractedEntities {
  readonly topic?: string;
  readonly context?: string;
  readonly target?: string;
  readonly inputContent: boolean;
  readonly language?: string;
  readonly externalContext?: string;
}

export type ClassificationMode = 'single' | 'multi';

export interface LayerCOutput {
  readonly superPrompt: string;
  readonly originalPrompt: string;
  readonly templateUsed: string;
  readonly estimatedTokenDelta: number;
  readonly componentsUsed: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface TemplateDefinition {
  readonly id: string;
  readonly template: string;
}

// ───────────────────────────────────────────────
// Pipeline Utilities (migrated from pipeline/types.ts)
// ───────────────────────────────────────────────

export interface PipelineConfig {
  readonly maxTokens: number;
  readonly temperature: number;
  readonly rulesEnabled: readonly string[];
}

export interface PipelineResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

/** Alias: answers keyed by question id */
export type LayerBAnswers = Record<string, string>;
