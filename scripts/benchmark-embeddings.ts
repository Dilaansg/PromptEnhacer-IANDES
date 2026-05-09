import { pipeline, env } from '@xenova/transformers';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

env.localModelPath = resolve(__dirname, '../models');
env.allowRemoteModels = false;
env.allowLocalModels = true;

async function main() {
  console.log('Cargando modelo...');
  const model = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
    local_files_only: true,
  });
  console.log('Modelo cargado. Iniciando benchmark...\n');

  const testPhrases = [
    'explicame qué es la fotosíntesis',
    'escribe un poema sobre la lluvia',
    'debug este código javascript',
    'analiza los pros y contras',
    'resume este artículo',
  ];

  // Warmup
  for (const phrase of testPhrases) {
    await model(phrase, { pooling: 'mean', normalize: true });
  }

  const times: number[] = [];
  const runs = 10;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    for (const phrase of testPhrases) {
      await model(phrase, { pooling: 'mean', normalize: true });
    }
    const end = performance.now();
    times.push(end - start);
  }

  const avgTotal = times.reduce((a, b) => a + b, 0) / times.length;
  const avgPerPhrase = avgTotal / testPhrases.length;
  const minPerPhrase = Math.min(...times) / testPhrases.length;
  const maxPerPhrase = Math.max(...times) / testPhrases.length;

  console.log(`Resultados del benchmark (${runs} runs, ${testPhrases.length} frases por run):`);
  console.log(`  Tiempo total promedio: ${avgTotal.toFixed(2)} ms`);
  console.log(`  Tiempo por frase (avg): ${avgPerPhrase.toFixed(2)} ms`);
  console.log(`  Tiempo por frase (min): ${minPerPhrase.toFixed(2)} ms`);
  console.log(`  Tiempo por frase (max): ${maxPerPhrase.toFixed(2)} ms`);
  console.log(`  Target <200ms por clasificación: ${avgPerPhrase < 200 ? 'PASS' : 'FAIL'}`);
}

main().catch((err) => {
  console.error('Error en benchmark:', err);
  process.exit(1);
});
