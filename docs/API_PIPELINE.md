# API del Pipeline

## LayerA — Clasificación Semántica

### Entrada

```typescript
const layerA = new LayerA();
const output = await layerA.process('Explícame la fotosíntesis');
```

### Salida (`LayerAOutput`)

```typescript
interface LayerAOutput {
  input: string;                    // Texto original
  normalized: string;               // Texto normalizado
  classification: ClassificationResult;
  entities: ExtractedEntities;
  attributes: PromptAttributes;
  mode: 'single' | 'multi';
  timestamp: number;
  primary: {
    typeId: string;                 // Ej: 'informacion'
    confidence: number;             // 0.0 - 1.0
    intent?: string;                // Ej: 'definicion'
  };
  secondary?: {
    typeId: string;
    confidence: number;
    intent?: string;
  };
}
```

### `ClassificationResult`

```typescript
interface ClassificationResult {
  typeId: string;           // Ej: 'informacion'
  typeLabel: string;        // Ej: 'Información'
  intentId: string;         // Ej: 'definicion'
  intentLabel: string;      // Ej: 'Definición'
  confidence: number;       // Confianza del tipo (0-1)
  ambiguityScore: number;   // 0 = claro, 1 = ambiguo
  allScores: Record<string, number>; // Scores por tipo
}
```

### `ExtractedEntities`

```typescript
interface ExtractedEntities {
  topic?: string;           // Tema principal
  context?: string;         // Contexto (lenguaje, dominio)
  target?: string;          // Destinatario
  inputContent: boolean;    // ¿El usuario proporcionó contenido a transformar?
  language?: string;        // Idioma detectado
}
```

### `PromptAttributes`

```typescript
interface PromptAttributes {
  tipo?: string;
  nivel?: 'basico' | 'intermedio' | 'avanzado' | 'desconocido';
  formato?: string;
  longitud?: string;
  tono?: string;
  audiencia?: string;
  contexto?: string;
  intencion?: string;
}
```

## LayerB — Selección de Preguntas

### Entrada

```typescript
const layerB = new LayerB();
const questions = layerB.selectQuestions(layerAOutput);
const answers = await layerB.promptUser(questions);
```

### Salida (`LayerBOutput`)

```typescript
interface LayerBOutput {
  questionsAsked: number;
  skipped: boolean;
  answers: Record<string, string>;       // qId → opción seleccionada
  enrichedAttributes: PromptAttributes;
  resolvedType: string;
  resolvedIntent: string;
  originalPrompt: string;
}
```

### Lógica de Selección

| Confianza Capa A | Comportamiento |
|------------------|----------------|
| `> 0.85` | Solo dimensiones faltantes (máx 2 preguntas) |
| `0.6 - 0.85` | Intención ambigua + faltantes (máx 2) |
| `<= 0.6` | Pregunta todo lo relevante (máx 3) |

## LayerC — Generación de SuperPrompt

### Entrada

```typescript
const layerC = new LayerC();
const result = await layerC.generate(layerBOutput);
```

### Salida (`LayerCOutput`)

```typescript
interface LayerCOutput {
  superPrompt: string;              // Prompt mejorado final
  originalPrompt: string;
  templateUsed: string;             // Ej: 'informacion/definicion'
  estimatedTokenDelta: number;      // Diferencia de longitud
  componentsUsed: string[];         // Ej: ['rol', 'contexto', 'tarea']
}
```

### Clasificación de Dominios (Semantic Domain)

IAndes v6.1 utiliza el `DomainClassifier` para identificar el dominio académico mediante embeddings (similitud coseno contra centroides de dominio).

| Dominio Detectado | Flags Disponibles en Template |
|-------------------|-------------------------------|
| `matematicas`     | `isMath`                      |
| `historia`        | `isHistory`                   |
| `tecnologia`      | `isTech`                      |
| `biologia`, `fisica`, `quimica` | `isScience`      |
| `psicologia`      | `isPsychology`                |
| ...               | ...                           |

Si el `DomainClassifier` (Capa A) identifica un dominio con confianza > 0.30, este se inyecta en `attributes.contexto` y activa los flags correspondientes en el motor de templates.

### Selección de Template

1. Si existe template para `resolvedType/resolvedIntent`, se usa directo.
2. Si no existe, se usa **similitud semántica**: se embeddea el prompt original y cada template del tipo, eligiendo el más cercano.
3. Si no hay engine disponible, se usa el primer template del tipo.
4. Si no hay templates para el tipo, se usa fallback genérico.

## EmbeddingEngine — Motor de Vectores

### Uso Directo

```typescript
import { EmbeddingEngine } from './pipeline/embedding-engine';

const engine = EmbeddingEngine.getInstance();
await engine.initialize(); // En Service Worker

const vec = await engine.embed('texto a vectorizar');
// vec: Float32Array(384)

const similarity = engine.cosineSimilarity(vec1, vec2);
// similarity: number (-1 a 1)
```

### Carga de Anchors

```typescript
import anchorEmbeddings from './data/anchor-embeddings.json';

const typeAnchors: Record<string, Float32Array> = {};
for (const [k, v] of Object.entries(anchorEmbeddings.types)) {
  typeAnchors[k] = new Float32Array(v);
}

const match = await engine.classify('input del usuario', typeAnchors);
// match: { id: 'informacion', confidence: 0.87 }
```
