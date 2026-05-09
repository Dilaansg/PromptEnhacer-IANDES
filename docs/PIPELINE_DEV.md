# Pipeline Development Guide — IAndes v6

> Cómo modificar, extender y depurar el pipeline de 3 capas.

## Estructura

```
src/pipeline/
├── embedding-engine.ts       # Singleton ONNX (multilingual-e5-small)
├── layer-a/
│   ├── index.ts              # Orquestador Capa A
│   ├── normalizer.ts         # Normalización de texto
│   ├── scorer.ts             # TypeScorer (keyword fallback)
│   ├── semantic-classifier.ts # Clasificación por embeddings
│   ├── domain-classifier.ts  # Clasificación de dominio
│   ├── entity-extractor.ts   # Extracción de topic/entidades
│   ├── attribute-detector.ts # Detección de nivel/tono/formato
│   └── complexity-analyzer.ts# Análisis de completitud
├── layer-b/
│   ├── index.ts              # Orquestador Capa B
│   ├── question-selector.ts  # Selección de preguntas
│   ├── question-schemas.ts   # Definiciones de preguntas
│   ├── question-bank.ts      # Banco legacy de preguntas
│   └── answer-normalizer.ts  # Normalización de respuestas
└── layer-c/
    ├── index.ts              # Orquestador Capa C
    ├── smart-architect.ts    # Motor MPC (primary)
    ├── template-engine.ts    # Motor templates (fallback)
    ├── quality-scorer.ts     # Scoring de calidad
    └── modules/
        ├── personas.ts       # Registro de personalidades
        ├── instructions.ts   # Registro de instrucciones
        └── formats.ts        # Registro de formatos
```

## Flujo completo

```
Prompt del usuario
        │
   ┌────▼────┐
   │ Layer A │ Clasifica tipo, intent, dominio, atributos
   └────┬────┘
        │ LayerAOutput { typeId, intentId, domain, attributes, complexity, mode }
   ┌────▼────┐
   │ Layer B │ Selecciona 0-3 preguntas según confianza y complejidad
   └────┬────┘
        │ Si questions > 0 → muestra panel → espera respuestas
        │
   ┌────▼────┐
   │ Layer C │ Genera SuperPrompt con MPC (primary) o TemplateEngine (fallback)
   └────┬────┘
        │ LayerCOutput { superPrompt, ... }
        │
   Se inyecta en el chat
```

## Cómo añadir un nuevo tipo de prompt

### 1. Añadir a `prompt-types.ts`

```typescript
// src/data/prompt-types.ts
{
  id: 'mi_nuevo_tipo',
  label: 'Mi Nuevo Tipo',
  triggers: {
    strong: ['keyword1', 'keyword2'],
    weak: ['keyword3'],
    negative: ['excluir_esto'],
  },
  intents: [
    { id: 'intent1', label: 'Intención 1' },
  ],
}
```

### 2. Añadir TYPE_ANCHORS

```typescript
// src/data/anchor-definitions.ts
export const TYPE_ANCHORS: Record<string, string[]> = {
  // ... existing ...
  'mi_nuevo_tipo': [
    'primera frase de ejemplo',
    'segunda frase de ejemplo',
    // ... ~33 frases
  ],
};
```

### 3. Añadir INTENT_ANCHORS

```typescript
export const INTENT_ANCHORS = {
  // ... existing ...
  'mi_nuevo_tipo.intent1': [
    'frase de ejemplo 1',
    // ... 12 frases
  ],
};
```

### 4. Añadir templates en Layer C

```typescript
// src/pipeline/layer-c/templates/index.ts
import { mi_nuevo_tipo } from './mi-nuevo-tipo';
export const TEMPLATE_REGISTRY = {
  // ... existing ...
  mi_nuevo_tipo,
};
```

Crear `src/pipeline/layer-c/templates/mi-nuevo-tipo.ts` con los templates por intent.

### 5. Añadir instrucciones

```typescript
// src/pipeline/layer-c/modules/instructions.ts
'mi_nuevo_tipo': {
  'intent1': 'Instrucción para intent1. Describe lo que debe hacer.',
}
```

### 6. Regenerar anchors

```bash
npm run generate:anchors
```

## Cómo modificar la clasificación semántica

### Umbrales clave

| Archivo | Variable | Valor | Efecto |
|---------|----------|-------|--------|
| `semantic-classifier.ts` | `TYPE_THRESHOLD` | `0.45` | Confianza mínima para usar clasificación semántica |
| `attribute-detector.ts` | `SEMANTIC_MIN_SCORE` | `0.62` | Similitud coseno mínima para detectar atributo |
| `attribute-detector.ts` | `SEMANTIC_MIN_GAP` | `0.10` | Gap mínimo entre #1 y #2 para evitar falsos positivos |
| `smart-architect.ts` | `_detectTypeMismatch` | — | Señales léxicas que sobreescriben clasificación |
| `layer-a/index.ts` | Lexical override | `≥0.8 + gap≥0.3` | TypeScorer gana al embedding si es muy fuerte |

### Lexical override

Cuando el TypeScorer detecta una señal léxica MUY fuerte (score ≥ 0.8, gap ≥ 0.3) de un tipo diferente al clasificado por el embedding, el keyword **gana**:

```typescript
// layer-a/index.ts
if (scorerTop.id !== typeId && scorerTopScore >= 0.8 && gap >= 0.3) {
  typeId = scorerTop.id;        // ganó el keyword
  mode = 'single';              // limpia multi-mode falso
  intentId = keyword matching;  // intent también por keyword
}
```

### Señales fuertes de tipo

Definidas en `smart-architect.ts` → `_detectTypeMismatch()`. Si el prompt original contiene una señal fuerte de un tipo **diferente** al clasificado, se rechaza MPC y se usa TemplateEngine.

## Cómo modificar las preguntas de Capa B

### Añadir un nuevo schema

```typescript
// src/pipeline/layer-b/question-schemas.ts
{
  id: 'q-my-new-question',
  dimension: 'nivel',
  conditions: {
    types: ['informacion'],        // solo para este tipo
    domains: ['matematicas'],      // solo para este dominio (opcional)
    minDomainConfidence: 0.6,      // confianza mínima de dominio
    requiresMissing: 'nivel',      // solo si nivel no fue detectado
    minConfidence: 0.5,            // solo si confianza ≥ 0.5
  },
  question: '¿Mi pregunta?',
  options: ['Opción A', 'Opción B'],
  mapsTo: 'nivel',
  normalize: {
    'Opción A': 'basico',
    'Opción B': 'avanzado',
  },
}
```

### Prioridad de dimensiones

```typescript
const DIMENSION_PRIORITY = [
  'paste_action', 'tipo', 'nivel', 'intencion',
  'proposito', 'materia', 'nivel_curso', 'tipo_texto',
  'formato', 'tono', 'longitud', 'audiencia', 'contexto',
];
```

### Estrategias de selección

| Confianza | Estrategia | Máx preguntas |
|-----------|-----------|---------------|
| > 0.85 | `_selectMissing` — solo dimensiones HIGH_VALUE faltantes | 1-3 (dinámico por complejidad) |
| 0.6 - 0.85 | `_selectMissing` — idem | 1-3 |
| < 0.6 | `_selectAll` — todas las disparadas | máx(3, complexity) |

El límite exacto lo determina `complexity-analyzer.ts`: prompts completos → 1 pregunta, prompts vagos → 3-4.

## Cómo modificar la generación de SuperPrompts (Layer C)

### SmartPromptArchitect (MPC — primary)

Ensambla el SuperPrompt por módulos en orden:

1. **Persona** — `getPersona(domain, typeId)` con cascade: type+domain > type solo > domain solo > default
2. **Instrucción** — `selectBestInstruction()` compara embedding del prompt contra TEMPLATE_ANCHORS para override semántico del intent
3. **Constraints** — nivel, tono, longitud (solo si el usuario los pidió explícitamente)
4. **Audiencia** — solo si no es "personal"
5. **Formato** — solo si no es "parrafos" (default)
6. **Extra context** — propósito, materia, nivel_curso (flujos académicos)

### TemplateEngine (fallback)

Se usa cuando MPC no es viable (prompt muy corto, sin persona, tipo mismatch). Selecciona templates por similitud coseno contra TEMPLATE_ANCHORS_F32.

### Verificación de valor agregado

```typescript
// layer-c/index.ts — Mejora #10
const similarity = cosineSimilarity(embed(originalPrompt), embed(superPrompt));
if (similarity > 0.92) {
  console.warn('SuperPrompt demasiado similar al original');
}
```

## Cómo debuggear

### Logs en vivo

1. Abre `chrome://extensions` → IAndes → click en **service worker**
2. Busca `[LayerA]`, `[QuestionSelector]`, `[LayerC]`, `[SmartArchitect]`
3. También disponible en la pestaña `🔍 Logs` del panel

### Variables clave a observar

```
[LayerA] Semantic → type="X" (conf), intent="Y"
[LayerA] Lexical override: semantic="X" → keyword="Y"
[LayerA] Complexity: completeness=X vagueness=Y recommendedQuestions=Z
[QuestionSelector] type="X" conf=Y mode="Z" maxQ=N missingDims=[...]
[SmartArchitect] Semantic override: classified="X" → semantic="Y"
[SmartArchitect] Type mismatch detected → Rejecting MPC
[LayerC] SuperPrompt value delta: sim=0.XXX
```

## Buenas prácticas

1. **Nunca cargar ONNX fuera del Service Worker** — CSP bloquea WASM en content scripts y panel
2. **Siempre regenerar anchors** tras modificar `anchor-definitions.ts`: `npm run generate:anchors`
3. **Añadir tests** en `src/pipeline/**/__tests__/` para cada nuevo comportamiento
4. **Mantener la cascada de persona**: type+domain > type > domain > default
5. **Preferir lexical override a ajustar umbrales** del modelo — el keyword es más determinista
