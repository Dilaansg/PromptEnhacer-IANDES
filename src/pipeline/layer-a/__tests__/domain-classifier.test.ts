/**
 * Tests for DomainClassifier
 *
 * Covers:
 *  1. Keyword fallback (always available, no engine needed)
 *  2. Engine-not-ready → goes straight to keyword fallback
 *  3. Engine-ready but low confidence → keyword fallback
 *  4. Engine-ready and high confidence → returns semantic result
 */

import { DomainClassifier } from '../domain-classifier';

// Default mock: engine NOT ready
jest.mock('../../embedding-engine', () => ({
  EmbeddingEngine: {
    getInstance: () => ({
      isReady: () => false,
      classify: jest.fn(),
    }),
  },
}));

describe('DomainClassifier — keyword fallback (engine not ready)', () => {
  const dc = new DomainClassifier();

  test('detecta matematicas con keywords', async () => {
    const result = await dc.classify('explicame la regresión lineal y las ecuaciones diferenciales');
    expect(result.domain).toBe('matematicas');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detecta tecnologia con keywords', async () => {
    const result = await dc.classify('crea una función en python con algoritmos de búsqueda');
    expect(result.domain).toBe('tecnologia');
  });

  test('detecta psicologia con síndrome del impostor', async () => {
    const result = await dc.classify('qué es el síndrome del impostor y la ansiedad');
    expect(result.domain).toBe('psicologia');
  });

  test('detecta historia con keywords', async () => {
    const result = await dc.classify('cuáles fueron las causas de la revolución francesa');
    expect(result.domain).toBe('historia');
  });

  test('detecta medicina con keywords', async () => {
    const result = await dc.classify('qué síntomas tiene la enfermedad y cómo es el diagnóstico');
    expect(result.domain).toBe('medicina');
  });

  test('retorna desconocido sin keywords de dominio', async () => {
    const result = await dc.classify('hola cómo estás');
    expect(result.domain).toBe('desconocido');
    expect(result.confidence).toBe(0);
  });

  test('texto vacío retorna desconocido', async () => {
    const result = await dc.classify('');
    expect(result.domain).toBe('desconocido');
    expect(result.confidence).toBe(0);
  });

  test('pseudo-confidence sube con más keywords', async () => {
    const few = await dc.classify('matemáticas');
    const many = await dc.classify('álgebra cálculo ecuación matriz derivada integral probabilidad');
    expect(many.confidence).toBeGreaterThanOrEqual(few.confidence);
  });
});

describe('DomainClassifier — engine ready, high confidence', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('usa resultado semántico cuando confianza >= 0.30', async () => {
    jest.doMock('../../embedding-engine', () => ({
      EmbeddingEngine: {
        getInstance: () => ({
          isReady: () => true,
          classify: jest.fn().mockResolvedValue({ id: 'fisica', confidence: 0.72 }),
        }),
      },
    }));

    const { DomainClassifier: DC } = await import('../domain-classifier');
    const dc = new DC();
    const result = await dc.classify('qué es la relatividad general de einstein');

    expect(result.domain).toBe('fisica');
    expect(result.confidence).toBe(0.72);
  });

  test('usa keyword fallback cuando confianza semántica < 0.30', async () => {
    jest.doMock('../../embedding-engine', () => ({
      EmbeddingEngine: {
        getInstance: () => ({
          isReady: () => true,
          // Returns low confidence — should trigger keyword fallback
          classify: jest.fn().mockResolvedValue({ id: 'filosofia', confidence: 0.10 }),
        }),
      },
    }));

    const { DomainClassifier: DC } = await import('../domain-classifier');
    const dc = new DC();
    // Keywords for psicologia should win in fallback
    const result = await dc.classify('qué es la ansiedad y la depresión en psicología');

    // keyword fallback should detect psicologia
    expect(result.domain).toBe('psicologia');
  });
});
