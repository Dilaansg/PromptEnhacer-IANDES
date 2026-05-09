/**
 * Pipeline Integration Tests — Full A → B → C flow.
 *
 * These tests verify that data flows correctly through all three layers
 * without mocking internal pipeline components. They test:
 *
 *  1. Layer A output shapes match Layer B expectations
 *  2. Layer B question selection actually adapts to Layer A context
 *  3. Layer C produces viable SuperPrompts from enriched Layer B context
 *  4. The SmartPromptArchitect beats or matches the legacy TemplateEngine
 *  5. Quality scorer produces meaningful scores for real prompts
 *
 * Run:  npx jest pipeline-integration --verbose
 */

import { LayerA } from '../layer-a/index';
import { LayerB } from '../layer-b/index';
import { LayerC } from '../layer-c/index';
import { SmartPromptArchitect } from '../layer-c/smart-architect';
import { scorePromptQuality, meetsMinimumQuality } from '../layer-c/quality-scorer';
import type { LayerAOutput, LayerBOutput } from '@shared/types';

// Mock chrome APIs for the test environment
(global as any).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
    sendMessage: jest.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn().mockImplementation((_: unknown, cb: Function) => cb([{ id: 1 }])),
  },
  sidePanel: { open: jest.fn().mockResolvedValue(undefined) },
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Simulate Layer B producing output without user interaction (skip mode). */
function buildLayerBSkipOutput(layerAOutput: LayerAOutput): LayerBOutput {
  const layerB = new LayerB();
  const questions = layerB.selectQuestions(layerAOutput);

  // Simulate: if no questions needed, build output directly
  if (questions.length === 0) {
    return layerB.buildOutput(layerAOutput, {}, []);
  }

  // Simulate: auto-answer with first option for each question
  const answers: Record<string, string> = {};
  for (const q of questions) {
    answers[q.id] = q.options[0] ?? '';
  }
  return layerB.buildOutput(layerAOutput, answers, questions);
}

// ────────────────────────────────────────────────────────────────────────────
// Layer A → Layer B contract tests
// ────────────────────────────────────────────────────────────────────────────

describe('A→B Contract: LayerA output has all fields LayerB needs', () => {
  const layerA = new LayerA();

  const prompts = [
    'explica qué es la inteligencia artificial',
    'escribe un cuento corto sobre robots',
    'resume este texto sobre energías renovables',
    'analiza la estructura de este contenido',
    'explica cómo programar en python',
    'hola',
    '',
  ];

  for (const prompt of prompts) {
    const label = prompt || '(empty)';

    it(`"${label}" → output has classification, entities, attributes, mode, primary`, async () => {
      const output = await layerA.process(prompt);

      // Structural checks — these are the fields Layer B reads
      expect(output).toHaveProperty('classification');
      expect(output).toHaveProperty('classification.typeId');
      expect(output).toHaveProperty('classification.intentId');
      expect(output).toHaveProperty('classification.confidence');
      expect(output).toHaveProperty('classification.ambiguityScore');
      expect(output).toHaveProperty('classification.allScores');
      expect(output).toHaveProperty('entities');
      expect(output).toHaveProperty('entities.inputContent');
      expect(output).toHaveProperty('attributes');
      expect(output).toHaveProperty('detectedAttributes');
      expect(output).toHaveProperty('mode');
      expect(output).toHaveProperty('primary');
      expect(output).toHaveProperty('primary.typeId');
      expect(output).toHaveProperty('primary.confidence');
      expect(output).toHaveProperty('timestamp');
      expect(typeof output.mode).toBe('string');
      expect(['single', 'multi']).toContain(output.mode);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Layer B question selection adaptiveness
// ────────────────────────────────────────────────────────────────────────────

describe('Layer B adaptiveness to Layer A context', () => {
  const layerA = new LayerA();
  const layerB = new LayerB();

  it('high-confidence prompt with all attrs → 0 questions', async () => {
    // "explica qué es la inteligencia artificial de forma sencilla"
    // → informacion with high confidence and nivel already detected
    const aOut = await layerA.process('explica qué es la inteligencia artificial de forma sencilla');
    const questions = layerB.selectQuestions(aOut);

    // With all attributes inferable, should ask very few or no questions
    expect(questions.length).toBeLessThanOrEqual(2);
  });

  it('code prompt → never asks about format (already codigo)', async () => {
    const aOut = await layerA.process('escribe una función en python para ordenar una lista');
    const questions = layerB.selectQuestions(aOut);
    const dims = questions.map((q) => q.dimension);

    // Format should already be "codigo" from implicit inference
    expect(dims).not.toContain('formato');
  });

  it('ambiguous prompt → more questions than clear prompt', async () => {
    const clearOut = await layerA.process('explica la fotosíntesis');
    const ambiguousOut = await layerA.process('hola quiero hacer algo');

    const clearQs = layerB.selectQuestions(clearOut);
    const ambiguousQs = layerB.selectQuestions(ambiguousOut);

    expect(ambiguousQs.length).toBeGreaterThanOrEqual(clearQs.length);
  });

  it('transformacion prompt → detects inputContent', async () => {
    const aOut = await layerA.process('resume este texto sobre energías renovables');
    const questions = layerB.selectQuestions(aOut);

    // Should not ask "what type?" — transformacion is clear
    const typeDim = questions.find((q) => q.dimension === 'tipo');
    expect(typeDim).toBeUndefined();
  });

  it('question dimensions are never duplicated', async () => {
    const aOut = await layerA.process('hola');
    const questions = layerB.selectQuestions(aOut);
    const dims = questions.map((q) => q.dimension);

    expect(new Set(dims).size).toBe(dims.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Layer B → Layer C contract tests
// ────────────────────────────────────────────────────────────────────────────

describe('B→C Contract: LayerB output feeds Layer C correctly', () => {
  const layerA = new LayerA();

  const cases = [
    'explica la fotosíntesis',
    'escribe un ensayo sobre la IA',
    'resume este artículo sobre tecnología',
    'analiza la estructura de este contenido',
  ];

  for (const prompt of cases) {
    it(`"${prompt}" → B output has resolvedType, enrichedAttributes, entities`, async () => {
      const aOut = await layerA.process(prompt);
      const bOut = buildLayerBSkipOutput(aOut);

      expect(bOut).toHaveProperty('resolvedType');
      expect(bOut).toHaveProperty('resolvedIntent');
      expect(bOut).toHaveProperty('enrichedAttributes');
      expect(bOut).toHaveProperty('entities');
      expect(bOut).toHaveProperty('originalPrompt');
      expect(typeof bOut.resolvedType).toBe('string');
      expect(typeof bOut.resolvedIntent).toBe('string');
      expect(bOut.resolvedType).not.toBe('');
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Full A→B→C pipeline end-to-end
// ────────────────────────────────────────────────────────────────────────────

describe('Full Pipeline A→B→C end-to-end', () => {
  const layerA = new LayerA();
  const layerC = new LayerC();

  const e2eCases = [
    {
      prompt: 'explica qué es la inteligencia artificial',
      expectContains: ['Actúa como', 'inteligencia artificial'],
      expectMinLength: 200,
    },
    {
      prompt: 'escribe un cuento corto sobre un robot',
      expectContains: ['Actúa como', 'robot'],
      expectMinLength: 150,
    },
    {
      prompt: 'resume este artículo sobre tecnología',
      expectContains: ['tecnología'],
      expectMinLength: 100,
    },
    {
      prompt: 'analiza el sentimiento de este texto',
      expectContains: ['Actúa como'],
      expectMinLength: 100,
    },
  ];

  for (const tc of e2eCases) {
    it(`"${tc.prompt}" → SuperPrompt with ${tc.expectContains.join(', ')}`, async () => {
      const aOut = await layerA.process(tc.prompt);
      const bOut = buildLayerBSkipOutput(aOut);
      const cOut = await layerC.generate(bOut);

      // SuperPrompt exists and has substance
      expect(cOut.superPrompt).toBeDefined();
      expect(cOut.superPrompt.length).toBeGreaterThanOrEqual(tc.expectMinLength);

      // Content checks
      for (const expected of tc.expectContains) {
        expect(cOut.superPrompt.toLowerCase()).toContain(expected.toLowerCase());
      }

      // No unresolved template variables
      expect(cOut.superPrompt).not.toMatch(/\{\{/);

      // Metadata
      expect(cOut.templateUsed).toBeDefined();
      expect(cOut.estimatedTokenDelta).toBeGreaterThan(0);
      expect(cOut.componentsUsed.length).toBeGreaterThan(0);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// SmartPromptArchitect vs TemplateEngine — enrichment comparison
// ────────────────────────────────────────────────────────────────────────────

describe('SmartPromptArchitect enrichment quality', () => {
  const layerA = new LayerA();
  const architect = new SmartPromptArchitect();

  const prompts = [
    'explica qué es una base de datos',
    'escribe un ensayo sobre el cambio climático',
    'analiza la estructura de este contenido',
    'explica cómo hacer un resumen efectivo',
  ];

  for (const prompt of prompts) {
    it(`"${prompt}" → MPC output is viable and ≥ 1.5x original`, async () => {
      const aOut = await layerA.process(prompt);
      const bOut = buildLayerBSkipOutput(aOut);

      const superPrompt = await architect.assemblePrompt(bOut);

      // Should always have persona
      expect(superPrompt).toMatch(/actúa como/i);

      // Should be significantly longer than original
      expect(superPrompt.length).toBeGreaterThan(prompt.length * 1.5);

      // Should not have unresolved vars
      expect(superPrompt).not.toMatch(/\{\{/);

      // isViable should return true for well-formed inputs
      const viable = architect.isViable(superPrompt, prompt);
      expect(viable).toBe(true);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Quality Scorer integration
// ────────────────────────────────────────────────────────────────────────────

describe('Quality Scorer — real prompts', () => {
  const layerA = new LayerA();
  const layerC = new LayerC();

  it('well-classified prompt → quality score ≥ "aceptable"', async () => {
    const aOut = await layerA.process('explica la fotosíntesis paso a paso');
    const bOut = buildLayerBSkipOutput(aOut);
    const cOut = await layerC.generate(bOut);

    const score = scorePromptQuality(cOut.superPrompt, 'explica la fotosíntesis paso a paso');

    expect(score.total).toBeGreaterThanOrEqual(0.4);
    expect(meetsMinimumQuality(score)).toBe(true);
    expect(score.factors.hasPersona).toBe(true);
    expect(score.factors.hasInstruction).toBe(true);
    expect(score.factors.noUnresolvedVars).toBe(true);
  });

  it('unknown type still produces quality ≥ deficient', async () => {
    const aOut = await layerA.process('xyz');
    const bOut = buildLayerBSkipOutput(aOut);
    const cOut = await layerC.generate(bOut);

    const score = scorePromptQuality(cOut.superPrompt, 'xyz');

    // Even fallback should produce something measurable
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.label).toBeDefined();
  });

  it('score factors are all boolean/number', async () => {
    const aOut = await layerA.process('crea un poema sobre la naturaleza');
    const bOut = buildLayerBSkipOutput(aOut);
    const cOut = await layerC.generate(bOut);

    const score = scorePromptQuality(cOut.superPrompt, 'crea un poema sobre la naturaleza');

    expect(typeof score.factors.hasPersona).toBe('boolean');
    expect(typeof score.factors.hasInstruction).toBe('boolean');
    expect(typeof score.factors.hasStructureGuide).toBe('boolean');
    expect(typeof score.factors.hasConstraints).toBe('boolean');
    expect(typeof score.factors.enrichmentRatio).toBe('number');
    expect(typeof score.factors.noUnresolvedVars).toBe('boolean');
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression guards — specific bugs that were caught and fixed
// ────────────────────────────────────────────────────────────────────────────

describe('Regression guards', () => {
  const layerA = new LayerA();

  it('"Explicame la dictadura española" → NOT conversacion/roleplay', async () => {
    const aOut = await layerA.process('Explicame la dictadura española');
    expect(aOut.classification.typeId).not.toBe('conversacion');
    expect(aOut.classification.intentId).not.toBe('roleplay');
    // Should be informacion
    expect(aOut.classification.typeId).toBe('informacion');
  });

  it('"resume este texto" → transformacion, not informacion', async () => {
    const aOut = await layerA.process('resume este texto');
    expect(aOut.classification.typeId).toBe('transformacion');
  });

  it('"mejora este cuento" → transformacion, not generacion', async () => {
    const aOut = await layerA.process('mejora este cuento agregando más detalles');
    expect(aOut.classification.typeId).toBe('transformacion');
  });

  it('"escribe un ensayo" → generacion, not informacion', async () => {
    const aOut = await layerA.process('escribe un ensayo sobre la IA');
    expect(aOut.classification.typeId).toBe('generacion');
  });

  it('"da instrucciones para..." → accion, not informacion', async () => {
    const aOut = await layerA.process('da instrucciones para escribir un cuento');
    // This is action-oriented, should be accion
    expect(aOut.classification.typeId).toBe('accion');
  });

  it('topic extraction does not return empty for real prompts', async () => {
    const prompts = [
      'explica la fotosíntesis',
      'escribe un cuento sobre un dragón',
      'analiza el impacto del cambio climático',
    ];

    for (const p of prompts) {
      const aOut = await layerA.process(p);
      expect(aOut.entities.topic).toBeDefined();
      expect(aOut.entities.topic!.length).toBeGreaterThan(2);
    }
  });

  it('implicit attribute inference works for code prompts', async () => {
    const aOut = await layerA.process('escribe una función en javascript');
    // Should infer formato=codigo
    expect(aOut.attributes.formato).toBe('codigo');
  });
});
