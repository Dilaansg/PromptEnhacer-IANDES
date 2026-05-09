import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const copyManifest = () => ({
  name: 'copy-manifest',
  writeBundle() {
    try {
      const dist = resolve(__dirname, 'dist');
      mkdirSync(dist, { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/manifest.json'),
        resolve(dist, 'manifest.json')
      );

      // Copy panel & tuto pages BEFORE deleting src/ directory
      const pageFiles = [
        { src: resolve(dist, 'src', 'panel', 'index.html'), dest: resolve(dist, 'panel.html'), name: 'panel' },
        { src: resolve(dist, 'src', 'tuto', 'index.html'), dest: resolve(dist, 'tuto.html'), name: 'tuto' },
      ];

      for (const { src, dest, name } of pageFiles) {
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`[copy-manifest] ${name}.html moved to dist root`);
        } else {
          console.warn(`[copy-manifest] ${name} source not found at`, src);
        }
      }

      // Now safe to delete dist/src/
      if (existsSync(resolve(dist, 'src'))) {
        rmSync(resolve(dist, 'src'), { recursive: true, force: true });
        console.log('[copy-manifest] src/ directory removed from dist');
      }

      // Copy models directory for Service Worker ONNX access
      const modelsSrc = resolve(__dirname, 'models');
      const modelsDest = resolve(dist, 'models');
      if (existsSync(modelsSrc)) {
        cpSync(modelsSrc, modelsDest, { recursive: true, force: true });
        console.log('[copy-manifest] models copied to dist');
      } else {
        console.warn('[copy-manifest] models directory not found at', modelsSrc);
      }

      // Copy assets directory from src to dist
      const assetsSrc = resolve(__dirname, 'src/assets');
      const assetsDest = resolve(dist, 'assets');
      if (existsSync(assetsSrc)) {
        cpSync(assetsSrc, assetsDest, { recursive: true, force: true });
        console.log('[copy-manifest] assets copied to dist');
      }

      // Copy ONNX Runtime WASM files
      const ortWasmSrc = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
      if (existsSync(ortWasmSrc)) {
        const wasmFiles = ['ort-wasm-simd.wasm', 'ort-wasm.wasm', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-threaded.wasm'];
        wasmFiles.forEach(file => {
          const src = resolve(ortWasmSrc, file);
          if (existsSync(src)) {
            copyFileSync(src, resolve(dist, file));
          }
        });
        console.log('[copy-manifest] ONNX WASM files copied to dist');
      }
    } catch (e) {
      console.error('Failed to copy extension assets', e);
    }
  },
});

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        panel: resolve(__dirname, 'src/panel/index.html'),
        tuto: resolve(__dirname, 'src/tuto/index.html'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@pipeline': resolve(__dirname, 'src/pipeline'),
    },
  },
  plugins: [copyManifest()],
});
