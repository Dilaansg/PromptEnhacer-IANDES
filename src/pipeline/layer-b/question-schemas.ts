/**
 * Question Schemas — Type‑specific, context‑aware question definitions.
 *
 * Phase 1.1 of the Mitigation Plan.
 * Replaces the static QUESTION_BANK with declarative schemas that adapt their
 * wording and options based on the type / intent classified by Layer A.
 *
 * Key improvements over question-bank.ts:
 *  - Conditions are declarative (types, intents, confidence ranges), not binary triggers.
 *  - Question text and answer options can be functions of the classified context.
 *  - Each schema optionally carries a `normalize` map so raw user answers
 *    (e.g. "Introductorio") are automatically mapped to canonical values ("basico").
 */

import type { LayerAOutput } from '@shared/types';

// ────────────────────────────────────────────────────────────────────────────
// Schema interface
// ────────────────────────────────────────────────────────────────────────────

export interface QuestionConditions {
  /** Only activate for these type IDs (LayerA classification). */
  readonly types?: readonly string[];
  /** Only activate for these intent IDs. */
  readonly intents?: readonly string[];
  /** Only activate for these domain IDs. */
  readonly domains?: readonly string[];
  /** Only activate when this dimension is missing from detectedAttributes. */
  readonly requiresMissing?: string;
  /** Only activate when confidence >= this value. */
  readonly minConfidence?: number;
  /** Only activate when confidence < this value. */
  readonly maxConfidence?: number;
  /** Only activate when domainConfidence >= this value. */
  readonly minDomainConfidence?: number;
}

export interface QuestionSchema {
  readonly id: string;
  readonly dimension: string;
  readonly conditions: QuestionConditions;
  readonly question:
    | string
    | ((ctx: LayerAOutput) => string);
  readonly options:
    | readonly string[]
    | ((ctx: LayerAOutput) => readonly string[]);
  readonly mapsTo: string;
  /**
   * Canonical-normalisation map.
   * Keys are raw user answers, values are the normalised strings that
   * templates and downstream layers understand.
   */
  readonly normalize?: Record<string, string>;
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: check whether a dimension is missing
// ────────────────────────────────────────────────────────────────────────────

function isMissing(
  output: LayerAOutput,
  dimension: string,
): boolean {
  const detected = output.detectedAttributes as Record<string, unknown>;
  const final = (output.attributes ?? {}) as Record<string, unknown>;
  return !detected[dimension] && !final[dimension];
}

// ────────────────────────────────────────────────────────────────────────────
// Schema definitions — grouped by type for readability
// ────────────────────────────────────────────────────────────────────────────

export const QUESTION_SCHEMAS: readonly QuestionSchema[] = [
  // ── INFORMACION ───────────────────────────────────────────────────────────
  {
    id: 'q-info-depth',
    dimension: 'nivel',
    conditions: { types: ['informacion'], requiresMissing: 'nivel' },
    question: (ctx) =>
      ctx.primary.intent === 'definicion'
        ? '¿Qué tan detallada necesitas la definición?'
        : '¿Qué nivel de profundidad necesitas?',
    options: (ctx) =>
      ctx.primary.intent === 'definicion'
        ? [
            'Rápida y concisa (1-2 oraciones)',
            'Completa con ejemplos',
            'Académica con fuentes',
          ]
        : ['Básico', 'Intermedio', 'Avanzado'],
    mapsTo: 'nivel',
    normalize: {
      'Rápida y concisa (1-2 oraciones)': 'basico',
      'Completa con ejemplos': 'intermedio',
      'Académica con fuentes': 'avanzado',
      'Básico': 'basico',
      'Intermedio': 'intermedio',
      'Avanzado': 'avanzado',
      'Introductorio': 'basico',
      'Técnico moderado': 'intermedio',
      'Experto': 'avanzado',
      'Principiante': 'basico',
    },
  },
  {
    id: 'q-info-format',
    dimension: 'formato',
    conditions: { types: ['informacion'], requiresMissing: 'formato' },
    question: '¿Cómo prefieres que se estructure la respuesta?',
    options: [
      'Párrafos explicativos',
      'Puntos clave',
      'Paso a paso',
      'Tabla comparativa',
    ],
    mapsTo: 'formato',
    normalize: {
      'Párrafos explicativos': 'parrafos',
      'Puntos clave': 'lista',
      'Paso a paso': 'paso_a_paso',
      'Tabla comparativa': 'tabla',
      'Texto libre': 'parrafos',
      'Lista numerada': 'lista',
      'Lista con viñetas': 'lista',
    },
  },
  {
    id: 'q-info-audiencia',
    dimension: 'audiencia',
    conditions: { types: ['informacion'], requiresMissing: 'audiencia' },
    question: '¿Para quién es esta explicación?',
    options: [
      'Para mí',
      'Para un estudiante',
      'Para un profesional del área',
      'Para público general',
    ],
    mapsTo: 'audiencia',
    normalize: {
      'Para mí': 'personal',
      'Para un estudiante': 'estudiante',
      'Para un profesional del área': 'profesional',
      'Para público general': 'general',
      'Para un cliente': 'profesional',
      'Para un niño': 'infantil',
      'Para un ejecutivo': 'ejecutivo',
      'Para un técnico': 'tecnico',
    },
  },

  // ── CODIGO ────────────────────────────────────────────────────────────────
  {
    id: 'q-code-lang',
    dimension: 'contexto',
    conditions: { types: ['codigo'], requiresMissing: 'contexto' },
    question: '¿En qué lenguaje o framework?',
    options: [
      'Python',
      'JavaScript / TypeScript',
      'Java',
      'C / C++',
      'Rust',
      'Go',
      'SQL',
      'HTML / CSS',
      'Otro',
    ],
    mapsTo: 'contexto',
  },
  {
    id: 'q-code-level',
    dimension: 'nivel',
    conditions: { types: ['codigo'], requiresMissing: 'nivel' },
    question: '¿Qué nivel de explicación necesitas?',
    options: [
      'Solo el código (sin explicación)',
      'Código con comentarios breves',
      'Explicación detallada paso a paso',
    ],
    mapsTo: 'nivel',
    normalize: {
      'Solo el código (sin explicación)': 'avanzado',
      'Código con comentarios breves': 'intermedio',
      'Explicación detallada paso a paso': 'basico',
    },
  },
  {
    id: 'q-code-purpose',
    dimension: 'intencion',
    conditions: {
      types: ['codigo'],
      maxConfidence: 0.7,
    },
    question: '¿Qué necesitas hacer con el código?',
    options: [
      'Escribir nuevo código',
      'Arreglar / depurar',
      'Refactorizar / mejorar',
      'Explicar código existente',
    ],
    mapsTo: 'intencion',
    normalize: {
      'Escribir nuevo código': 'escribir_codigo',
      'Arreglar / depurar': 'debug',
      'Refactorizar / mejorar': 'refactorizar',
      'Explicar código existente': 'explicar_codigo',
    },
  },

  // ── GENERACION ────────────────────────────────────────────────────────────
  {
    id: 'q-gen-tone',
    dimension: 'tono',
    conditions: { types: ['generacion'], requiresMissing: 'tono' },
    question: '¿Qué tono debe tener el contenido?',
    options: ['Formal / profesional', 'Neutral', 'Informal / cercano', 'Creativo / inspirador'],
    mapsTo: 'tono',
    normalize: {
      'Formal / profesional': 'formal',
      'Neutral': 'neutral',
      'Informal / cercano': 'informal',
      'Creativo / inspirador': 'creativo',
    },
  },
  {
    id: 'q-gen-audience',
    dimension: 'audiencia',
    conditions: { types: ['generacion'], requiresMissing: 'audiencia' },
    question: '¿Quién es la audiencia objetivo?',
    options: [
      'Público general',
      'Profesionales del sector',
      'Estudiantes',
      'Ejecutivos / directivos',
      'Redes sociales',
    ],
    mapsTo: 'audiencia',
    normalize: {
      'Público general': 'general',
      'Profesionales del sector': 'profesional',
      'Estudiantes': 'estudiante',
      'Ejecutivos / directivos': 'ejecutivo',
      'Redes sociales': 'social',
    },
  },
  {
    id: 'q-gen-length',
    dimension: 'longitud',
    conditions: { types: ['generacion'], requiresMissing: 'longitud' },
    question: '¿Qué extensión aproximada necesitas?',
    options: [
      'Corto (1-2 párrafos)',
      'Medio (3-5 párrafos)',
      'Largo (más de 5 párrafos)',
      'Muy extenso (documento completo)',
    ],
    mapsTo: 'longitud',
    normalize: {
      'Corto (1-2 párrafos)': 'corto',
      'Medio (3-5 párrafos)': 'medio',
      'Largo (más de 5 párrafos)': 'largo',
      'Muy extenso (documento completo)': 'extenso',
    },
  },

  // ── ANALISIS ──────────────────────────────────────────────────────────────
  {
    id: 'q-analysis-depth',
    dimension: 'nivel',
    conditions: { types: ['analisis'], requiresMissing: 'nivel' },
    question: '¿Qué profundidad de análisis necesitas?',
    options: [
      'Panorama general',
      'Análisis equilibrado',
      'Análisis exhaustivo con datos',
    ],
    mapsTo: 'nivel',
    normalize: {
      'Panorama general': 'basico',
      'Análisis equilibrado': 'intermedio',
      'Análisis exhaustivo con datos': 'avanzado',
    },
  },

  // ── ACCION ────────────────────────────────────────────────────────────────
  {
    id: 'q-action-context',
    dimension: 'contexto',
    conditions: { types: ['accion'], requiresMissing: 'contexto' },
    question: '¿En qué contexto necesitas aplicar esto?',
    options: [
      'Proyecto personal',
      'Trabajo / profesional',
      'Estudio / académico',
      'Emprendimiento',
    ],
    mapsTo: 'contexto',
    normalize: {
      'Proyecto personal': 'personal',
      'Trabajo / profesional': 'profesional',
      'Estudio / académico': 'academico',
      'Emprendimiento': 'emprendimiento',
    },
  },

  // ── TRANSFORMACION ────────────────────────────────────────────────────────
  {
    id: 'q-transform-target-lang',
    dimension: 'contexto',
    conditions: { types: ['transformacion'], requiresMissing: 'contexto' },
    question: '¿A qué idioma o formato quieres convertir?',
    options: [
      'Español',
      'Inglés',
      'Francés',
      'Portugués',
      'Alemán',
      'Otro idioma',
    ],
    mapsTo: 'contexto',
  },

  // ── DOMAIN-SPECIFIC (Mejora #7) ────────────────────────────────────────────
  // Mathematics
  {
    id: 'q-math-approach',
    dimension: 'contexto',
    conditions: {
      types: ['informacion', 'razonamiento'],
      domains: ['matematicas'],
      minDomainConfidence: 0.6,
      requiresMissing: 'contexto',
    },
    question: '¿Qué tipo de explicación matemática necesitas?',
    options: [
      'Demostración formal (teoremas, pasos lógicos)',
      'Explicación conceptual (intuición, ejemplos)',
      'Resolución numérica (cálculos, resultados)',
      'Visualización geométrica (gráficos, diagramas)',
    ],
    mapsTo: 'tipo_matematico',
    normalize: {
      'Demostración formal (teoremas, pasos lógicos)': 'demostracion',
      'Explicación conceptual (intuición, ejemplos)': 'conceptual',
      'Resolución numérica (cálculos, resultados)': 'numerico',
      'Visualización geométrica (gráficos, diagramas)': 'geometrico',
    },
  },
  // History
  {
    id: 'q-history-perspective',
    dimension: 'contexto',
    conditions: {
      types: ['informacion', 'analisis'],
      domains: ['historia'],
      minDomainConfidence: 0.6,
      requiresMissing: 'contexto',
    },
    question: '¿Qué perspectiva histórica prefieres?',
    options: [
      'Cronológica (línea de tiempo)',
      'Causas y consecuencias',
      'Contexto social y cultural',
      'Análisis comparativo con otras épocas',
    ],
    mapsTo: 'perspectiva_historica',
    normalize: {
      'Cronológica (línea de tiempo)': 'cronologica',
      'Causas y consecuencias': 'causal',
      'Contexto social y cultural': 'contextual',
      'Análisis comparativo con otras épocas': 'comparativa',
    },
  },
  // Science (biology, physics, chemistry)
  {
    id: 'q-science-depth',
    dimension: 'nivel',
    conditions: {
      types: ['informacion', 'analisis'],
      domains: ['biologia', 'fisica', 'quimica'],
      minDomainConfidence: 0.6,
      requiresMissing: 'nivel',
    },
    question: '¿Qué profundidad científica necesitas?',
    options: [
      'Divulgación (para público general)',
      'Nivel universitario básico',
      'Nivel avanzado con fórmulas y datos',
      'Revisión de literatura científica',
    ],
    mapsTo: 'nivel',
    normalize: {
      'Divulgación (para público general)': 'basico',
      'Nivel universitario básico': 'intermedio',
      'Nivel avanzado con fórmulas y datos': 'avanzado',
      'Revisión de literatura científica': 'avanzado',
    },
  },
  // Technology / Programming
  {
    id: 'q-tech-stack',
    dimension: 'contexto',
    conditions: {
      types: ['codigo'],
      domains: ['tecnologia', 'programacion'],
      minDomainConfidence: 0.5,
      requiresMissing: 'contexto',
    },
    question: '¿Qué stack o entorno estás usando?',
    options: [
      'Frontend (React, Vue, Angular)',
      'Backend (Node, Django, Spring)',
      'Fullstack',
      'Data Science / ML',
      'DevOps / Infraestructura',
      'Mobile (iOS, Android)',
    ],
    mapsTo: 'contexto',
  },
  // Medicine
  {
    id: 'q-medicine-level',
    dimension: 'nivel',
    conditions: {
      types: ['informacion', 'analisis'],
      domains: ['medicina'],
      minDomainConfidence: 0.6,
      requiresMissing: 'nivel',
    },
    question: '¿A qué nivel necesitas la información médica?',
    options: [
      'Información para pacientes (lenguaje sencillo)',
      'Nivel de estudiante de medicina',
      'Nivel profesional/clínico',
      'Revisión de estudios y meta-análisis',
    ],
    mapsTo: 'nivel',
    normalize: {
      'Información para pacientes (lenguaje sencillo)': 'basico',
      'Nivel de estudiante de medicina': 'intermedio',
      'Nivel profesional/clínico': 'avanzado',
      'Revisión de estudios y meta-análisis': 'avanzado',
    },
  },
  // Economics
  {
    id: 'q-economics-focus',
    dimension: 'contexto',
    conditions: {
      types: ['informacion', 'analisis'],
      domains: ['economia'],
      minDomainConfidence: 0.6,
      requiresMissing: 'contexto',
    },
    question: '¿Qué enfoque económico necesitas?',
    options: [
      'Macroeconomía (países, políticas)',
      'Microeconomía (empresas, consumidores)',
      'Econometría (datos, modelos)',
      'Historia económica',
    ],
    mapsTo: 'enfoque_economico',
    normalize: {
      'Macroeconomía (países, políticas)': 'macro',
      'Microeconomía (empresas, consumidores)': 'micro',
      'Econometría (datos, modelos)': 'econometria',
      'Historia económica': 'historica',
    },
  },

  // ── GENERIC FALLBACKS (any type, when dimension is genuinely missing) ─────
  {
    id: 'q-generic-nivel',
    dimension: 'nivel',
    conditions: { requiresMissing: 'nivel' },
    question: '¿Qué nivel de profundidad necesitas?',
    options: ['Básico', 'Intermedio', 'Avanzado'],
    mapsTo: 'nivel',
    normalize: {
      'Básico': 'basico',
      'Intermedio': 'intermedio',
      'Avanzado': 'avanzado',
      'Introductorio': 'basico',
      'Técnico moderado': 'intermedio',
      'Experto': 'avanzado',
      'Principiante': 'basico',
    },
  },
  {
    id: 'q-generic-contexto',
    dimension: 'contexto',
    conditions: { requiresMissing: 'contexto' },
    question: '¿Hay algún contexto adicional que deba saber?',
    options: [
      'Sin contexto adicional',
      'Proyecto académico',
      'Trabajo profesional',
      'Proyecto personal',
    ],
    mapsTo: 'contexto',
    normalize: {
      'Sin contexto adicional': 'general',
      'Proyecto académico': 'academico',
      'Trabajo profesional': 'profesional',
      'Proyecto personal': 'personal',
    },
  },

  // ── TYPE CONFIRMATION — for ambiguous classification ──────────────────────
  {
    id: 'q-type-confirm',
    dimension: 'tipo',
    conditions: { maxConfidence: 0.85, minConfidence: 0.50 },
    question: '¿Es esto lo que necesitas?',
    options: (ctx) => {
      // Surface the two highest-scoring types for confirmation
      const scores = ctx.classification.allScores ?? {};
      const sorted = Object.entries(scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 2);
      return sorted.length > 0
        ? sorted.map(([id]) => {
            const labels: Record<string, string> = {
              informacion: 'Información / explicación',
              generacion: 'Generar contenido',
              codigo: 'Código / programación',
              analisis: 'Análisis / evaluación',
              transformacion: 'Transformar / resumir',
              accion: 'Plan / tutorial',
              conversacion: 'Conversación / debate',
              razonamiento: 'Razonamiento / resolver',
            };
            return labels[id] ?? id;
          })
        : ['Sí, continuar', 'No, es otra cosa'];
    },
    mapsTo: 'tipo',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Evaluator: does a schema match the current layer‑A output?
// ────────────────────────────────────────────────────────────────────────────

export function schemaMatches(
  schema: QuestionSchema,
  output: LayerAOutput,
): boolean {
  const c = schema.conditions;

  // Type restriction
  if (c.types && c.types.length > 0 && !c.types.includes(output.primary.typeId)) {
    return false;
  }

  // Intent restriction
  if (c.intents && c.intents.length > 0 && !c.intents.includes(output.primary.intent ?? '')) {
    return false;
  }

  // Domain restriction (Mejora #7)
  if (c.domains && c.domains.length > 0) {
    const domain = output.primary.domain ?? '';
    if (!c.domains.includes(domain)) {
      return false;
    }
  }

  // Min domain confidence (Mejora #7)
  if (c.minDomainConfidence !== undefined) {
    const domainConf = output.primary.domainConfidence ?? 0;
    if (domainConf < c.minDomainConfidence) {
      return false;
    }
  }

  // Dimension must be missing
  if (c.requiresMissing && !isMissing(output, c.requiresMissing)) {
    return false;
  }

  // Confidence floor
  if (c.minConfidence !== undefined && output.primary.confidence < c.minConfidence) {
    return false;
  }

  // Confidence ceiling
  if (c.maxConfidence !== undefined && output.primary.confidence >= c.maxConfidence) {
    return false;
  }

  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Resolve dynamic question / options
// ────────────────────────────────────────────────────────────────────────────

export function resolveQuestionText(
  schema: QuestionSchema,
  ctx: LayerAOutput,
): string {
  return typeof schema.question === 'function'
    ? schema.question(ctx)
    : schema.question;
}

export function resolveQuestionOptions(
  schema: QuestionSchema,
  ctx: LayerAOutput,
): readonly string[] {
  return typeof schema.options === 'function'
    ? schema.options(ctx)
    : schema.options;
}

// ────────────────────────────────────────────────────────────────────────────
// Retrieve all schemas that apply to a given LayerA output
// ────────────────────────────────────────────────────────────────────────────

export function getMatchingSchemas(output: LayerAOutput): readonly QuestionSchema[] {
  return QUESTION_SCHEMAS.filter((s) => schemaMatches(s, output));
}
