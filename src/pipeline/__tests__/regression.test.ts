import { LayerA } from '../layer-a';
import { LayerB } from '../layer-b';
import { LayerC } from '../layer-c';
import { LayerCOutput } from '@shared/types';

async function runPipeline(input: string): Promise<LayerCOutput> {
  const layerA = new LayerA();
  const layerB = new LayerB();
  const layerC = new LayerC();

  const layerAOutput = await layerA.process(input);
  const questions = layerB.selectQuestions(layerAOutput);
  // Skip user questioning for regression tests — use empty answers
  const layerBOutput = layerB.buildOutput(layerAOutput, {}, questions);
  return layerC.generate(layerBOutput);
}

describe('Regression — casos de fallo documentados', () => {
  test('regresion lineal → topic limpio, intent = definicion', async () => {
    const output = await new LayerA().process('explicame que es la regresión linear');
    expect(output.entities.topic).toBe('regresión linear');
    expect(output.primary.intent).toBe('definicion');
    expect(output.primary.typeId).toBe('informacion');
  });

  test('sindrome del impostor → dominio psicologia detectado', async () => {
    const output = await new LayerA().process('qué es el síndrome del impostor?');
    expect(output.entities.topic).not.toMatch(/^el /i); // sin artículo inicial
    expect(output.primary.domain).toBe('psicologia');
  });

  test('super prompt final no contiene variables sin resolver', async () => {
    const result = await runPipeline('qué es el síndrome del impostor?');
    expect(result.superPrompt).not.toMatch(/\{\{.*?\}\}/);
  });
});

describe('Regression — cobertura por tipo de prompt', () => {
  const cases: Array<{ type: string; inputs: string[] }> = [
    {
      type: 'informacion',
      inputs: [
        'explicame que es la regresión linear',
        'qué es el síndrome del impostor?',
      ],
    },
    {
      type: 'generacion',
      inputs: [
        'escribe un poema sobre la lluvia',
        'crea un ensayo académico sobre economía',
      ],
    },
    {
      type: 'codigo',
      inputs: [
        'escribe una función en python que ordene una lista',
        'debug este código javascript',
      ],
    },
    {
      type: 'analisis',
      inputs: [
        'analiza este texto',
        'compara react con angular',
      ],
    },
    {
      type: 'transformacion',
      inputs: [
        'resume este artículo',
        'traduce al inglés',
      ],
    },
    {
      type: 'accion',
      inputs: [
        'crea un plan de acción',
        'haz un tutorial paso a paso',
      ],
    },
    {
      type: 'conversacion',
      inputs: [
        'conversa sobre filosofía',
        'simula una entrevista técnica',
      ],
    },
  ];

  for (const { type, inputs } of cases) {
    describe(`type: ${type}`, () => {
      for (const input of inputs) {
        test(`"${input}" → superPrompt sin variables sin resolver y enriquecido`, async () => {
          const result = await runPipeline(input);

          // No unresolved template variables
          expect(result.superPrompt).not.toMatch(/\{\{.*?\}\}/);

          // Reasonable enrichment: super prompt should be longer than original
          expect(result.superPrompt.length).toBeGreaterThan(input.length);

          // Components used should not be empty
          expect(result.componentsUsed.length).toBeGreaterThan(0);
        });
      }
    });
  }
});
