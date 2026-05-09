import { EmbeddingEngine } from '../embedding-engine';

// Mock chrome.runtime for node test environment
(globalThis as unknown as Record<string, unknown>).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://mock/${path}`,
  },
};

describe('EmbeddingEngine', () => {
  afterEach(() => {
    // Reset singleton instance between tests
    (EmbeddingEngine as unknown as { instance: EmbeddingEngine | null }).instance = null;
  });

  it('should be a singleton', () => {
    const e1 = EmbeddingEngine.getInstance();
    const e2 = EmbeddingEngine.getInstance();
    expect(e1).toBe(e2);
  });

  it('should report not ready before initialization', () => {
    const engine = EmbeddingEngine.getInstance();
    expect(engine.isReady()).toBe(false);
  });

  it('should calculate cosine similarity of orthogonal vectors as 0', () => {
    const engine = EmbeddingEngine.getInstance();
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(engine.cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('should calculate cosine similarity of identical vectors as 1', () => {
    const engine = EmbeddingEngine.getInstance();
    const a = new Float32Array([0.5, 0.5, 0.5]);
    const b = new Float32Array([0.5, 0.5, 0.5]);
    expect(engine.cosineSimilarity(a, b)).toBeCloseTo(0.75, 5); // dot product of non-normalized
  });

  it('should calculate cosine similarity of opposite vectors as -1', () => {
    const engine = EmbeddingEngine.getInstance();
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([-1, 0, 0]);
    expect(engine.cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('should classify correctly with mock anchors', async () => {
    const engine = EmbeddingEngine.getInstance();
    // Mock the model to return controlled embeddings
    const mockEmbed = jest.fn();
    (engine as unknown as { model: unknown; embed: typeof mockEmbed }).model = {};
    (engine as unknown as { embed: typeof mockEmbed }).embed = mockEmbed;

    mockEmbed.mockImplementation((text: string) => {
      if (text.includes('python')) return Promise.resolve(new Float32Array([1, 0, 0]));
      return Promise.resolve(new Float32Array([0, 1, 0]));
    });

    const anchors = {
      codigo: new Float32Array([1, 0, 0]),
      informacion: new Float32Array([0, 1, 0]),
    };

    const result = await engine.classify('escribe código en python', anchors);
    expect(result.id).toBe('codigo');
    expect(result.confidence).toBeCloseTo(1, 5);
  });
});
