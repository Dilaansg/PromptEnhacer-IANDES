# IAndes v6

> Asistente de ingeniería de prompts para ChatGPT, Claude y Gemini — Chrome Extension Manifest V3

IAndes analiza tu prompt y lo convierte en un "super prompt" estructurado, contextualizado y optimizado mediante un pipeline de IA de 3 capas y embeddings semánticos locales.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
npm run build
```

Luego cargar `dist/` como extensión descomprimida en `chrome://extensions`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Build de producción (`tsc --noEmit && vite build`) |
| `npm test` | Suite de tests (Jest, ~415 tests) |
| `npm run generate:anchors` | Regenerar vectores ancla tras modificar `src/data/anchor-definitions.ts` |

## Arquitectura

```
src/
├── background/         # Service Worker (host del pipeline + ONNX)
├── content/            # Content scripts (ChatGPT, Claude, Gemini)
├── panel/              # UI del Side Panel
├── pipeline/
│   ├── embedding-engine.ts  # Singleton ONNX (multilingual-e5-small)
│   ├── layer-a/             # Clasificación semántica + dominio
│   ├── layer-b/             # Preguntas adaptativas
│   └── layer-c/             # Generación de SuperPrompt
├── data/
│   ├── anchor-definitions.ts    # Frases ancla (~100 entradas)
│   ├── anchor-embeddings.json   # Vectores pre-computados
│   └── prompt-types.ts          # Registro de tipos de prompt
├── shared/             # Tipos TypeScript compartidos
└── manifest.json       # Manifest V3
```

## Modelo

`multilingual-e5-small` (118 MB, 384 dims) ejecutado localmente vía ONNX Runtime. Soporta 94 idiomas incluido español. **No requiere internet.**

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [README_FOR_DUMMIES.md](README_FOR_DUMMIES.md) | Guía para usuarios no técnicos |
| [AGENTS.md](AGENTS.md) | Guía para desarrollar con agentes IA |
| [CHANGELOG.md](CHANGELOG.md) | Historial de versiones |
| [docs/ARQUITECTURA_EMBEDDINGS.md](docs/ARQUITECTURA_EMBEDDINGS.md) | Diseño del motor semántico |
| [docs/PIPELINE_DEV.md](docs/PIPELINE_DEV.md) | Cómo modificar el pipeline |
| [docs/SIDEPANEL.md](docs/SIDEPANEL.md) | Cómo manejar el Side Panel |
| [docs/USO_ANCHORS.md](docs/USO_ANCHORS.md) | Guía de anchors y embeddings |
| [docs/API_PIPELINE.md](docs/API_PIPELINE.md) | Interfaces y tipos del pipeline |
| [docs/ANALISIS_EMBEDDINGS_PIPELINE.md](docs/ANALISIS_EMBEDDINGS_PIPELINE.md) | Análisis y plan de mejoras ejecutado |
