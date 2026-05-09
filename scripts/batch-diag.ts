/**
 * Batch diagnostics for DATASET_PROMPTS.json
 * Runs all prompts through LayerA TypeScorer and reports classification.
 */
import { TypeScorer } from '../src/pipeline/layer-a/scorer';
import { AttributeDetector } from '../src/pipeline/layer-a/attribute-detector';
import { EntityExtractor } from '../src/pipeline/layer-a/entity-extractor';
import { Normalizer } from '../src/pipeline/layer-a/normalizer';
import { PROMPT_TYPE_REGISTRY } from '../src/data/prompt-types';
import dataset from '../DATASET_PROMPTS.json';

const scorer = new TypeScorer();
const detector = new AttributeDetector();
const extractor = new EntityExtractor();
const normalizer = new Normalizer();

interface DiagResult {
  idx: number;
  prompt: string;
  classifiedType: string;
  classifiedIntent: string;
  score: number;
  altTypes: string[];
  expectedType: string;
  mismatch: boolean;
  extractedTopic: string;
  inferredAttrs: string[];
}

async function diagnose(): Promise<DiagResult[]> {
  const results: DiagResult[] = [];

  // Expected types for each prompt (manual annotation)
  const expected: Record<number, string> = {
    0: 'generacion',     // crea un ensayo
    1: 'informacion',    // explica la revolución
    2: 'transformacion', // resume el cuento
    3: 'transformacion', // resume esto (paste)
    4: 'transformacion', // mejora este cuento
    5: 'informacion',    // explica el algebra
    6: 'informacion',    // explica qué es la IA
    7: 'informacion',    // explica la fotosíntesis
    8: 'informacion',    // explica la teoría
    9: 'informacion',    // explica qué es una BD
    10: 'informacion',   // explica cómo funciona
    11: 'informacion',   // explica la historia
    12: 'informacion',   // explica qué es el cambio
    13: 'informacion',   // explica la evolución
    14: 'informacion',   // explica la economía
    15: 'informacion',   // explica qué es el blockchain
    16: 'transformacion',// resume este texto
    17: 'transformacion',// resume el siguiente
    18: 'transformacion',// resume este artículo
    19: 'transformacion',// resume este texto en 3 líneas
    20: 'transformacion',// resume el siguiente
    21: 'transformacion',// resume este documento
    22: 'transformacion',// resume esta historia
    23: 'transformacion',// resume este texto académico
    24: 'transformacion',// resume este contenido
    25: 'transformacion',// mejora este texto
    26: 'transformacion',// mejora la redacción
    27: 'transformacion',// mejora este ensayo
    28: 'transformacion',// reescribe este texto
    29: 'transformacion',// reescribe este contenido
    30: 'transformacion',// mejora este cuento
    31: 'transformacion',// corrige la gramática
    32: 'transformacion',// mejora este mensaje
    33: 'transformacion',// reescribe este texto para niños
    34: 'transformacion',// mejora este contenido
    35: 'generacion',    // crea un cuento
    36: 'generacion',    // crea una historia
    37: 'generacion',    // escribe un ensayo
    38: 'generacion',    // crea un poema
    39: 'generacion',    // escribe una historia
    40: 'generacion',    // crea un diálogo
    41: 'generacion',    // escribe un artículo
    42: 'generacion',    // crea una fábula
    43: 'generacion',    // escribe una historia infantil
    44: 'generacion',    // crea una narrativa
    45: 'transformacion',// convierte este texto
    46: 'transformacion',// convierte este párrafo
    47: 'transformacion',// transforma este texto
    48: 'transformacion',// organiza esta información
    49: 'transformacion',// estructura este contenido
    50: 'transformacion',// convierte este texto en resumen
    51: 'transformacion',// transforma este contenido
    52: 'transformacion',// convierte este texto
    53: 'analisis',      // clasifica este texto
    54: 'analisis',      // identifica la intención
    55: 'analisis',      // analiza el sentimiento
    56: 'analisis',      // detecta el idioma
    57: 'analisis',      // clasifica este contenido
    58: 'analisis',      // identifica las ideas
    59: 'analisis',      // analiza la estructura
    60: 'accion',        // explica cómo hacer un ensayo
    61: 'accion',        // explica cómo programar
    62: 'accion',        // describe cómo hacer
    63: 'accion',        // da instrucciones
    64: 'accion',        // explica cómo estudiar
    65: 'accion',        // describe cómo crear
    66: 'accion',        // explica cómo mejorar
    67: 'accion',        // da consejos
    68: 'accion',        // explica cómo hacer un resumen
    69: 'accion',        // describe cómo organizar
    70: 'accion',        // (last prompt)
    71: 'accion',        // (last prompt)
  };

  for (let i = 0; i < dataset.length; i++) {
    const prompt = (dataset[i] as { prompt: string }).prompt;
    const norm = normalizer.normalize(prompt);
    const score = scorer.scoreTypes(norm, PROMPT_TYPE_REGISTRY);
    const entities = await extractor.extract(norm, score.topType?.id ?? 'desconocido');
    const attrs = await detector.detectAttributes(norm, score.topType?.id, score.topType?.intents?.[0]?.id);

    const classifiedType = score.topType?.id ?? 'desconocido';
    const classifiedIntent = score.topType?.intents?.[0]?.id ?? 'desconocido';
    const typeScore = score.scores[classifiedType] ?? 0;

    // Alt types with score > 0.2
    const altTypes = Object.entries(score.scores)
      .filter(([id, s]) => id !== classifiedType && s > 0.2)
      .sort(([, a], [, b]) => b - a)
      .map(([id, s]) => `${id}:${s.toFixed(2)}`);

    const expType = expected[i] ?? '?';
    const mismatch = expType !== '?' && classifiedType !== expType;

    // Inferred attributes
    const inferredAttrs: string[] = [];
    if (attrs.nivel) inferredAttrs.push(`nivel=${attrs.nivel}`);
    if (attrs.formato) inferredAttrs.push(`formato=${attrs.formato}`);
    if (attrs.tono) inferredAttrs.push(`tono=${attrs.tono}`);
    if (attrs.longitud) inferredAttrs.push(`longitud=${attrs.longitud}`);

    results.push({
      idx: i,
      prompt,
      classifiedType,
      classifiedIntent,
      score: typeScore,
      altTypes,
      expectedType: expType,
      mismatch,
      extractedTopic: entities.topic ?? '(none)',
      inferredAttrs,
    });
  }

  return results;
}

diagnose().then((results) => {
  const mismatches = results.filter((r) => r.mismatch);
  const correct = results.filter((r) => !r.mismatch && r.expectedType !== '?');

  console.log(`\n=== DATASET DIAGNOSIS: ${results.length} prompts ===`);
  console.log(`Correct: ${correct.length} | Mismatched: ${mismatches.length} | Unannotated: ${results.length - correct.length - mismatches.length}`);
  console.log(`Accuracy: ${((correct.length / (correct.length + mismatches.length)) * 100).toFixed(1)}%\n`);

  if (mismatches.length > 0) {
    console.log('--- MISMATCHES ---');
    for (const m of mismatches) {
      console.log(`[${m.idx}] "${m.prompt}"`);
      console.log(`     Expected: ${m.expectedType} | Got: ${m.classifiedType}/${m.classifiedIntent} (score:${m.score.toFixed(3)})`);
      if (m.altTypes.length > 0) console.log(`     Alt: ${m.altTypes.join(', ')}`);
      console.log(`     Topic: ${m.extractedTopic} | Attrs: ${m.inferredAttrs.join(', ') || 'none'}`);
    }
  }

  // Show first 5 correct for reference
  console.log('\n--- SAMPLE CORRECT ---');
  for (const r of correct.slice(0, 5)) {
    console.log(`[${r.idx}] "${r.prompt}" → ${r.classifiedType}/${r.classifiedIntent}`);
  }
});
