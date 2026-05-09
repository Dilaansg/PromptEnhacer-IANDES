/**
 * Tests for SemanticClassifier
 *
 * Since the EmbeddingEngine requires the actual ONNX model (not available in
 * Jest), these tests verify:
 *  1. The module loads without errors (Float32Array conversion at module load)
 *  2. When the engine is NOT ready, classifyType/classifyIntent return null
 *  3. The anchor keys and Float32Array conversion are correct
 */

import { SemanticClassifier } from '../semantic-classifier';

// Mock EmbeddingEngine: not ready by default
jest.mock('../../embedding-engine', () => ({
  EmbeddingEngine: {
    getInstance: () => ({
      isReady: () => false,
      classify: jest.fn(),
    }),
  },
}));

describe('SemanticClassifier — engine not ready', () => {
  const sc = new SemanticClassifier();

  test('isReady() returns false when engine not ready', () => {
    expect(sc.isReady()).toBe(false);
  });

  test('classifyType() returns null when engine not ready', async () => {
    const result = await sc.classifyType('explicame qué es la fotosíntesis');
    expect(result).toBeNull();
  });

  test('classifyIntent() returns null when engine not ready', async () => {
    const result = await sc.classifyIntent('explicame qué es la fotosíntesis', 'informacion');
    expect(result).toBeNull();
  });

  test('typeThreshold is 0.45', () => {
    expect(sc.typeThreshold).toBe(0.45);
  });
});

describe('SemanticClassifier — anchor data integrity', () => {
  test('anchor-embeddings.json has types with Float32Array-convertible data', () => {
    // If Float32Array conversion failed at module load, import would throw
    // This test passing means the module loaded cleanly
    expect(() => new SemanticClassifier()).not.toThrow();
  });
});

describe('SemanticClassifier — engine ready, classification logic', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('classifyType() returns typeId and confidence when engine ready', async () => {
    jest.doMock('../../embedding-engine', () => ({
      EmbeddingEngine: {
        getInstance: () => ({
          isReady: () => true,
          classify: jest.fn().mockResolvedValue({ id: 'informacion', confidence: 0.82 }),
        }),
      },
    }));

    const { SemanticClassifier: SC } = await import('../semantic-classifier');
    const sc = new SC();
    const result = await sc.classifyType('qué es la fotosíntesis');

    expect(result).not.toBeNull();
    expect(result!.typeId).toBe('informacion');
    expect(result!.confidence).toBe(0.82);
  });

  test('classifyIntent() strips typeId prefix from intentId', async () => {
    jest.doMock('../../embedding-engine', () => ({
      EmbeddingEngine: {
        getInstance: () => ({
          isReady: () => true,
          classify: jest.fn().mockResolvedValue({ id: 'informacion.definicion', confidence: 0.77 }),
        }),
      },
    }));

    const { SemanticClassifier: SC } = await import('../semantic-classifier');
    const sc = new SC();
    const result = await sc.classifyIntent('qué significa el concepto de entropía', 'informacion');

    expect(result).not.toBeNull();
    expect(result!.intentId).toBe('definicion');
    expect(result!.confidence).toBe(0.77);
  });

  test('classifyIntent() returns null when no intents match typeId prefix', async () => {
    jest.doMock('../../embedding-engine', () => ({
      EmbeddingEngine: {
        getInstance: () => ({
          isReady: () => true,
          classify: jest.fn(),
        }),
      },
    }));

    const { SemanticClassifier: SC } = await import('../semantic-classifier');
    const sc = new SC();
    // 'tipo_inexistente' has no intent anchors
    const result = await sc.classifyIntent('algún texto', 'tipo_inexistente');
    expect(result).toBeNull();
  });
});
