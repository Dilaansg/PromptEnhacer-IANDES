export const env = {
  localModelPath: '',
  allowRemoteModels: true,
  allowLocalModels: true,
  backends: {
    onnx: {
      wasm: {
        wasmPaths: '',
        proxy: false,
        numThreads: 1,
      },
    },
  },
  useBrowserCache: false,
};

export async function pipeline(
  _task: string,
  _model: string,
  _options?: Record<string, unknown>
) {
  return async (text: string, _opts?: Record<string, unknown>) => {
    const dim = 384;
    const data = new Float32Array(dim);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < dim; i++) {
      data[i] = Math.sin(hash + i) * 0.1;
    }
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += data[i] * data[i];
    }
    norm = Math.sqrt(norm);
    for (let i = 0; i < dim; i++) {
      data[i] /= norm || 1;
    }
    return { data };
  };
}
