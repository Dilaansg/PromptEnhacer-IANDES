import { pipeline, env } from '@xenova/transformers';

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

export class EmbeddingEngine {
  private static instance: EmbeddingEngine | null = null;
  private model: any = null;
  private initializationPromise: Promise<void> | null = null;
  private readonly embeddingCache = new LRUCache<string, Float32Array>(50);

  static getInstance(): EmbeddingEngine {
    if (!EmbeddingEngine.instance) {
      EmbeddingEngine.instance = new EmbeddingEngine();
    }
    return EmbeddingEngine.instance;
  }

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      console.log('[EmbeddingEngine] Starting initialization...');
      try {
        env.localModelPath = chrome.runtime.getURL('models/');
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        
        // Configure WASM paths for ONNX Runtime
        env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('/');
        env.backends.onnx.wasm.proxy = false;
        env.backends.onnx.wasm.numThreads = 1;
        env.useBrowserCache = false;

        this.model = await pipeline(
          'feature-extraction',
          'multilingual-e5-small',
          {
            local_files_only: true,
            revision: 'main',
          }
        );
        console.log('[EmbeddingEngine] Initialization complete');
      } catch (err) {
        console.error('[EmbeddingEngine] Initialization failed:', err);
        this.initializationPromise = null;
        throw err;
      }
    })();

    return this.initializationPromise;
  }

  isReady(): boolean {
    return this.model !== null;
  }

  /**
   * Embed text with optional E5 prefix.
   *
   * The multilingual-e5-small model was trained with asymmetric prefixes:
   *   "query: "  — for user inputs / search queries
   *   "passage: " — for documents / anchor texts
   *
   * Without the prefix, semantic similarity degrades ~30-40%.
   */
  async embed(text: string, prefix?: 'query' | 'passage'): Promise<Float32Array> {
    const cacheKey = prefix ? `${prefix}:${text}` : text;
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) return cached;

    if (!this.model) {
      throw new Error('EmbeddingEngine not initialized. Call initialize() first.');
    }

    const modelInput = prefix ? `${prefix}: ${text}` : text;

    const output = await this.model(modelInput, {
      pooling: 'mean',
      normalize: true,
    });

    const vec = new Float32Array(output.data);
    this.embeddingCache.set(cacheKey, vec);
    return vec;
  }

  async getCentroid(texts: string[], prefix?: 'query' | 'passage'): Promise<Float32Array | null> {
    if (texts.length === 0) return null;
    
    const embeddings = await Promise.all(texts.map(t => this.embed(t, prefix)));
    const dimension = embeddings[0].length;
    const centroid = new Float32Array(dimension).fill(0);
    
    for (const emb of embeddings) {
      for (let i = 0; i < dimension; i++) {
        centroid[i] += emb[i];
      }
    }
    
    for (let i = 0; i < dimension; i++) {
      centroid[i] /= embeddings.length;
    }
    
    // Normalize result
    return this.normalize(centroid);
  }

  private normalize(vector: Float32Array): Float32Array {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) sumSq += vector[i] * vector[i];
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < vector.length; i++) {
      if (norm > 0) vector[i] /= norm;
    }
    return vector;
  }

  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  async classify(
    input: string,
    anchorSet: Record<string, Float32Array>
  ): Promise<{ id: string; confidence: number }> {
    // User input is a query → prefix for E5 model
    const inputVec = await this.embed(input, 'query');
    let bestId = '';
    let bestScore = -1;

    for (const [id, anchorVec] of Object.entries(anchorSet)) {
      const score = this.cosineSimilarity(inputVec, anchorVec);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return { id: bestId, confidence: bestScore };
  }
}
