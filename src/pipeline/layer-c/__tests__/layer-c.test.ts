import { TemplateEngine } from '../template-engine';
import { LayerC } from '../index';
import { LayerBOutput } from '../../types';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('renderTemplate', () => {
    it('replaces simple variables correctly', async () => {
      const result = await engine.renderTemplate('informacion', 'definicion', {
        topic: 'TypeScript',
        nivel: 'avanzado',
      });
      expect(result).toContain('TypeScript');
      expect(result).not.toContain('{{topic}}');
      expect(result).not.toContain('{{nivel}}');
      expect(result).toContain('avanzado');
    });

    it('uses default value when optional variable is missing', async () => {
      const result = await engine.renderTemplate('informacion', 'definicion', {
        topic: 'Inteligencia Artificial',
      });
      expect(result).toContain('Inteligencia Artificial');
      expect(result).not.toContain('{{topic}}');
      expect(result).not.toContain('{{#if');
    });

    it('handles conditionals when variable is present', async () => {
      const result = await engine.renderTemplate('informacion', 'comparacion', {
        topic: 'React vs Vue',
        isTech: true,
      });
      expect(result).toContain('React vs Vue');
      expect(result).toContain('comparación académica');
      expect(result).not.toContain('{{#if');
    });

    it('handles conditionals when variable is absent', async () => {
      const result = await engine.renderTemplate('informacion', 'comparacion', {
        topic: 'React vs Vue',
      });
      // No domain flags → generic academic comparacion text
      expect(result).toContain('React vs Vue');
      expect(result).toContain('comparación académica');
      expect(result).not.toContain('{{#if');
    });

    it('returns fallback for missing type', async () => {
      const result = await engine.renderTemplate('inexistente', 'definicion', {
        originalPrompt: 'Hola mundo',
      });
      expect(result).toContain('Hola mundo');
      expect(result).toContain('Analiza la intención');
    });

    it('selects best matching template when intent is missing', async () => {
      const result = await engine.renderTemplate('informacion', 'inexistente', {
        originalPrompt: 'Prompt original',
      });
      // Should pick the most similar template from the 'informacion' type
      // rather than the global fallback
      expect(result).not.toContain('Mejora el siguiente prompt');
      expect(result.length).toBeGreaterThan(20);
    });

    it('renders code templates with code block context', async () => {
      const result = await engine.renderTemplate('codigo', 'debug', {
        code: 'function add(a, b) { return a + b; }',
      });
      expect(result).toContain('function add(a, b) { return a + b; }');
      expect(result).toContain('Actúa como debugger experto');
    });

    it('infers domain from topic when context is missing', async () => {
      const result = await engine.renderTemplate('informacion', 'explicacion_tecnica', {
        topic: 'segunda guerra mundial',
        context: 'historia',
        originalPrompt: 'Explica la segunda guerra mundial',
      });
      expect(result).toContain('historia');
    });

    it('uses transformacion templates', async () => {
      const result = await engine.renderTemplate('transformacion', 'resumen', {
        topic: 'artículo de IA',
        originalPrompt: 'Resume este artículo',
      });
      expect(result).toContain('Resume');
      expect(result).toContain('artículo de IA');
    });
  });
});

describe('LayerC', () => {
  let layerC: LayerC;

  beforeEach(() => {
    layerC = new LayerC();
  });

  it('generates a superPrompt from enriched context', async () => {
    const enriched: LayerBOutput = {
      originalPrompt: 'Explica React',
      resolvedType: 'informacion',
      resolvedIntent: 'explicacion_tecnica',
      questionsAsked: 0,
      skipped: true,
      answers: {},
      enrichedAttributes: {
        nivel: 'avanzado',
      },
      entities: {
        topic: 'React',
        context: 'frontend',
        inputContent: false,
      },
    };

    const result = await layerC.generate(enriched);

    expect(result.superPrompt).toContain('Actúa como');
    expect(result.superPrompt).toContain('React');
    expect(result.originalPrompt).toBe('Explica React');
    expect(result.templateUsed).toBe('informacion/explicacion_tecnica');
  });

  it('calculates token delta correctly', async () => {
    const originalPrompt = 'Define AI';
    const enriched: LayerBOutput = {
      originalPrompt,
      resolvedType: 'informacion',
      resolvedIntent: 'definicion',
      questionsAsked: 0,
      skipped: true,
      answers: {},
      enrichedAttributes: {},
      entities: {
        topic: 'Inteligencia Artificial',
        inputContent: false,
      },
    };

    const result = await layerC.generate(enriched);

    const expectedDelta = result.superPrompt.length - originalPrompt.length;
    expect(result.estimatedTokenDelta).toBe(expectedDelta);
    expect(result.estimatedTokenDelta).toBeGreaterThan(0);
  });

  it('includes components used in output', async () => {
    const enriched: LayerBOutput = {
      originalPrompt: 'Escribe código en Python',
      resolvedType: 'codigo',
      resolvedIntent: 'escribir_codigo',
      questionsAsked: 0,
      skipped: true,
      answers: {},
      enrichedAttributes: {},
      entities: {
        topic: 'ordena una lista',
        context: 'Python',
        inputContent: false,
      },
    };

    const result = await layerC.generate(enriched);

    expect(result.componentsUsed).toContain('rol');
    expect(result.componentsUsed).toContain('tarea');
  });

  it('handles fallback template gracefully', async () => {
    const enriched: LayerBOutput = {
      originalPrompt: 'Prompt desconocido',
      resolvedType: 'tipo_inexistente',
      resolvedIntent: 'intent_inexistente',
      questionsAsked: 0,
      skipped: true,
      answers: {},
      enrichedAttributes: {},
      entities: {
        inputContent: false,
      },
    };

    const result = await layerC.generate(enriched);

    expect(result.superPrompt.length).toBeGreaterThan(50);
    expect(result.superPrompt).toMatch(/actúa como|responde/i);
    expect(result.templateUsed).toBe('tipo_inexistente/intent_inexistente');
  });
});
