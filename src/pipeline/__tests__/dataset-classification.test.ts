/**
 * Dataset classification accuracy test.
 * Runs all DATASET_PROMPTS.json through TypeScorer and validates expected types.
 */
import { TypeScorer } from '@pipeline/layer-a/scorer';
import { PROMPT_TYPE_REGISTRY } from '@/data/prompt-types';
import { Normalizer } from '@pipeline/layer-a/normalizer';
import * as fs from 'fs';
import * as path from 'path';

const datasetPath = path.resolve(__dirname, '../../../DATASET_PROMPTS.json');
const dataset: Array<{ prompt: string }> = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

const scorer = new TypeScorer();
const normalizer = new Normalizer();

// Expected types by dataset index
const EXPECTED: Record<number, string> = {
  0: 'generacion',
  1: 'informacion',
  2: 'transformacion',
  3: 'transformacion',
  4: 'transformacion',
  5: 'informacion',
  6: 'informacion',
  7: 'informacion',
  8: 'informacion',
  9: 'informacion',
  10: 'informacion',
  11: 'informacion',
  12: 'informacion',
  13: 'informacion',
  14: 'informacion',
  15: 'informacion',
  16: 'transformacion',
  17: 'transformacion',
  18: 'transformacion',
  19: 'transformacion',
  20: 'transformacion',
  21: 'transformacion',
  22: 'transformacion',
  23: 'transformacion',
  24: 'transformacion',
  25: 'transformacion',
  26: 'transformacion',
  27: 'transformacion',
  28: 'transformacion',   // reescribe → transformacion (fixed: no longer triggers generacion's "escribe")
  29: 'transformacion',   // reescribe → transformacion
  33: 'transformacion',   // reescribe → transformacion
  61: 'accion',           // "explica cómo programar" → accion (cómo programar is strong trigger)
  64: 'accion',           // "explica cómo estudiar" → accion (cómo estudiar is strong trigger)
  65: 'accion',           // "describe cómo crear" → accion (describe cómo is strong trigger)
  66: 'accion',           // "explica cómo mejorar" → accion (cómo mejorar is strong trigger)
  68: 'accion',           // "explica cómo hacer un resumen" → accion (cómo hacer is strong trigger)
  69: 'accion',
  70: 'accion',
  71: 'accion',
};

describe('Dataset Classification Accuracy', () => {
  const mismatches: string[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const prompt = (dataset[i] as { prompt: string }).prompt;
    const expType = EXPECTED[i];

    test(`[${i}] "${prompt}" → ${expType ?? '?'}`, () => {
      const norm = normalizer.normalize(prompt);
      const result = scorer.scoreTypes(norm, PROMPT_TYPE_REGISTRY);
      const classified = result.topType?.id ?? 'desconocido';

      if (expType && classified !== expType) {
        // Report detailed mismatch
        const scores = Object.entries(result.scores)
          .filter(([, v]) => (v as number) > 0)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k}:${(v as number).toFixed(2)}`)
          .join(' | ');
        mismatches.push(`[${i}] "${prompt}" expected=${expType} got=${classified} scores=[${scores}]`);
      }

      if (expType) {
        expect(classified).toBe(expType);
      }
    });
  }

  afterAll(() => {
    if (mismatches.length > 0) {
      console.log(`\n❌ ${mismatches.length} MISMATCHES:`);
      mismatches.forEach((m) => console.log(m));
    } else {
      console.log('\n✅ All classified correctly!');
    }
  });
});
