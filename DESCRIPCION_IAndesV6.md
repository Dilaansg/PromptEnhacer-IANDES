# IAndes v6 — Descripción General del Proyecto

> Chrome Extension Manifest V3 — Asistente de ingeniería de prompts para ChatGPT, Claude y Gemini.

---

## 1. Identidad

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `iandes-chrome-extension` |
| **Versión** | `6.0.0` |
| **Tipo** | Chrome Extension Manifest V3 |
| **Modelo ONNX** | `multilingual-e5-small` (118 MB, 384 dims, 94 idiomas) |
| **Runtime ML** | `onnxruntime-web` (WASM, ejecución 100% local sin internet) |
| **Lenguaje** | TypeScript 5.4 (estricto: `noUnusedLocals`, `strictNullChecks`, etc.) |
| **Build** | Vite 5.2 con plugin post-build personalizado |
| **Testing** | Jest 29 + `jest-environment-jsdom` (~415 tests) |
| **Package** | ESM (`"type": "module"`) |

---

## 2. Árbol de Directorios

```
IAndesV6/
├── __mocks__/                          # Mocks de Jest
│   ├── @xenova/transformers.ts         #   Mock del pipeline de transformers.js
│   └── styleMock.js                    #   Mock para imports de CSS
├── docs/                               # Documentación técnica
│   ├── ARQUITECTURA_EMBEDDINGS.md      #   Diseño del motor semántico vectorial
│   ├── API_PIPELINE.md                 #   Interfaces y tipos del pipeline
│   ├── PIPELINE_DEV.md                 #   Guía para modificar el pipeline
│   ├── SIDEPANEL.md                    #   Manejo del Side Panel de Chrome
│   ├── USO_ANCHORS.md                  #   Guía de anchors y embeddings
│   ├── ANALISIS_EMBEDDINGS_PIPELINE.md #   Análisis de mejoras ejecutadas
│   └── DEMO_PROMPTS.md                 #   Ejemplos de prompts para demo
├── models/multilingual-e5-small/       # Modelo ONNX local
│   ├── config.json                     #   Configuración del modelo
│   ├── onnx/model_quantized.onnx       #   Modelo ONNX cuantizado
│   ├── tokenizer.json                  #   Tokenizador SentencePiece BPE
│   ├── tokenizer_config.json           #   Config del tokenizador
│   └── special_tokens_map.json         #   Mapa de tokens especiales
├── scripts/                            # Scripts de desarrollo y diagnóstico
│   ├── generate-anchors.ts             #   Precomputa vectores ancla → anchor-embeddings.json
│   ├── batch-diag.ts                   #   Diagnóstico por lotes con TypeScorer
│   ├── benchmark-embeddings.ts         #   Benchmark de velocidad del motor ONNX
│   └── test-domain-classifier.ts       #   Test del clasificador de dominio
├── src/                                # Código fuente principal
│   ├── manifest.json                   #   Chrome Extension Manifest V3
│   ├── assets/logo.png                 #   Icono de la extensión
│   ├── background/
│   │   └── service-worker.ts           #   Service Worker: host del pipeline + ruteo de mensajes
│   ├── content/
│   │   ├── index.ts                    #   Content script: detección de input + MutationObserver
│   │   ├── floating-button.ts          #   Botón flotante "Optimizar" en ChatGPT/Claude/Gemini
│   │   └── site-adapters/
│   │       ├── index.ts                #   Detección de sitio por hostname
│   │       ├── types.ts                #   Interfaz SiteAdapter (getInput, setInput, etc.)
│   │       ├── chatgpt.ts              #   Adapter: ChatGPT (textarea + contenteditable)
│   │       ├── claude.ts               #   Adapter: Claude (contenteditable)
│   │       └── gemini.ts               #   Adapter: Gemini (textarea)
│   ├── panel/
│   │   ├── index.html                  #   Shell HTML del Side Panel
│   │   ├── index.ts                    #   Controlador del panel (máquina de estados)
│   │   ├── components/
│   │   │   ├── comparison-view.ts      #   Vista comparativa: original vs SuperPrompt
│   │   │   ├── questions-view.ts       #   UI de preguntas interactivas
│   │   │   ├── action-buttons.ts       #   Botones "Usar" / "Descartar"
│   │   │   └── metrics-bar.ts          #   Barra de métricas (tipo, intent, tokens, componentes)
│   │   └── styles/main.css             #   Estilos del panel (466 líneas)
│   ├── pipeline/
│   │   ├── embedding-engine.ts         #   Singleton ONNX: modelo, LRU cache, cosine similarity
│   │   ├── types.ts                    #   Re-export @deprecated desde @shared/types
│   │   ├── layer-a/                    #   CAPA A — Clasificación semántica
│   │   │   ├── index.ts                #     Orquestador LayerA.process()
│   │   │   ├── normalizer.ts           #     Limpieza de texto
│   │   │   ├── scorer.ts               #     TypeScorer: keywords + peso posicional
│   │   │   ├── semantic-classifier.ts  #     Clasificación por embeddings vs anclas
│   │   │   ├── domain-classifier.ts    #     13 dominios académicos
│   │   │   ├── entity-extractor.ts     #     Tópico, contexto, audiencia, idioma
│   │   │   ├── attribute-detector.ts   #     Nivel, formato, tono, audiencia
│   │   │   └── complexity-analyzer.ts  #     Completitud y vaguedad
│   │   ├── layer-b/                    #   CAPA B — Preguntas adaptativas
│   │   │   ├── index.ts                #     Orquestador (sesión + timeout 60s)
│   │   │   ├── question-selector.ts    #     Selección por confianza (>0.85 / 0.6-0.85 / ≤0.6)
│   │   │   ├── question-schemas.ts     #     Definiciones tipadas por tipo
│   │   │   ├── question-bank.ts        #     Banco estático (legacy)
│   │   │   └── answer-normalizer.ts    #     Respuestas a valores canónicos
│   │   └── layer-c/                    #   CAPA C — Generación del SuperPrompt
│   │       ├── index.ts                #     Orquestador: MPC + TemplateEngine fallback
│   │       ├── smart-architect.ts      #     MPC: persona + instrucción + rigor + formato
│   │       ├── template-engine.ts      #     Plantillas Handlebars-like
│   │       ├── quality-scorer.ts       #     Evaluación regex + semántica
│   │       ├── modules/
│   │       │   ├── personas.ts         #       Personas por dominio+tipo
│   │       │   ├── instructions.ts     #       Instrucciones por tarea
│   │       │   ├── formats.ts          #       Formatos de salida
│   │       │   └── academic-rigor.ts   #       Reglas académicas por dominio
│   │       └── templates/              #       12 plantillas monolíticas
│   │           ├── index.ts            #       TEMPLATE_REGISTRY
│   │           ├── informacion.ts / generacion.ts / codigo.ts
│   │           ├── analisis.ts / razonamiento.ts / conversacion.ts
│   │           ├── accion.ts / transformacion.ts
│   │           └── academico-*.ts (3)  #       Sobreescrituras académicas
│   ├── data/
│   │   ├── prompt-types.ts             #   Registro de 8 tipos de prompt con triggers e intents
│   │   ├── anchor-definitions.ts       #   ~100 frases ancla (TYPE, INTENT, ATTRIBUTE, DOMAIN, AUDIENCE)
│   │   ├── anchor-embeddings.json      #   Vectores precomputados (generados con generate-anchors.ts)
│   │   └── anchor-examples.ts          #   Ejemplos adicionales por tipo e intención
│   ├── shared/
│   │   ├── types.ts                    #   Interfaces y tipos compartidos (192 líneas)
│   │   ├── messages.ts                 #   Discriminated union de 13 tipos de mensaje
│   │   ├── constants.ts                #   Keywords de dominio + stop words en español
│   │   ├── logger.ts                   #   LoggerService con niveles (DEBUG/INFO/WARN/ERROR/NONE)
│   │   └── log-collector.ts            #   Buffer circular de logs (500 entradas)
│   ├── tuto/index.html                 #   Página de tutorial standalone
│   └── types/css.d.ts                  #   Declaración de módulos CSS para TypeScript
├── DATASET_PROMPTS.json                # Dataset de test para clasificación de prompts
├── AGENTS.md                           # Guía de desarrollo para agentes IA
├── CHANGELOG.md                        # Historial de versiones (v6.0.0 → v6.2.0)
├── system_descr.md                     # Descripción de arquitectura (corto, referencia rápida)
├── README.md                           # Documentación principal del proyecto
├── README_SIMPLE.md                    # Guía para usuarios no técnicos
├── package.json                        # Scripts, dependencias, metadatos
├── tsconfig.json                       # Configuración TypeScript (estricto)
├── vite.config.ts                      # Configuración Vite + plugin post-build copyManifest
├── jest.config.cjs                     # Configuración Jest (ts-jest, path aliases, mocks)
└── .eslintrc.json                      # Configuración ESLint
```

---

## 3. Arquitectura General

```
  ChatGPT / Claude / Gemini
           │
           ▼
  ┌─────────────────┐     PROCESS_PROMPT      ┌──────────────────────┐
  │  Content Script  │ ──────────────────────▶ │   Service Worker     │
  │  (MutationObs.)  │                         │                      │
  │  FloatingButton  │ ◀── PIPELINE_RESULT ── │  ┌────────────────┐  │
  └────────┬─────────┘                         │  │ EmbeddingEngine │  │
           │                                   │  │  (ONNX local)   │  │
           │                                   │  └───────┬────────┘  │
           │                                   │          │           │
           │                                   │  ┌───────▼────────┐  │
           │                                   │  │   Layer A      │  │
           │              SHOW_QUESTIONS       │  │ Clasificación  │  │
           │            DISPLAY_RESULT        │  ├────────────────┤  │
           │                                   │  │   Layer B      │  │
           ▼                                   │  │ Preguntas      │  │
  ┌─────────────────┐                         │  ├────────────────┤  │
  │   Side Panel    │ ◀────────────────────── │  │   Layer C      │  │
  │ comparison-view │                         │  │ SuperPrompt    │  │
  │ questions-view  │ ── QUESTIONS_ANSWERED ─▶│  │ (MPC+Template) │  │
  │ action-buttons  │                         │  └────────────────┘  │
  │ metrics-bar     │                         └──────────────────────┘
  └─────────────────┘
```

La extensión tiene **3 entry points** compilados por Vite: `service-worker.js`, `content.js` y `panel.html`. El Service Worker es el único lugar donde se ejecuta ONNX (el CSP de Chrome bloquea WASM en content scripts).

---

## 4. Build & Configuración

### Scripts (`package.json`)

| Comando | Función |
|---------|---------|
| `npm run dev` | Vite en modo desarrollo |
| `npm run build` | Type-check (`tsc --noEmit`) + build Vite |
| `npm test` | Tests Jest (~415 tests) |
| `npm run generate:anchors` | Regenerar `anchor-embeddings.json` desde `anchor-definitions.ts` |
| `npm run ci:verify` | Verificación CI (tests unitarios + stubs de integración/sandbox) |

### Plugin Vite `copyManifest` (post-build)

1. Copia `src/manifest.json` → `dist/manifest.json`
2. Mueve `dist/src/panel/index.html` → `dist/panel.html`
3. Mueve `dist/src/tuto/index.html` → `dist/tuto.html`
4. Copia `models/` → `dist/models/` (modelo ONNX completo)
5. Copia `src/assets/` → `dist/assets/`
6. Copia archivos WASM de `node_modules/onnxruntime-web/dist` a `dist/`

### Path Aliases

`@/*` → `src/*`, `@shared/*` → `src/shared/*`, `@pipeline/*` → `src/pipeline/*`. Definidos en `tsconfig.json`, `vite.config.ts` y `jest.config.cjs`.

### TypeScript Strictness

`noUnusedLocals`, `noUnusedParameters`, `strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.

---

## 5. Manifest V3 (`src/manifest.json`)

- **Permisos**: `sidePanel`, `storage`, `activeTab`
- **Host permissions**: `chatgpt.com/*`, `claude.ai/*`, `gemini.google.com/*`
- **Content script**: inyectado en los 3 sitios LLM, ejecuta `content.js`
- **Service Worker**: `service-worker.js` (type: module), corre en background
- **Side Panel**: `panel.html`, se abre programáticamente
- **CSP**: `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'` (permite WASM en el SW)
- **Web accessible resources**: `models/*`, `assets/*`

---

## 6. Service Worker (`src/background/service-worker.ts`)

Centro neurálgico de la extensión. Funciones principales:

- **Shim WASM**: parchea `URL.createObjectURL` (no disponible en Service Workers) para compatibilidad con ONNX Runtime.
- **Inicialización lazy**: crea instancias de `LayerA`, `LayerB`, `LayerC` y `EmbeddingEngine` bajo demanda.
- **Ruteo de 9 tipos de mensaje**: `PROCESS_PROMPT`, `PASTE_DETECTED`, `PANEL_READY`, `PANEL_CLOSED`, `QUESTIONS_ANSWERED`, `GET_QUESTIONS`, `OPEN_PANEL`, `INJECT_PROMPT`, `OPEN_TUTO`.
- **Paste tracking**: almacena metadata de pegado (texto, longitud, timestamp) con ventana de 30 segundos.
- **Protección contra context invalidation**: maneja errores de extensión recargada/desactivada.
- **sessionId**: previene cross-talk entre sesiones concurrentes.
- **Debug mode**: activable con `toggleIAndesDebug()` en consola del SW.

---

## 7. Pipeline de 3 Capas

### Capa A — Clasificación y Extracción Semántica

Transforma el prompt crudo en un perfil estructurado de intención y contexto.

| Módulo | Función |
|--------|---------|
| `Normalizer` | Limpieza: lowercase, colapso de espacios, preservación de tokens técnicos |
| `TypeScorer` | Clasificación rápida por keywords con peso posicional (fallback heurístico) |
| `SemanticClassifier` | Clasificación principal: embedding del prompt vs centroides de anclas precomputadas (cosine similarity). Determina `type` (8 tipos) e `intent` |
| `DomainClassifier` | Clasifica en 13 dominios académicos (historia, biología, tecnología, matemáticas, filosofía, etc.) — semántico con fallback keyword |
| `EntityExtractor` | Extrae `topic` (tema central), `context` (tecnologías/entorno), `target` (audiencia) y `language` |
| `AttributeDetector` | Detecta `nivel` (básico/intermedio/avanzado), `formato`, `longitud`, `tono` y `audiencia` — híbrido: embeddings + regex + inferencia por tipo |
| `ComplexityAnalyzer` | Puntúa completitud y vaguedad del prompt mediante centroides de referencia |

**8 tipos de prompt** (definidos en `src/data/prompt-types.ts`): `informacion`, `generacion`, `codigo`, `analisis`, `razonamiento`, `conversacion`, `accion`, `transformacion`.

### Capa B — Preguntas Adaptativas

Actúa como puente de retroalimentación cuando la Capa A tiene confianza insuficiente.

| Nivel de confianza | Estrategia | Máx. preguntas |
|---------------------|------------|----------------|
| > 0.85 | Solo dimensiones de alto valor faltantes | 2 |
| 0.6 – 0.85 | Dimensiones ambiguas + confirmación opcional de tipo | 2 |
| ≤ 0.6 | Todas las dimensiones relevantes | 3 |

- **QuestionSelector**: selecciona preguntas según el perfil de confianza.
- **QuestionSchemas**: definiciones tipadas de preguntas por tipo de prompt (624 líneas).
- **QuestionBank**: banco estático legacy de preguntas.
- **AnswerNormalizer**: mapea respuestas crudas del usuario a valores canónicos.
- **Timeout de sesión**: 60 segundos. Las preguntas se muestran en el Side Panel.

### Capa C — Generación del SuperPrompt

Construye el prompt optimizado final usando dos estrategias:

1. **SmartPromptArchitect (MPC — principal)**: composición modular que ensambla:
   - **Persona** experta (por dominio + tipo de tarea)
   - **Instrucción** específica (por tipo de tarea)
   - **Reglas de rigor** académico (si aplica)
   - **Constraints** (nivel, tono, formato, longitud, audiencia)
   - **Formato de salida** (tabla, lista, paso a paso, párrafos, etc.)
   - **Contexto y prompt original**

2. **TemplateEngine (fallback)**: plantillas Handlebars-like con renderizado condicional (`{{#if context}}`, `{{#if isTech}}`, etc.). 12 plantillas monolíticas que cubren combinaciones tipo×intención, con sobreescrituras académicas para historia, filosofía y ciencias.

- **QualityScorer**: evalúa el resultado (regex + similitud semántica contra prompts ideales).
- **Modules**: 4 registros — `personas.ts`, `instructions.ts`, `formats.ts`, `academic-rigor.ts`.

---

## 8. Motor de Embeddings (`src/pipeline/embedding-engine.ts`)

Singleton que encapsula el modelo ONNX. Características:

- **Modelo**: `intfloat/multilingual-e5-small`, ONNX cuantizado, 384 dimensiones.
- **Tokenizer**: SentencePiece BPE (archivos `tokenizer.json` + `sentencepiece.bpe.model`).
- **Carga**: desde URL local (`chrome.runtime.getURL('models/')`), sin descarga de red.
- **LRU cache**: 50 entradas para evitar re-cómputos.
- **Operaciones**: `embed(text)` → vector 384-dim, `cosineSimilarity(a, b)`, `classifyByCentroids(text, centroids)`, `computeCentroid(texts)`.
- **Inicialización**: una sola vez al arranque del Service Worker. Si falla, todo el pipeline usa fallbacks heurísticos.

---

## 9. Content Script (`src/content/`)

Inyectado en ChatGPT, Claude y Gemini. Responsable de:

- **Detección de sitio**: `site-adapters/index.ts` identifica el hostname y selecciona el adapter adecuado.
- **MutationObserver**: monitorea el DOM para detectar cuándo aparece el input de chat (los 3 sitios son React SPAs con montaje lazy).
- **Fallback de 10 segundos**: `waitForReady()` reintenta periódicamente si el Observer no detecta el input.
- **FloatingButton**: botón "Optimizar" que aparece sobre el input de chat. Al hacer click, lee el texto del prompt y envía `PROCESS_PROMPT` al SW.
- **Intercepción de pegado**: detecta pegado de texto >60% del tamaño total → envía `PASTE_DETECTED` para activar modo contexto.
- **Recepción de resultados**: escucha `PIPELINE_RESULT` e `INJECT_PROMPT` para inyectar el SuperPrompt en el chat.

### Site Adapters (`site-adapters/`)

Cada adapter implementa la interfaz `SiteAdapter` con métodos `getInput()`, `setInput(text)`, `detectSite()` y `getInputSelector()`. Selectores específicos:

| Adapter | Input type | Selector |
|---------|-----------|----------|
| `chatgpt.ts` | textarea + contenteditable div | `#prompt-textarea`, `[contenteditable="true"]` |
| `claude.ts` | contenteditable div | `[contenteditable="true"]` |
| `gemini.ts` | textarea | `textarea` |

---

## 10. Panel UI (`src/panel/`)

Side Panel de Chrome que se abre a la derecha del navegador. Máquina de estados con 5 vistas:

| Estado | Vista | Descripción |
|--------|-------|-------------|
| `empty` | Mensaje inicial | "Escribe un prompt en ChatGPT para empezar" |
| `loading` | Spinner | Pipeline en progreso |
| `questions` | `QuestionsView` | Preguntas interactivas con opciones |
| `result` | `ComparisonView` | Original vs SuperPrompt lado a lado |
| `error` | Mensaje de error | Fallo en el pipeline |

### Componentes

- **`ComparisonView`**: dos textareas editables (original + SuperPrompt), permite editar antes de inyectar.
- **`QuestionsView`**: renderiza preguntas con opciones cliqueables, envía `QUESTIONS_ANSWERED` al SW.
- **`ActionButtons`**: "Usar este prompt" (envía `INJECT_PROMPT`) y "Descartar" (cierra/vuelve a empty).
- **`MetricsBar`**: muestra metadata del análisis: tipo de prompt, intención, conteo de tokens, componentes detectados.

### Estilos

`styles/main.css` (466 líneas) usa design tokens CSS y tipografía Inter. Soporta tema claro.

---

## 11. Capa Compartida (`src/shared/`)

| Archivo | Contenido |
|---------|-----------|
| `types.ts` | Todas las interfaces del pipeline: `LayerAOutput`, `LayerBOutput`, `LayerCOutput`, `PromptTypeDefinition`, `ClassificationResult`, `QuestionDefinition`, `AnalysisContext`, etc. (192 líneas) |
| `messages.ts` | 13 tipos de mensaje como discriminated union + type guard `isMessage()` (ver sección 12) |
| `constants.ts` | 13 listas de keywords por dominio académico + ~50 stop words en español |
| `logger.ts` | `LogLevel` enum (DEBUG/INFO/WARN/ERROR/NONE) + singleton `LoggerService` |
| `log-collector.ts` | Buffer circular en memoria de 500 entradas para debugging cross-SW/panel |

---

## 12. Protocolo de Mensajes

13 tipos de mensaje que viajan por `chrome.runtime.sendMessage` / `onMessage`:

13 tipos de mensaje (discriminated union en `src/shared/messages.ts`):

**Content Script → Service Worker**: `PROCESS_PROMPT`, `OPEN_PANEL`, `PASTE_DETECTED`
**Panel → Service Worker**: `PANEL_READY`, `PANEL_CLOSED`, `QUESTIONS_ANSWERED`, `GET_QUESTIONS`, `INJECT_PROMPT`
**Service Worker → Panel**: `SHOW_QUESTIONS`, `DISPLAY_RESULT`, `SHOW_LOADING`, `DISPLAY_ERROR`
**Service Worker → Content Script**: `PIPELINE_RESULT`

---

## 13. Capa de Datos (`src/data/`)

- **`prompt-types.ts`** (546 líneas): `PROMPT_TYPE_REGISTRY` con 8 tipos de prompt. Cada tipo define triggers (strong/weak/negative), intenciones, atributos por defecto (nivel, formato, tono, audiencia), y compatibilidad con dominios académicos.

- **`anchor-definitions.ts`** (~1446 líneas): 5 conjuntos de frases ancla escritas a mano:
  - `TYPE_ANCHORS`: ~33 frases por cada uno de los 8 tipos
  - `INTENT_ANCHORS`: ~7 intenciones (definición, comparación, instrucción, etc.)
  - `ATTRIBUTE_ANCHORS`: nivel, formato, tono, longitud, audiencia
  - `DOMAIN_ANCHORS`: 13 dominios académicos
  - `AUDIENCE_ANCHORS`: perfiles de audiencia

- **`anchor-embeddings.json`**: vectores 384-dim precomputados para cada frase ancla. Generado offline con `npm run generate:anchors`. Se carga al inicializar `SemanticClassifier`.

- **`anchor-examples.ts`**: ejemplos adicionales de prompts reales clasificados por tipo e intención.

---

## 14. Testing

### Configuración (`jest.config.cjs`)

- **Preset**: `ts-jest`
- **Environment**: `node` (service worker + pipeline) y `jsdom` para componentes de panel
- **Roots**: `<rootDir>/src`
- **Path aliases**: `@/*`, `@shared/*`, `@pipeline/*` mapeados
- **Mocks**: `@xenova/transformers` y archivos `.css`

### Estructura de Tests

```
src/
├── background/__tests__/service-worker.test.ts
├── content/__tests__/content.test.ts
├── panel/__tests__/panel.test.ts
└── pipeline/__tests__/
    ├── dataset-accuracy.test.ts
    ├── dataset-classification.test.ts
    ├── embedding-engine.test.ts
    ├── integration.test.ts
    ├── pipeline-integration.test.ts
    ├── regression.test.ts
    ├── layer-a/ (4 archivos de test para módulos de Capa A)
    ├── layer-b/ (2 archivos de test)
    └── layer-c/ (2 archivos de test)
```

~415 tests en total. Además existen scripts de test manual (`test_layer1.js`, etc.) referenciados en `package.json` pero que son placeholders (los archivos no existen, se usan stubs echo en CI).

---

## 15. Scripts de Desarrollo

| Script | Ubicación | Función |
|--------|-----------|---------|
| `generate-anchors.ts` | `scripts/` | Carga el modelo ONNX, genera embeddings para cada frase ancla y escribe `anchor-embeddings.json`. Usa `npx tsx` con `tsconfig.scripts.json` (NodeNext, ES2022). Soporta override de modelo vía `MODEL_ID`. |
| `batch-diag.ts` | `scripts/` | Ejecuta todas las entradas de `DATASET_PROMPTS.json` por `TypeScorer` para diagnóstico de clasificación. |
| `benchmark-embeddings.ts` | `scripts/` | Mide velocidad de inferencia del motor ONNX (tiempo por embedding). |
| `test-domain-classifier.ts` | `scripts/` | Test manual del clasificador de dominio con casos de prueba. |

---

## 16. Dependencias

### Runtime

| Paquete | Versión | Uso |
|---------|---------|-----|
| `@xenova/transformers` | ^2.17.2 | Pipeline de transformers.js (wrapper sobre ONNX Runtime) |

### Desarrollo

| Paquete | Versión | Uso |
|---------|---------|-----|
| `typescript` | ^5.4.5 | Type-check estricto |
| `vite` | ^5.2.0 | Build y dev server |
| `jest` | ^29.7.0 | Testing |
| `ts-jest` | ^29.1.2 | Transformación TS en Jest |
| `jest-environment-jsdom` | ^29.7.0 | Entorno DOM para tests de panel |
| `eslint` | ^8.57.0 | Linting |
| `@typescript-eslint/*` | ^7.0.0 | Reglas ESLint para TypeScript |
| `@types/chrome` | ^0.0.268 | Tipos de Chrome Extension API |
| `@types/jest` | ^29.5.12 | Tipos de Jest |

### ONNX Runtime (indirecto)

Los archivos WASM de `onnxruntime-web` se copian a `dist/` por el plugin `copyManifest`. No es una dependencia directa del proyecto sino transitiva de `@xenova/transformers`.

---

## 17. Modelo ONNX

| Propiedad | Valor |
|-----------|-------|
| **Modelo original** | `intfloat/multilingual-e5-small` (HuggingFace) |
| **Dimensiones** | 384 |
| **Idiomas** | 94 (incluye español, inglés, francés, alemán, chino, etc.) |
| **Tamaño en disco** | ~118 MB |
| **Formato** | ONNX cuantizado (`model_quantized.onnx`) |
| **Tokenizer** | SentencePiece BPE |
| **Ubicación** | `models/multilingual-e5-small/` → copiado a `dist/models/` |
| **Carga** | `chrome-extension://<id>/models/` — sin red, 100% local |
| **Inicialización** | Singleton (`EmbeddingEngine.initialize()`) en el Service Worker |

---

## 18. Flujo de Usuario Típico

1. Usuario escribe/escribe un prompt en ChatGPT, Claude o Gemini.
2. Aparece botón flotante "Optimizar" junto al input.
3. Usuario hace click → el content script envía `PROCESS_PROMPT` al Service Worker.
4. Service Worker ejecuta el pipeline: **Capa A** clasifica → **Capa B** evalúa si necesita preguntas.
5. Si **Capa B** necesita información adicional → se abre Side Panel con preguntas interactivas.
6. Usuario responde preguntas → se reanuda el pipeline → **Capa C** genera el SuperPrompt.
7. Side Panel muestra: prompt original vs SuperPrompt generado (con métricas).
8. Usuario hace click en "Usar este prompt" → el SuperPrompt se inyecta en el input del chat.
9. Usuario envía el mensaje optimizado al LLM.

---

## 19. Sitios Soportados

| Sitio | URL | Adapter |
|-------|-----|---------|
| ChatGPT | `chatgpt.com/*` | `chatgpt.ts` |
| Claude | `claude.ai/*` | `claude.ts` |
| Gemini | `gemini.google.com/*` | `gemini.ts` |

Para añadir un nuevo sitio se requiere: (1) entry en `manifest.json` (`host_permissions` + `content_scripts.matches`), (2) nuevo adapter en `site-adapters/` implementando `SiteAdapter`, (3) registro en `site-adapters/index.ts`.
