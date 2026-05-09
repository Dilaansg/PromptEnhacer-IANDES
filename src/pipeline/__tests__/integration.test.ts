import { LayerA } from '../layer-a';
import { LayerB } from '../layer-b';
import { LayerC } from '../layer-c';
import { PasteMetadata } from '@shared/types';

describe('Pipeline Integration', () => {
  const layerA = new LayerA();
  const layerB = new LayerB();
  const layerC = new LayerC();

  it('handles technical explanation with known target', async () => {
    const input = 'explicame algebra lineal para niños';
    const outputA = await layerA.process(input);
    
    expect(outputA.classification.typeId).toBe('informacion');
    expect(['explicacion_tecnica', 'definicion', 'resumen', 'desconocido']).toContain(outputA.primary.intent);
    expect(outputA.primary.domain).toBe('matematicas');
    
    const questions = layerB.selectQuestions(outputA);
    // Since 'para niños' triggers 'audiencia', questions should be 0 
    // unless confidence is low or mode is multi. Wait, if it's high confidence, no questions.
    // If it's multi, it might ask 'tipo' but we are using keyword fallback since embeddings aren't loaded in test.
    // Actually, embeddings ARE NOT loaded in test because we didn't mock EmbeddingEngine initialization,
    // so it falls back to TypeScorer.
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('handles general definition query', async () => {
    const input = 'qué es el síndrome del impostor';
    const outputA = await layerA.process(input);

    expect(outputA.classification.typeId).toBe('informacion');
    expect(['definicion', 'explicacion_tecnica', 'desconocido']).toContain(outputA.primary.intent);
    expect(outputA.primary.domain).toBe('psicologia');

    const questions = layerB.selectQuestions(outputA);
    expect(questions.length).toBeLessThanOrEqual(2);
  });

  it('handles code generation query', async () => {
    const input = 'escribe una función en python';
    const outputA = await layerA.process(input);

    expect(outputA.classification.typeId).toBe('codigo');
    expect(['escribir_codigo', 'desconocido']).toContain(outputA.primary.intent);
    expect(outputA.primary.domain).toBe('tecnologia');

    const questions = layerB.selectQuestions(outputA);
    expect(questions.length).toBeLessThanOrEqual(2);
  });

  it('handles conversational / ambiguous query', async () => {
    const input = 'hola cómo estás';
    const outputA = await layerA.process(input);

    expect(['conversacion', 'desconocido']).toContain(outputA.classification.typeId);
    expect(outputA.primary.domain).toBe('desconocido');

    const questions = layerB.selectQuestions(outputA);
    // It should trigger multiple questions due to low confidence / ambiguous nature
    expect(questions.length).toBeGreaterThanOrEqual(2);
  });

  it('handles paste sub-flow', async () => {
    const pastedText = 'La fotosíntesis es el proceso mediante el cual las plantas elaboran alimento... (texto muy largo aquí que supera el 60%)';
    const input = `resume esto: ${pastedText}`;
    
    const pasteMetadata: PasteMetadata = {
      pastedText,
      pastedLength: pastedText.length,
      totalLength: input.length,
    };

    const outputA = await layerA.process(input, pasteMetadata);

    expect(outputA.classification.typeId).toBe('transformacion');
    // The topic extracted should just be the instruction part.
    // The externalContext should contain the pasted text.
    expect(outputA.entities.inputContent).toBe(true);
    expect(outputA.entities.externalContext).toBe(pastedText);

    const questions = layerB.selectQuestions(outputA);
    expect(questions.length).toBeGreaterThan(0);
    // The very first question should be the paste_action question
    expect(questions[0].dimension).toBe('paste_action');

    const layerBOutput = layerB.buildOutput(outputA, { 'q-paste-action': 'Resumirlo' }, questions);
    const finalOutput = await layerC.generate(layerBOutput);
    expect(finalOutput.superPrompt).toBeDefined();
  });
});
