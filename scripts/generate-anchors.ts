import { pipeline, env } from '@xenova/transformers';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  TYPE_ANCHORS,
  INTENT_ANCHORS,
  ATTRIBUTE_ANCHORS,
  DOMAIN_ANCHORS,
  AUDIENCE_ANCHORS,
} from '../src/data/anchor-definitions.ts';
import { TEMPLATE_REGISTRY } from '../src/pipeline/layer-c/templates/index.ts';

function cleanTemplate(template: string): string {
  let clean = template.replace(/\{\{#if[^}]+\}\}/g, ' ');
  clean = clean.replace(/\{\{\/if\}\}/g, ' ');
  clean = clean.replace(/\{\{else\}\}/g, ' ');
  clean = clean.replace(/\{\{[^}]+\}\}/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gets embeddings for a batch of phrases efficiently.
 */
async function getEmbeddingsBatch(
  model: any,
  phrases: string[],
  batchSize: number = 16
): Promise<Float32Array[]> {
  const allEmbeddings: Float32Array[] = [];
  
  for (let i = 0; i < phrases.length; i += batchSize) {
    const chunk = phrases.slice(i, i + batchSize);
    const prefixed = chunk.map(p => `passage: ${p}`);
    const output = await model(prefixed, { pooling: 'mean', normalize: true });
    
    const dim = output.dims[1];
    const numVectors = output.dims[0];
    
    for (let j = 0; j < numVectors; j++) {
      const offset = j * dim;
      allEmbeddings.push(new Float32Array(output.data.slice(offset, offset + dim)));
    }
  }
  
  return allEmbeddings;
}

/**
 * Averages embeddings for a set of phrases using batching.
 */
async function averageEmbeddings(
  model: any,
  phrases: string[]
): Promise<number[]> {
  if (phrases.length === 0) return [];
  
  const embeddings = await getEmbeddingsBatch(model, phrases);
  const dim = embeddings[0].length;
  const sum = new Float32Array(dim);
  
  for (const vec of embeddings) {
    for (let i = 0; i < dim; i++) {
      sum[i] += vec[i];
    }
  }

  const avg = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    avg[i] = sum[i] / phrases.length;
  }

  // Re-normalize the average vector
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += avg[i] * avg[i];
  }
  norm = Math.sqrt(norm);
  
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      avg[i] = avg[i] / norm;
    }
  }

  return Array.from(avg);
}

async function main() {
  const modelId = process.env.MODEL_ID || 'multilingual-e5-small';
  env.localModelPath = resolve(__dirname, '../models');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;

  console.log(`\n🚀 Iniciando generación de embeddings...`);
  console.log(`📦 Modelo: ${modelId}`);
  console.log(`📂 Ruta: ${env.localModelPath}`);

  const startTime = performance.now();

  console.log('\n⏳ Cargando modelo...');
  const model = await pipeline('feature-extraction', modelId, {
    local_files_only: true,
  });
  console.log('✅ Modelo cargado.');

  const result = {
    types: {} as Record<string, number[]>,
    intents: {} as Record<string, number[]>,
    attributes: {} as Record<string, number[]>,
    domains: {} as Record<string, number[]>,
    audience: {} as Record<string, number[]>,
    templates: {} as Record<string, Record<string, number[]>>,
  };

  const processCategory = async (name: string, anchors: Record<string, string[]>, target: Record<string, number[]>) => {
    console.log(`\n🧠 Procesando ${name}...`);
    const entries = Object.entries(anchors);
    let count = 0;
    for (const [key, phrases] of entries) {
      target[key] = await averageEmbeddings(model, phrases);
      count++;
      process.stdout.write(`\r   Progreso: ${count}/${entries.length} (${key})`.padEnd(60));
    }
    console.log(`\n✅ ${name} completado.`);
  };

  await processCategory('Tipos', TYPE_ANCHORS, result.types);
  await processCategory('Intents', INTENT_ANCHORS, result.intents);
  await processCategory('Atributos', ATTRIBUTE_ANCHORS, result.attributes);
  await processCategory('Dominios', DOMAIN_ANCHORS, result.domains);
  await processCategory('Audiencia', AUDIENCE_ANCHORS, result.audience);

  console.log('\n🧠 Procesando Templates...');
  let templateCount = 0;
  const totalTemplates = Object.values(TEMPLATE_REGISTRY).reduce((acc, curr) => acc + Object.keys(curr).length, 0);
  
  for (const [typeId, intents] of Object.entries(TEMPLATE_REGISTRY)) {
    result.templates[typeId] = {};
    for (const [intentId, template] of Object.entries(intents)) {
      const cleaned = cleanTemplate(template);
      result.templates[typeId][intentId] = await averageEmbeddings(model, [cleaned]);
      templateCount++;
      process.stdout.write(`\r   Progreso: ${templateCount}/${totalTemplates} (${typeId}.${intentId})`.padEnd(60));
    }
  }
  console.log('\n✅ Templates completados.');

  const outputPath = resolve(__dirname, '../src/data/anchor-embeddings.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n✨ ¡Éxito! Embeddings guardados en: ${outputPath}`);
  console.log(`⏱️  Tiempo total: ${duration} segundos\n`);
}

main().catch((err) => {
  console.error('\n❌ Error generando anchors:', err);
  process.exit(1);
});
