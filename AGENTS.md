# AGENTS.md — IAndes v6

Compact guide for OpenCode sessions working on this Chrome Extension Manifest V3 project.

## Build & Development

- `npm run dev` — Vite dev mode (still requires loading `dist/` into Chrome as unpacked extension).
- `npm run build` — `tsc --noEmit && vite build`. Type-checking is strict; unused locals/parameters will fail the build.
- Build output is `dist/`. The Vite config has a **custom post-build plugin** (`copyManifest`) that:
  - Copies `src/manifest.json` → `dist/manifest.json`
  - Moves `dist/src/panel/index.html` → `dist/panel.html` (expected by manifest)
  - Copies `models/` recursively into `dist/`
  - Copies ONNX Runtime WASM files from `node_modules/onnxruntime-web/dist`
  - **If you change manifest paths, add new WASM files, or reorganize `src/panel/`, update the plugin.**

## Testing

- **Unit tests**: `npm test` (Jest, `jest.config.cjs`). Tests live in `src/**/__tests__/**/*.test.ts`.
- **Manual/Integration scripts**: `npm run test:all` runs `test_layer1.js && test_classify.js && test_dedup.js`. **These files do not currently exist in the repo** — the package.json scripts are placeholders.
- `npm run ci:verify` runs `test:all` + two echo stubs (`test:integration`, `test:sandbox`).
- Jest mocks `@xenova/transformers` at `__mocks__/@xenova/transformers.ts` and CSS imports at `__mocks__/styleMock.js`.

## Architecture & Constraints

### Three Entry Points (Vite `rollupOptions.input`)
1. `src/background/service-worker.ts` — Pipeline host + ONNX model runtime.
2. `src/content/index.ts` — Content script injected on ChatGPT/Claude/Gemini.
3. `src/panel/index.html` — Side panel UI.

### Service Worker is the Only Place ONNX Runs
- Chrome extension CSP blocks WASM in content scripts. The Service Worker shim patches `URL.createObjectURL` (not available in SW).
- `EmbeddingEngine` is a singleton initialized in the SW. It loads the local ONNX model from `chrome-extension://<id>/models/`.
- **Never try to load `@xenova/transformers` or the model inside content scripts or the panel.**

### Path Aliases
- `@/*` → `src/*`, `@shared/*` → `src/shared/*`, `@pipeline/*` → `src/pipeline/*`
- Defined in `tsconfig.json`, `vite.config.ts`, and `jest.config.cjs`. **Adding a new alias requires updating all three.**

### Content Script DOM Handling
- Target sites are React SPAs (ChatGPT, Claude, Gemini). Inputs mount lazily.
- `IAndesContentScript` uses a `MutationObserver` + a 10-second `waitForReady` fallback to detect when the chat input appears.
- Adding a new site requires: manifest `host_permissions` + `content_scripts.matches` + a new site adapter in `src/content/site-adapters/`.

## Codegen & Data

### Regenerating Anchor Embeddings
If you modify anchor phrases in `scripts/generate-anchors.ts` or `src/data/anchor-definitions.ts`, regenerate the pre-computed vectors (now optimized with batching):

```bash
npm run generate:anchors
```

This writes to `src/data/anchor-embeddings.json`. It uses `npx tsx` for fast execution and correct module resolution. You can override the model with `MODEL_ID="model-name" npm run generate:anchors`.

### Pipeline Flow
1. **Layer A** (`layer-a/index.ts`): Semantic classification of intent (via `EmbeddingEngine`) and academic domain (via `DomainClassifier`). Fallback to keyword-based `TypeScorer` if model fails.
2. **Layer B** (`layer-b/question-selector.ts`): Adaptive questioning based on Layer A confidence. High confidence (>0.85) → max 2 questions; low (≤0.6) → max 3.
3. **Layer C** (`layer-c/template-engine.ts`): Async template selection by semantic similarity. Templates use Handlebars-like `{{#if context}}` guards to avoid rendering empty variables.

## TypeScript Strictness

`tsconfig.json` enforces:
- `noUnusedLocals`, `noUnusedParameters`
- `noImplicitReturns`, `noFallthroughCasesInSwitch`
- `strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`

The build will fail if you leave unused imports or variables.

## Scripts/tsconfig

Scripts in `scripts/` use a separate `tsconfig.scripts.json` (NodeNext module resolution, ES2022). They can import from `src/` via the same path aliases.

## Important Files

- `src/manifest.json` — Extension manifest (copied to `dist/` by build plugin).
- `src/data/anchor-embeddings.json` — Pre-computed embedding vectors (regenerated offline).
- `docs/ARQUITECTURA_EMBEDDINGS.md` — Deep dive into the semantic engine.
- `docs/API_PIPELINE.md` — Pipeline interfaces and data flow.
- `CHANGELOG.md` — Version history and migration notes.
