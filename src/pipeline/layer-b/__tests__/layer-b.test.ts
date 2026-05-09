import { ClassificationResult, ExtractedEntities, LayerAOutput, PromptAttributes } from '@shared/types';
import { LayerB } from '../index';
import { QuestionSelector } from '../question-selector';

function makeClassification(partial: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    typeId: 'informacion',
    typeLabel: 'Información',
    intentId: 'entender',
    intentLabel: 'Entender',
    confidence: 0.9,
    ambiguityScore: 0.2,
    allScores: {},
    ...partial,
  };
}

function makeEntities(partial: Partial<ExtractedEntities> = {}): ExtractedEntities {
  return {
    inputContent: false,
    ...partial,
  };
}

function makeLayerAOutput(
  partial: Partial<LayerAOutput> & { attributes?: Partial<PromptAttributes> } = {}
): LayerAOutput {
  const classification = makeClassification(partial.classification);
  const entities = makeEntities(partial.entities);
  const attributes: PromptAttributes = {
    nivel: 'intermedio',
    formato: 'texto',
    longitud: 'medio',
    tono: 'neutral',
    tipo: 'explicar',
    audiencia: 'para mí',
    contexto: 'personal',
    intencion: 'entender',
    ...partial.attributes,
  };

    return {
      input: 'Test prompt',
      original: 'Test prompt',
      normalized: 'test prompt',
      classification,
      entities,
      mode: 'single',
      timestamp: Date.now(),
      attributes,
      detectedAttributes: partial.detectedAttributes ?? {},
      primary: {
        typeId: classification.typeId,
        confidence: classification.confidence,
        intent: classification.intentId,
      },
      ...partial,
    };
}

describe('QuestionSelector', () => {
  const selector = new QuestionSelector();

  it('returns empty array when confidence is high (>0.85) and all attributes present', () => {
    const output = makeLayerAOutput({
      mode: 'single',
      classification: makeClassification({ confidence: 0.92, intentId: 'entender' }),
      detectedAttributes: {
        nivel: 'intermedio',
        formato: 'texto',
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
        intencion: 'entender',
      },
    });
    expect(selector.selectQuestions(output)).toHaveLength(0);
  });

  it('with high confidence asks only missing dimensions (max 2)', () => {
    const output = makeLayerAOutput({
      mode: 'single',
      classification: makeClassification({ confidence: 0.92, intentId: 'entender' }),
      attributes: {
        formato: 'desconocido',
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
        intencion: 'entender',
        // nivel NOT set → genuinely missing
      },
      detectedAttributes: {
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
        intencion: 'entender',
        // nivel NOT set in detectedAttributes either
      },
    });
    const questions = selector.selectQuestions(output);
    expect(questions.length).toBeLessThanOrEqual(2);
    expect(questions.some((q) => q.dimension === 'nivel')).toBe(true);
  });

  it('with medium confidence (0.6-0.85) asks ambiguous + missing (max 2)', () => {
    const output = makeLayerAOutput({
      mode: 'single',
      classification: makeClassification({ confidence: 0.75, intentId: 'desconocido' }),
      attributes: {
        nivel: 'desconocido',
        formato: 'texto',
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
        intencion: 'desconocido',
      },
      detectedAttributes: {
        formato: 'texto',
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
      },
    });
    const questions = selector.selectQuestions(output);
    expect(questions.length).toBeLessThanOrEqual(2);
    expect(questions.some((q) => q.dimension === 'intencion')).toBe(true);
  });

  it('with low confidence (<=0.6) asks up to 3 questions', () => {
    const output = makeLayerAOutput({
      mode: 'multi',
      classification: makeClassification({ confidence: 0.5, intentId: 'desconocido' }),
      attributes: {
        nivel: 'desconocido',
        formato: 'desconocido',
        longitud: 'desconocido',
        tono: 'desconocido',
      },
      detectedAttributes: {},
    });
    const questions = selector.selectQuestions(output);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('prioritizes dimensions correctly in low confidence', () => {
    const output = makeLayerAOutput({
      mode: 'multi',
      classification: makeClassification({ confidence: 0.5, intentId: 'desconocido' }),
      attributes: {
        nivel: 'desconocido',
        formato: 'desconocido',
        longitud: 'desconocido',
        tono: 'desconocido',
      },
      detectedAttributes: {},
    });
    const questions = selector.selectQuestions(output);
    const dimensions = questions.map((q) => q.dimension);
    expect(dimensions).toEqual(['tipo', 'nivel', 'intencion']);
  });

  it('selects paste_action first when paste is detected', () => {
    const output = makeLayerAOutput({
      mode: 'multi',
      classification: makeClassification({ confidence: 0.5, intentId: 'desconocido' }),
      entities: {
        inputContent: true,
        externalContext: 'some pasted text',
      },
      attributes: {
        nivel: 'desconocido',
        formato: 'desconocido',
      },
      detectedAttributes: {},
    });
    const questions = selector.selectQuestions(output);
    const dimensions = questions.map((q) => q.dimension);
    expect(dimensions[0]).toBe('paste_action');
  });
});

describe('LayerB', () => {
  const layerB = new LayerB();
  let messageListeners: Array<(msg: { type: string; payload?: unknown }) => void> = [];

  beforeAll(() => {
    messageListeners = [];
    (global as unknown as Record<string, unknown>).chrome = {
      runtime: {
        sendMessage: jest.fn().mockImplementation((msg: { type: string; payload?: { questions: Array<{ id: string; options: string[] }>; originalPrompt: string; sessionId: string } }) => {
          if (msg.type === 'SHOW_QUESTIONS' && msg.payload) {
            // Simulate panel answering on next tick with first option for each question
            const answers: Record<string, string> = {};
            for (const q of msg.payload.questions) {
              answers[q.id] = q.options[0] ?? '';
            }
            const { originalPrompt, sessionId } = msg.payload;
            setTimeout(() => {
              messageListeners.forEach((listener) =>
                listener({ type: 'QUESTIONS_ANSWERED', payload: { answers, originalPrompt, sessionId } })
              );
            }, 0);
          }
          return Promise.resolve();
        }),
        onMessage: {
          addListener: jest.fn().mockImplementation((listener: (msg: { type: string; payload?: unknown }) => void) => {
            messageListeners.push(listener);
          }),
          removeListener: jest.fn().mockImplementation((listener: (msg: { type: string; payload?: unknown }) => void) => {
            const idx = messageListeners.indexOf(listener);
            if (idx >= 0) messageListeners.splice(idx, 1);
          }),
        },
      },
      tabs: {
        query: jest.fn().mockImplementation((_queryInfo: unknown, callback: (tabs: Array<{ id: number }>) => void) => callback([{ id: 1 }])),
      },
      sidePanel: {
        open: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('processes answers correctly', async () => {
    const layerAOutput: LayerAOutput = {
      input: 'Explain quantum computing',
      original: 'Explain quantum computing',
      normalized: 'explain quantum computing',
      classification: makeClassification({ confidence: 0.6, intentId: 'desconocido' }),
      entities: makeEntities(),
      mode: 'multi',
      timestamp: Date.now(),
      attributes: {
        nivel: 'desconocido',
        formato: 'desconocido',
        longitud: 'desconocido',
        tono: 'desconocido',
      },
      detectedAttributes: {},
      primary: {
        typeId: 'informacion',
        confidence: 0.6,
        intent: 'desconocido',
      },
    };

    const questions = layerB.selectQuestions(layerAOutput);
    const answers = await layerB.promptUser(questions, layerAOutput.original);
    const result = layerB.buildOutput(layerAOutput, answers, questions);

    expect(result.questionsAsked).toBe(questions.length);
    expect(result.skipped).toBe(false);
    expect(Object.keys(result.answers).length).toBe(questions.length);
    expect(result.resolvedType).toBe(layerAOutput.classification.typeId);
    expect(result.resolvedIntent).toBe(layerAOutput.primary.intent ?? '');
    expect(result.originalPrompt).toBe(layerAOutput.input);
  });

  it('skips when no questions are needed', async () => {
    const layerAOutput = makeLayerAOutput({
      mode: 'single',
      classification: makeClassification({ confidence: 0.9, intentId: 'entender' }),
      detectedAttributes: {
        nivel: 'intermedio',
        formato: 'texto',
        longitud: 'medio',
        tono: 'neutral',
        audiencia: 'para mí',
        contexto: 'personal',
        intencion: 'entender',
      },
    });

    const questions = layerB.selectQuestions(layerAOutput);
    const answers = await layerB.promptUser(questions, layerAOutput.original);
    const result = layerB.buildOutput(layerAOutput, answers, questions);

    expect(result.questionsAsked).toBe(0);
    expect(result.skipped).toBe(true);
  });
});
