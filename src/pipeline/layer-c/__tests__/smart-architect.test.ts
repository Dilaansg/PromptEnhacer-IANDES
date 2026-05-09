/**
 * Deep unit tests for SmartPromptArchitect and Quality Scorer.
 *
 * Validates:
 *  1. assemblePrompt always includes persona + instruction
 *  2. Rigor rules only injected when domainConfidence > 0.5
 *  3. Level/Tone/Length constraints map correctly
 *  4. isViable() rejects short/incomplete prompts
 *  5. Quality scorer weights produce expected ranges
 *  6. No unresolved {{vars}} in output
 */

import { SmartPromptArchitect } from '../smart-architect';
import { scorePromptQuality, meetsMinimumQuality } from '../quality-scorer';
import type { LayerBOutput } from '@shared/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeLayerBOutput(overrides: Partial<LayerBOutput> = {}): LayerBOutput {
  return {
    questionsAsked: 0,
    skipped: true,
    answers: {},
    enrichedAttributes: {},
    entities: { inputContent: false },
    resolvedType: 'informacion',
    resolvedIntent: 'definicion',
    originalPrompt: 'explica qué es la IA',
    ...overrides,
  };
}

// ── SmartPromptArchitect ────────────────────────────────────────────────────

describe('SmartPromptArchitect — assemblePrompt', () => {
  const architect = new SmartPromptArchitect();

  it('always includes "Actúa como"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput());
    expect(result).toMatch(/actúa como/i);
  });

  it('always includes the instruction for the type/intent', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      resolvedType: 'informacion',
      resolvedIntent: 'definicion',
      entities: { topic: 'blockchain', inputContent: false },
    }));
    expect(result.toLowerCase()).toContain('blockchain');
    expect(result).toMatch(/define|definición|significado|estructura/i);
  });

  it('does NOT inject academic rigor rules (suppressed for conciseness)', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: {
        contexto: 'historia',
        domainConfidence: 0.95,
      },
    }));
    // Rigor rules were removed — they produced overly pedantic prompts
    expect(result.toLowerCase()).not.toContain('hechos documentados');
    expect(result.toLowerCase()).not.toContain('directrices de calidad');
    expect(result.toLowerCase()).not.toContain('cita fuentes');
  });

  it('injects level constraint for "avanzado"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { nivel: 'avanzado' },
    }));
    expect(result.toLowerCase()).toContain('avanzado');
    expect(result.toLowerCase()).toContain('terminología técnica');
  });

  it('injects level constraint for "basico"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { nivel: 'basico' },
    }));
    expect(result.toLowerCase()).toContain('introductorio');
  });

  it('injects tone constraint for "formal"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { tono: 'formal' },
    }));
    expect(result.toLowerCase()).toContain('formal');
  });

  it('injects length constraint for "largo"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { longitud: 'largo' },
    }));
    expect(result.toLowerCase()).toContain('extensa');
  });

  it('includes audience when not "personal"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { audiencia: 'estudiantes universitarios' },
    }));
    expect(result.toLowerCase()).toContain('estudiantes universitarios');
  });

  it('does NOT include audience when "personal"', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { audiencia: 'personal' },
    }));
    expect(result.toLowerCase()).not.toContain('adapta el lenguaje');
  });

  it('includes format instruction', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: { formato: 'tabla' },
    }));
    expect(result.toLowerCase()).toContain('tabla');
  });

  it('includes extra academic context (proposito, materia)', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      enrichedAttributes: {
        proposito: 'tarea de clase',
        materia: 'biología',
        nivel_curso: 'pregrado',
      },
    }));
    expect(result).toContain('tarea de clase');
    expect(result).toContain('biología');
    expect(result).toContain('pregrado');
  });

  it('does NOT include original prompt (removed for sustainability)', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      originalPrompt: 'Mi prompt original',
    }));
    // The original prompt should NOT be repeated — the AI already has it
    expect(result).not.toContain('Mi prompt original');
    expect(result).not.toMatch(/solicitud original/i);
  });

  it('no unresolved {{}} vars when topic is available', async () => {
    const result = await architect.assemblePrompt(makeLayerBOutput({
      entities: { topic: 'machine learning', inputContent: false },
    }));
    expect(result).not.toMatch(/\{\{/);
  });

  it('covers all INSTRUCTION_REGISTRY types', async () => {
    const types = [
      { type: 'informacion', intent: 'definicion' },
      { type: 'codigo', intent: 'escribir_codigo' },
      { type: 'generacion', intent: 'texto_creativo' },
      { type: 'analisis', intent: 'feedback' },
      { type: 'razonamiento', intent: 'resolver_problema' },
      { type: 'accion', intent: 'tutorial' },
      { type: 'transformacion', intent: 'resumen' },
      { type: 'conversacion', intent: 'roleplay' },
    ];

    for (const { type, intent } of types) {
      const result = await architect.assemblePrompt(makeLayerBOutput({
        resolvedType: type,
        resolvedIntent: intent,
        entities: { topic: 'test topic', inputContent: false },
      }));
      expect(result.length).toBeGreaterThan(100);
      expect(result).toContain('test topic');
      expect(result).not.toMatch(/\{\{/);
    }
  });
});

// ── isViable() ──────────────────────────────────────────────────────────────

describe('SmartPromptArchitect — isViable', () => {
  const architect = new SmartPromptArchitect();

  it('accepts prompt that is 2x original and has persona', () => {
    const superPrompt = 'Actúa como un experto. Tu tarea es explicar el tema. Usa ejemplos claros y bien documentados.';
    expect(architect.isViable(superPrompt, 'explica el tema')).toBe(true);
  });

  it('rejects prompt shorter than 1.5x original', () => {
    expect(architect.isViable('Actúa como experto.', 'explica el tema con ejemplos')).toBe(false);
  });

  it('rejects prompt without persona', () => {
    const long = 'Este es un texto muy largo que no tiene ninguna mención a actuar como algo. '.repeat(3);
    expect(architect.isViable(long, 'corto')).toBe(false);
  });

  it('rejects prompt with unresolved vars', () => {
    const withVars = 'Actúa como un experto. Define {{topic}} con claridad. Usa {{formato}} apropiado.';
    expect(architect.isViable(withVars, 'corto')).toBe(false);
  });
});

// ── Quality Scorer ──────────────────────────────────────────────────────────

describe('Quality Scorer', () => {
  it('perfect prompt scores ≥ 0.80 (excelente)', () => {
    const perfect = `
Actúa como un experto académico multidisciplinario.
Tu tarea es explicar el concepto de fotosíntesis de forma clara.
Directrices de calidad:
- Mantén un tono objetivo y riguroso.
Mantén un nivel avanzado. Usa terminología técnica.
Usa un tono formal, objetivo y profesional.
Estructura tu respuesta en párrafos claros.
Solicitud original del usuario: "explica la fotosíntesis"
    `.trim();

    const score = scorePromptQuality(perfect, 'explica la fotosíntesis');
    expect(score.total).toBeGreaterThanOrEqual(0.80);
    expect(score.label).toBe('excelente');
    expect(score.factors.hasPersona).toBe(true);
    expect(score.factors.hasInstruction).toBe(true);
    expect(score.factors.hasStructureGuide).toBe(true);
    expect(score.factors.hasConstraints).toBe(true);
    expect(score.factors.noUnresolvedVars).toBe(true);
  });

  it('minimal prompt scores low (deficiente)', () => {
    const minimal = 'Hola, ¿qué quieres?';
    const score = scorePromptQuality(minimal, 'Hola');
    expect(score.total).toBeLessThan(0.40);
    expect(score.label).toBe('deficiente');
  });

  it('prompt with unresolved vars loses 0.15 points', () => {
    const withVars = 'Actúa como experto. Tu tarea es {{task}}. Estructura en {{formato}}.';
    const withoutVars = 'Actúa como experto. Tu tarea es explicar. Estructura en párrafos.';

    const scoreWith = scorePromptQuality(withVars, 'corto');
    const scoreWithout = scorePromptQuality(withoutVars, 'corto');

    expect(scoreWithout.total).toBeGreaterThan(scoreWith.total);
    expect(scoreWith.factors.noUnresolvedVars).toBe(false);
    expect(scoreWithout.factors.noUnresolvedVars).toBe(true);
  });

  it('meetsMinimumQuality returns false for score < 0.40', () => {
    const score = scorePromptQuality('nada', 'nada');
    if (score.total < 0.40) {
      expect(meetsMinimumQuality(score)).toBe(false);
    }
  });

  it('enrichment ratio scales with prompt growth', () => {
    const short = 'Actúa como experto. Explica esto.';
    const long = (short + ' Proporciona ejemplos claros y detallados. ').repeat(5);

    const scoreShort = scorePromptQuality(short, 'esto');
    const scoreLong = scorePromptQuality(long, 'esto');

    expect(scoreLong.factors.enrichmentRatio).toBeGreaterThanOrEqual(
      scoreShort.factors.enrichmentRatio,
    );
  });
});
