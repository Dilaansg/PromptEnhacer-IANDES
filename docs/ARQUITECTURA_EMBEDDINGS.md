# Arquitectura del Motor de Embeddings

## Resumen

IAndes V6 integra un motor de embeddings semánticos basado en `all-MiniLM-L6-v2` (vía Transformers.js) para mejorar la clasificación de prompts en español. El motor convierte texto en vectores de 384 dimensiones y compara similitud coseno contra vectores "ancla" pre-computados.

## Flujo de Datos

```
Input del usuario
    │
    ▼
[Capa A] EmbeddingEngine.classify(TYPE_ANCHORS) → tipo
         EmbeddingEngine.classify(INTENT_ANCHORS) → intención
         DomainClassifier.classify(DOMAIN_ANCHORS) → dominio académico
    │
    ▼
[Capa B] QuestionSelector usa confidence para decidir cuántas preguntas hacer
    │
    ▼
[Capa C] TemplateEngine selecciona template por similitud semántica
         Usa el dominio detectado para activar flags (isMath, isHistory, etc.)
    │
    ▼
SuperPrompt generado
```

## Componentes Principales

### 1. EmbeddingEngine (`src/pipeline/embedding-engine.ts`)

- **Singleton**: Una única instancia compartida en el Service Worker.
- **Modelo local**: Carga desde `chrome-extension://<id>/models/all-MiniLM-L6-v2/` (ONNX int8).
- **Sin descargas de red**: `allowRemoteModels = false`.
- **Cache LRU**: 50 entradas para evitar recomputar embeddings frecuentes.
- **Métodos clave**:
  - `initialize()`: Carga el pipeline `feature-extraction`.
  - `embed(text)`: Devuelve `Float32Array(384)`.
  - `cosineSimilarity(a, b)`: Producto punto (vectores normalizados).
  - `classify(input, anchorSet)`: Devuelve `{ id, confidence }` del anchor más cercano.

### 2. DomainClassifier (`src/pipeline/layer-a/domain-classifier.ts`)

- **Encapsulación**: Módulo dedicado a identificar el dominio académico.
- **Doble Estrategia**:
  - **Semántica**: Similitud coseno contra centroides de dominio (Threshold: 0.30).
  - **Fallback**: Búsqueda por keywords exactas en `DOMAIN_KEYWORDS`.

### 3. Anchors (`src/data/anchor-definitions.ts`)

Frases de referencia agrupadas en cuatro niveles:

| Nivel | Cantidad | Ejemplo de key |
|-------|----------|----------------|
| types | 7 categorías | `informacion`, `generacion`, `codigo`... |
| intents | 4 por tipo | `informacion.definicion`, `codigo.debug`... |
| domains | 12 dominios | `matematicas`, `historia`, `psicologia`... |
| attributes | 9 atributos | `nivel:basico`, `tono:formal`... |
| templates | ~30 templates | `informacion/definicion`, `codigo/debug`... |

### 3. Vectores Pre-computados (`src/data/anchor-embeddings.json`)

Generados offline por `scripts/generate-anchors.ts`. 

- **Categorías (Layer A)**: Se promedia el embedding de todas sus frases anchor y se normaliza. Esto permite que en runtime solo se necesite **un único embed** por input del usuario.
- **Templates (Layer C)**: Se pre-computa el vector de una versión "limpia" (sin sintaxis Handlebars) de cada plantilla disponible. En runtime, `TemplateEngine` realiza una búsqueda semántica contra estos vectores pre-calculados, eliminando la necesidad de realizar inferencia en tiempo de ejecución para la selección de plantillas.


### 4. Fallback Legacy

Si el modelo no carga (por ejemplo, WASM no disponible), `LayerA` usa automáticamente el `TypeScorer` basado en triggers de keywords. Esto garantiza que la extensión nunca quede inoperativa.

## Decisiones Técnicas

| Decisión | Rationale |
|----------|-----------|
| **Service Worker** | Evita restricciones CSP de Content Scripts. Tiene acceso nativo a WASM. |
| **Modelo int8** | `model_quantized.onnx` (~23MB) es la versión más ligera. Balance entre precisión y tamaño. |
| **all-MiniLM-L6-v2** | Rápido, buena precisión en inglés, aceptable en español (~80%). Se evaluará upgrade a multilingüe en futuras iteraciones. |
| **Pre-computar anchors** | Reduce latencia de runtime a <10ms por clasificación (benchmark: ~5ms por frase). |
| **Promedio de frases por categoría** | Robustez: una frase outlier no desvía el vector de la categoría. |

## Riesgos Mitigados

| Riesgo | Mitigación |
|--------|------------|
| Modelo no carga | Fallback al scorer legacy |
| Latencia alta | Cache LRU + anchors pre-computados |
| Español coloquial | Anchors definidos en español nativo |
| CSP bloquea WASM | Ejecución exclusiva en Service Worker |

## Estructura de Archivos

```
src/
├── pipeline/
│   ├── embedding-engine.ts          # Singleton del motor
│   ├── layer-a/
│   │   ├── index.ts                 # Integración embeddings + fallback
│   │   └── scorer.ts                # Fallback legacy (intacto)
│   ├── layer-b/
│   │   └── question-selector.ts     # Confianza-driven
│   └── layer-c/
│       └── template-engine.ts       # Selección semántica + enrichContext
├── data/
│   ├── anchor-definitions.ts        # Frases anchor
│   └── anchor-embeddings.json       # Vectores pre-computados
scripts/
├── generate-anchors.ts              # Script offline
└── benchmark-embeddings.ts          # Benchmark de latencia
models/
└── all-MiniLM-L6-v2/
    ├── onnx/model_quantized.onnx
    ├── tokenizer.json
    └── config.json
```
