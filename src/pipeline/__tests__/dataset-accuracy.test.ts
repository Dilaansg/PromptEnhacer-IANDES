/**
 * Dataset Accuracy Test Suite — REAL end-to-end pipeline validation.
 *
 * This is NOT a unit test. It runs every prompt from DATASET_PROMPTS.json
 * through the FULL Layer A pipeline (TypeScorer-only since Jest can't load
 * ONNX) and asserts:
 *   1. Correct type classification
 *   2. Correct intent (where deterministic)
 *   3. Correct topic extraction
 *   4. Correct attribute inference
 *
 * Each test case has an EXPECTED result so failures pinpoint exactly which
 * prompt is misclassified and why — enabling targeted trigger/scorer fixes.
 *
 * Run:  npx jest dataset-accuracy --verbose
 */

import { Normalizer } from '../layer-a/normalizer';
import { TypeScorer } from '../layer-a/scorer';
import { EntityExtractor } from '../layer-a/entity-extractor';
import { AttributeDetector } from '../layer-a/attribute-detector';
import { PROMPT_TYPE_REGISTRY } from '@/data/prompt-types';

// ────────────────────────────────────────────────────────────────────────────
// Test infrastructure
// ────────────────────────────────────────────────────────────────────────────

const normalizer = new Normalizer();
const scorer = new TypeScorer();
const extractor = new EntityExtractor();
const detector = new AttributeDetector();

interface DatasetCase {
  /** The raw user prompt. */
  prompt: string;
  /** Expected primary type classification. */
  expectedType: string;
  /** Expected intent (optional — only checked when specified). */
  expectedIntent?: string;
  /** Expected topic substring (case-insensitive contains check). */
  expectedTopicContains?: string;
  /** Expected attributes that should be inferred. */
  expectedAttributes?: Partial<{
    nivel: string;
    formato: string;
    tono: string;
    longitud: string;
  }>;
  /** If true, expect inputContent flag to be set. */
  expectInputContent?: boolean;
}

/**
 * Run the classification pipeline for a single prompt.
 * Uses TypeScorer (keyword-based) since ONNX isn't available in Jest.
 */
async function classifyPrompt(prompt: string) {
  const normalized = normalizer.normalize(prompt);
  const result = scorer.scoreTypes(normalized, PROMPT_TYPE_REGISTRY);
  const typeId = result.topType?.id ?? 'desconocido';
  const confidence = result.scores[typeId] ?? 0;

  // Intent: use the best-matching intent from the top type
  let intentId = 'desconocido';
  if (result.topType) {
    const lower = normalized.toLowerCase();
    let bestScore = 0;
    for (const intent of result.topType.intents) {
      const labelLower = intent.label.toLowerCase();
      const labelWords = new Set(labelLower.split(/\s+/));
      const textWords = new Set(lower.split(/\s+/));
      let overlap = 0;
      for (const w of labelWords) {
        if (w.length > 2 && textWords.has(w)) overlap++;
      }
      if (lower.includes(labelLower)) overlap += 3;
      if (overlap > bestScore) {
        bestScore = overlap;
        intentId = intent.id;
      }
    }
    if (bestScore === 0) intentId = result.topType.intents[0]?.id ?? 'desconocido';
  }

  const entities = await extractor.extract(normalized, typeId);
  const attributes = await detector.detectAttributes(normalized, typeId, intentId);

  return {
    normalized,
    typeId,
    intentId,
    confidence,
    allScores: result.scores,
    ambiguity: result.ambiguityScore,
    topic: entities.topic,
    context: entities.context,
    target: entities.target,
    inputContent: entities.inputContent,
    attributes,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Dataset: Every prompt with expected ground-truth
// ────────────────────────────────────────────────────────────────────────────

const DATASET: DatasetCase[] = [
  // ── GENERACION (ensayos, cuentos, poemas, artículos) ────────────────────
  {
    prompt: 'crea un ensayo del uso de Inteligencia Artificial',
    expectedType: 'generacion',
    expectedTopicContains: 'inteligencia artificial',
  },
  {
    prompt: 'crea un cuento corto sobre un robot',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
    expectedTopicContains: 'robot',
  },
  {
    prompt: 'crea una historia sobre amistad',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
    expectedTopicContains: 'amistad',
  },
  {
    prompt: 'escribe un ensayo sobre el cambio climático',
    expectedType: 'generacion',
    expectedTopicContains: 'cambio climático',
  },
  {
    prompt: 'crea un poema sobre la naturaleza',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
    expectedTopicContains: 'naturaleza',
  },
  {
    prompt: 'escribe una historia de ciencia ficción',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
    expectedTopicContains: 'ciencia ficción',
  },
  {
    prompt: 'crea un diálogo entre dos personajes',
    expectedType: 'generacion',
    expectedTopicContains: 'diálogo',
  },
  {
    prompt: 'escribe un artículo sobre tecnología',
    expectedType: 'generacion',
    expectedTopicContains: 'tecnología',
  },
  {
    prompt: 'crea una fábula con moraleja',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
  },
  {
    prompt: 'escribe una historia infantil',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
  },
  {
    prompt: 'crea una narrativa sobre un viaje',
    expectedType: 'generacion',
    expectedIntent: 'texto_creativo',
    expectedTopicContains: 'viaje',
  },

  // ── INFORMACION (explicaciones puras) ───────────────────────────────────
  {
    prompt: 'explica la revolución industrial',
    expectedType: 'informacion',
    expectedTopicContains: 'revolución industrial',
  },
  {
    prompt: 'explica el algebra lineal para principiantes',
    expectedType: 'informacion',
    expectedTopicContains: 'algebra lineal',
    expectedAttributes: { nivel: 'basico' },
  },
  {
    prompt: 'explica qué es la inteligencia artificial de forma sencilla',
    expectedType: 'informacion',
    expectedIntent: 'definicion',
    expectedTopicContains: 'inteligencia artificial',
  },
  {
    prompt: 'explica la fotosíntesis paso a paso',
    expectedType: 'informacion',
    expectedTopicContains: 'fotosíntesis',
  },
  {
    prompt: 'explica la teoría de la relatividad en términos simples',
    expectedType: 'informacion',
    expectedTopicContains: 'relatividad',
  },
  {
    prompt: 'explica qué es una base de datos',
    expectedType: 'informacion',
    expectedIntent: 'definicion',
    expectedTopicContains: 'base de datos',
  },
  {
    prompt: 'explica cómo funciona internet',
    expectedType: 'informacion',
    expectedTopicContains: 'internet',
  },
  {
    prompt: 'explica la historia de Colombia de forma resumida',
    expectedType: 'informacion',
    expectedTopicContains: 'colombia',
  },
  {
    prompt: 'explica qué es el cambio climático',
    expectedType: 'informacion',
    expectedIntent: 'definicion',
    expectedTopicContains: 'cambio climático',
  },
  {
    prompt: 'explica la evolución humana',
    expectedType: 'informacion',
    expectedTopicContains: 'evolución humana',
  },
  {
    prompt: 'explica la economía básica para principiantes',
    expectedType: 'informacion',
    expectedTopicContains: 'economía',
    expectedAttributes: { nivel: 'basico' },
  },
  {
    prompt: 'explica qué es el blockchain',
    expectedType: 'informacion',
    expectedIntent: 'definicion',
    expectedTopicContains: 'blockchain',
  },

  // ── TRANSFORMACION — resúmenes ──────────────────────────────────────────
  {
    prompt: 'resume el cuento del principito',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectedTopicContains: 'principito',
  },
  {
    prompt: 'resume esto El Tigrillo Desobediente: Milo, un pequeño tigre curioso, ignora los consejos de su madre y se aleja mucho. Tras caer a un arroyo persiguiendo una mariposa, su madre lo rescata. Milo aprende que obedecer es necesario para su seguridad, sin perder su espíritu aventurero.',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume este texto sobre energías renovables',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume el siguiente párrafo sobre la segunda guerra mundial',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume este artículo sobre tecnología',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume este texto en 3 líneas',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume el siguiente contenido de forma clara',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume este documento destacando ideas clave',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume esta historia infantil',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
  },
  {
    prompt: 'resume este texto académico',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },
  {
    prompt: 'resume este contenido en viñetas',
    expectedType: 'transformacion',
    expectedIntent: 'resumen',
    expectInputContent: true,
  },

  // ── TRANSFORMACION — mejora/reescritura ─────────────────────────────────
  {
    prompt: 'mejora este texto para que suene más profesional',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora la redacción de este párrafo',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora este ensayo haciéndolo más claro',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'reescribe este texto de forma más formal',
    expectedType: 'transformacion',
    expectedAttributes: { tono: 'formal' },
    expectInputContent: true,
  },
  {
    prompt: 'reescribe este contenido de forma sencilla',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora este cuento que hice El Rinoceronte y el Oso: Un rinoceronte gruñón no compartía su huerta hasta que un oso hambriento le roba. En lugar de pelear, el rinoceronte le ofrece trabajo, aprendiendo el valor de la generosidad y el trabajo en equipo.',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora este cuento agregando más detalles',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'corrige la gramática de este texto',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora este mensaje para que sea más persuasivo',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'reescribe este texto para niños',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'mejora este contenido haciéndolo más conciso',
    expectedType: 'transformacion',
    expectInputContent: true,
  },

  // ── TRANSFORMACION — conversión de formato ──────────────────────────────
  {
    prompt: 'convierte este texto en lista',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'convierte este párrafo en viñetas',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'transforma este texto en tabla',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'organiza esta información en puntos clave',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'estructura este contenido en secciones',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'convierte este texto en resumen ejecutivo',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'transforma este contenido en esquema',
    expectedType: 'transformacion',
    expectInputContent: true,
  },
  {
    prompt: 'convierte este texto en preguntas y respuestas',
    expectedType: 'transformacion',
    expectInputContent: true,
  },

  // ── ANALISIS ────────────────────────────────────────────────────────────
  {
    prompt: 'clasifica este texto por tema',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'identifica la intención de este prompt',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'analiza el sentimiento de este texto',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'detecta el idioma del siguiente contenido',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'clasifica este contenido como formal o informal',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'identifica las ideas principales del texto',
    expectedType: 'analisis',
    expectInputContent: true,
  },
  {
    prompt: 'analiza la estructura de este contenido',
    expectedType: 'analisis',
    expectInputContent: true,
  },

  // ── ACCION (tutoriales, paso a paso, instrucciones) ─────────────────────
  {
    prompt: 'explica cómo hacer un ensayo paso a paso',
    expectedType: 'accion',
    expectedTopicContains: 'ensayo',
  },
  {
    prompt: 'explica cómo programar en python',
    expectedType: 'accion',
    expectedTopicContains: 'programar',
  },
  {
    prompt: 'describe cómo hacer una presentación',
    expectedType: 'accion',
    expectedTopicContains: 'presentación',
  },
  {
    prompt: 'da instrucciones para escribir un cuento',
    expectedType: 'accion',
    expectedTopicContains: 'cuento',
  },
  {
    prompt: 'explica cómo estudiar mejor',
    expectedType: 'accion',
    expectedTopicContains: 'estudiar',
  },
  {
    prompt: 'describe cómo crear un proyecto de investigación',
    expectedType: 'accion',
    expectedTopicContains: 'proyecto',
  },
  {
    prompt: 'explica cómo mejorar la escritura',
    expectedType: 'accion',
    expectedTopicContains: 'escritura',
  },
  {
    prompt: 'da consejos para aprender matemáticas',
    expectedType: 'accion',
    expectedTopicContains: 'matemáticas',
  },
  {
    prompt: 'explica cómo hacer un resumen efectivo',
    expectedType: 'accion',
    expectedTopicContains: 'resumen',
  },
  {
    prompt: 'describe cómo organizar ideas',
    expectedType: 'accion',
    expectedTopicContains: 'ideas',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Test execution
// ────────────────────────────────────────────────────────────────────────────

describe('Dataset Accuracy — Type Classification', () => {
  // Group by expected type for readable output
  const byType = new Map<string, DatasetCase[]>();
  for (const c of DATASET) {
    const group = byType.get(c.expectedType) ?? [];
    group.push(c);
    byType.set(c.expectedType, group);
  }

  for (const [type, cases] of byType) {
    describe(`type: ${type}`, () => {
      for (const tc of cases) {
        const shortPrompt = tc.prompt.length > 60
          ? tc.prompt.substring(0, 57) + '...'
          : tc.prompt;

        it(`"${shortPrompt}" → ${type}`, async () => {
          const result = await classifyPrompt(tc.prompt);

          // Core assertion: correct type
          expect(result.typeId).toBe(tc.expectedType);
        });
      }
    });
  }
});

describe('Dataset Accuracy — Intent Classification', () => {
  const casesWithIntent = DATASET.filter((c) => c.expectedIntent);

  for (const tc of casesWithIntent) {
    const shortPrompt = tc.prompt.length > 60
      ? tc.prompt.substring(0, 57) + '...'
      : tc.prompt;

    it(`"${shortPrompt}" → intent=${tc.expectedIntent}`, async () => {
      const result = await classifyPrompt(tc.prompt);
      expect(result.intentId).toBe(tc.expectedIntent);
    });
  }
});

describe('Dataset Accuracy — Topic Extraction', () => {
  const casesWithTopic = DATASET.filter((c) => c.expectedTopicContains);

  for (const tc of casesWithTopic) {
    const shortPrompt = tc.prompt.length > 60
      ? tc.prompt.substring(0, 57) + '...'
      : tc.prompt;

    it(`"${shortPrompt}" → topic contains "${tc.expectedTopicContains}"`, async () => {
      const result = await classifyPrompt(tc.prompt);
      expect(result.topic).toBeDefined();
      expect(result.topic!.toLowerCase()).toContain(
        tc.expectedTopicContains!.toLowerCase(),
      );
    });
  }
});

describe('Dataset Accuracy — Attribute Inference', () => {
  const casesWithAttrs = DATASET.filter((c) => c.expectedAttributes);

  for (const tc of casesWithAttrs) {
    const shortPrompt = tc.prompt.length > 60
      ? tc.prompt.substring(0, 57) + '...'
      : tc.prompt;

    it(`"${shortPrompt}" → attrs ${JSON.stringify(tc.expectedAttributes)}`, async () => {
      const result = await classifyPrompt(tc.prompt);

      if (tc.expectedAttributes!.nivel) {
        expect(result.attributes.nivel).toBe(tc.expectedAttributes!.nivel);
      }
      if (tc.expectedAttributes!.formato) {
        expect(result.attributes.formato).toBe(tc.expectedAttributes!.formato);
      }
      if (tc.expectedAttributes!.tono) {
        expect(result.attributes.tono).toBe(tc.expectedAttributes!.tono);
      }
      if (tc.expectedAttributes!.longitud) {
        expect(result.attributes.longitud).toBe(tc.expectedAttributes!.longitud);
      }
    });
  }
});

describe('Dataset Accuracy — InputContent Detection', () => {
  const casesWithInput = DATASET.filter((c) => c.expectInputContent);

  for (const tc of casesWithInput) {
    const shortPrompt = tc.prompt.length > 60
      ? tc.prompt.substring(0, 57) + '...'
      : tc.prompt;

    it(`"${shortPrompt}" → inputContent=true`, async () => {
      const result = await classifyPrompt(tc.prompt);
      expect(result.inputContent).toBe(true);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Aggregate accuracy report
// ────────────────────────────────────────────────────────────────────────────

describe('Dataset Accuracy — Aggregate Report', () => {
  it('overall type accuracy should be >= 85%', async () => {
    let correct = 0;
    let total = 0;
    const failures: string[] = [];

    for (const tc of DATASET) {
      total++;
      const result = await classifyPrompt(tc.prompt);
      if (result.typeId === tc.expectedType) {
        correct++;
      } else {
        failures.push(
          `  ✗ "${tc.prompt.substring(0, 50)}..." → got "${result.typeId}" (expected "${tc.expectedType}") scores=${JSON.stringify(result.allScores)}`,
        );
      }
    }

    const accuracy = correct / total;
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  TYPE ACCURACY: ${correct}/${total} (${(accuracy * 100).toFixed(1)}%)`);
    console.log(`${'═'.repeat(70)}`);
    if (failures.length > 0) {
      console.log(`\n  FAILURES (${failures.length}):`);
      for (const f of failures) console.log(f);
    }
    console.log('');

    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });

  it('topic extraction accuracy should be >= 80%', async () => {
    const casesWithTopic = DATASET.filter((c) => c.expectedTopicContains);
    let correct = 0;
    const failures: string[] = [];

    for (const tc of casesWithTopic) {
      const result = await classifyPrompt(tc.prompt);
      if (
        result.topic &&
        result.topic.toLowerCase().includes(tc.expectedTopicContains!.toLowerCase())
      ) {
        correct++;
      } else {
        failures.push(
          `  ✗ "${tc.prompt.substring(0, 50)}..." → topic="${result.topic}" (expected contains "${tc.expectedTopicContains}")`,
        );
      }
    }

    const accuracy = correct / casesWithTopic.length;
    console.log(`  TOPIC ACCURACY: ${correct}/${casesWithTopic.length} (${(accuracy * 100).toFixed(1)}%)`);
    if (failures.length > 0) {
      console.log(`  FAILURES (${failures.length}):`);
      for (const f of failures) console.log(f);
    }
    console.log('');

    expect(accuracy).toBeGreaterThanOrEqual(0.80);
  });
});
