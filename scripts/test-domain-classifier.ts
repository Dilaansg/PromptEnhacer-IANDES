import { pipeline, env } from '@xenova/transformers';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

class Normalizer {
  normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

const normalizer = new Normalizer();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const anchorEmbeddings = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../src/data/anchor-embeddings.json'), 'utf8')
);

const DOMAIN_CONFIDENCE_THRESHOLD = 0.30;

function cosineSimilarity(v1: number[] | Float32Array, v2: number[] | Float32Array): number {
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function classify(model: any, input: string, anchors: Record<string, number[]>): Promise<any> {
  const output = await model(input, { pooling: 'mean', normalize: true });
  const inputVec = output.data;

  let bestId = '';
  let maxScore = -1;

  const firstVec = Object.values(anchors)[0];
  if (inputVec.length !== firstVec.length) {
    console.warn(`Vector length mismatch: input ${inputVec.length} vs anchor ${firstVec.length}`);
  }

  const allScores: Record<string, number> = {};
  for (const [id, vec] of Object.entries(anchors)) {
    const score = cosineSimilarity(inputVec, vec);
    allScores[id] = score;
    if (score > maxScore) {
      maxScore = score;
      bestId = id;
    }
  }

  return { id: bestId, confidence: maxScore, allScores };
}

const testCases = [
  { input: "qué es el síndrome del impostor", expected: "psicologia" },
  { input: "explícame la regresión lineal", expected: "matematicas" },
  { input: "cómo funciona la fotosíntesis", expected: "biologia" },
  { input: "qué fue la revolución francesa", expected: "historia" },
  { input: "explícame la teoría de la relatividad", expected: "fisica" },
  { input: "qué es la inflación", expected: "economia" },
  { input: "cómo estructuro mi tesis", expected: "academico" },
  { input: "cuáles son los tipos de interés", expected: "economia" },
  { input: "explicame algebra lineal para niños", expected: "matematicas" },
  { input: "hola cómo estás", expected: undefined },
];

async function main() {
  env.localModelPath = resolve(__dirname, '../models');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;

  const model = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
    local_files_only: true,
  });

  const domains = anchorEmbeddings.domains;

  console.log('--- CENTROID SIMILARITIES ---');
  const dKeys = ['historia', 'filosofia', 'matematicas', 'fisica'];
  for (let i = 0; i < dKeys.length; i++) {
    for (let j = i + 1; j < dKeys.length; j++) {
      const sim = cosineSimilarity(domains[dKeys[i]], domains[dKeys[j]]);
      console.log(`${dKeys[i]} vs ${dKeys[j]}: ${sim.toFixed(4)}`);
    }
  }

  console.log('\n--- TEST RESULTS ---');
  for (const test of testCases) {
    const norm = normalizer.normalize(test.input);
    const result = await classify(model, norm, domains);
    const accepted = result.confidence >= DOMAIN_CONFIDENCE_THRESHOLD;
    const finalDomain = accepted ? result.id : undefined;

    console.log(`Input: "${test.input}"`);
    console.log(`  Detected: ${result.id} (conf: ${result.confidence.toFixed(4)})`);
    console.log(`  All Scores:`, Object.entries(result.allScores as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, s]) => `${id}: ${s.toFixed(4)}`)
      .join(', ')
    );
    console.log(`  Accepted: ${accepted}`);
    console.log(`  Final Domain: ${finalDomain}`);
    console.log(`  Pass: ${finalDomain === test.expected}`);
    console.log('--------------------');
  }
}

main().catch(console.error);
