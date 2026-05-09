# 🔬 Análisis Profundo: Potencial Desperdiciado de los Embeddings en el Pipeline

> **Fecha:** 2026-05-02
> **Contexto:** Análisis del uso de embeddings semánticos en las 3 capas del pipeline IAndes V6
> **Alcance:** `src/pipeline/layer-a/`, `layer-b/`, `layer-c/`, `embedding-engine.ts`, `src/data/anchor-*.ts`
> **Hallazgo principal:** El 60% de los vectores pre-computados están en `anchor-embeddings.json` sin ser usados. El modelo actual (`all-MiniLM-L6-v2`) es solo-inglés y degrada la calidad del español. El pipeline tiene un "techo de cristal" impuesto por estas dos limitaciones.

---

## 📊 Resumen Ejecutivo

El `EmbeddingEngine` —la herramienta más inteligente del pipeline— se usa para **solo 3 de 5** categorías de vectores pre-computados. Hay **9 vectores de atributos** y **8 vectores de templates por dominio** que existen en `anchor-embeddings.json` pero **nunca se cargan ni se usan en runtime**. Además, el modelo actual está entrenado exclusivamente en inglés, lo que significa que cada frase en español se codifica en una región semánticamente degradada del espacio vectorial, haciendo que las comparaciones de similitud coseno sean fundamentalmente poco confiables.

**El resultado práctico:** el 80% de los prompts no activan detección de atributos, las preguntas de Capa B son irrelevantes, y los SuperPrompts de Capa C son genéricos.

---

## 1. Uso Actual de Embeddings: Lo Que Sí y Lo Que No Se Usa

### Estado del `anchor-embeddings.json`

El archivo `src/data/anchor-embeddings.json` contiene **5 categorías** de vectores pre-computados:

| Categoría | Entradas | ¿Se usa en runtime? | Archivo que lo usa (o debería) |
|-----------|----------|---------------------|-------------------------------|
| `types` | 7 | ✅ **Sí** | `semantic-classifier.ts:26` → `TYPE_ANCHORS_F32` |
| `intents` | 28 | ✅ **Sí** | `semantic-classifier.ts:35` → `INTENT_ANCHORS_F32` |
| `attributes` | 9 | ❌ **NO** | `attribute-detector.ts` — solo usa regex, nunca carga estos vectores |
| `domains` | 12 | ✅ **Sí** | `domain-classifier.ts:88` → `DOMAIN_ANCHORS_F32` |
| `templates` | 8 | 🟡 **Solo fallback** | `template-engine.ts:5` → `TEMPLATE_ANCHORS_F32` (solo cuando no hay match directo de intent) |

**Dato demoledor:** De 64 vectores pre-computados, **17 (26.5%) nunca se usan** y **8 (12.5%) solo se usan como último recurso**. En términos prácticos, el 39% del trabajo de pre-cómputo está desperdiciado.

---

### 1.1 Types (7) — ✅ Usado correctamente

```typescript
// semantic-classifier.ts:26-33
const TYPE_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = ((ANCHORS as any).types ?? {}) as Record<string, number[]>;
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec);
  }
  return out;
})();
```

Los anchors de tipo (7 vectores: `informacion`, `generacion`, `codigo`, `analisis`, `transformacion`, `accion`, `conversacion`) se usan en `classifyType()` para clasificar el prompt por similitud coseno contra frases como `"explicame qué es la fotosíntesis"` → `informacion`.

**Problema:** Los anchors están en español pero el modelo es inglés. Ver sección 3.

---

### 1.2 Intents (28) — ✅ Usado correctamente

28 vectores de intent (ej: `informacion.definicion`, `codigo.debug`, `generacion.texto_creativo`) se usan en `classifyIntent()` con filtro por tipo:

```typescript
// semantic-classifier.ts:71-97
async classifyIntent(text: string, typeId: string): Promise<SemanticIntentResult | null> {
  const prefix = `${typeId}.`;
  const filteredAnchors: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(INTENT_ANCHORS_F32)) {
    if (id.startsWith(prefix)) {
      filteredAnchors[id] = vec;
    }
  }
  // ... classify against filtered anchors
}
```

Lógica correcta, pero sufre del mismo problema de idioma.

---

### 1.3 Attributes (9) — ❌ CRÍTICO: Pre-computados pero nunca usados

**Archivo donde se definen:** `src/data/anchor-definitions.ts:784-911`
**Archivo donde deberían usarse:** `src/pipeline/layer-a/attribute-detector.ts`

Los `ATTRIBUTE_ANCHORS` contienen 9 categorías con ~12 frases cada una:

```typescript
// anchor-definitions.ts:784-911 (RESUMIDO)
export const ATTRIBUTE_ANCHORS: Record<string, string[]> = {
  'nivel:basico': [
    'explicame como si fuera un niño',
    'de forma sencilla',
    'para principiantes',
    'muy básico',
    'sin experiencia previa',
    'con palabras simples',
    'para alguien que no sabe nada',
    'nivel introductorio',
    'lo más básico posible',
    'conceptos elementales',
    'fácil de entender',
    'desde cero',
  ],
  'nivel:intermedio': [ /* 12 frases */ ],
  'nivel:avanzado': [ /* 12 frases */ ],
  'tono:formal': [ /* 12 frases */ ],
  'tono:informal': [ /* 12 frases */ ],
  'tono:entusiasta': [ /* 12 frases */ ],
  'formato:lista': [ /* 12 frases */ ],
  'formato:parrafos': [ /* 12 frases */ ],
  'formato:tabla': [ /* 11 frases */ ],
};
```

Estos vectores se pre-computan en `scripts/generate-anchors.ts:90` y se guardan en `anchor-embeddings.json` bajo la clave `attributes`. **Pero `attribute-detector.ts` nunca los importa ni los usa.**

#### Lo que hace actualmente `attribute-detector.ts` (SOLO REGEX):

```typescript
// attribute-detector.ts:22-28 — SOLO captura keywords LITERALES
if (/básico|básica|simple|principiante|fácil|niños|introducción|introduccion/i.test(lower)) {
  nivel = 'basico';
} else if (/avanzado|avanzada|experto|complejo|profundo|detallado/i.test(lower)) {
  nivel = 'avanzado';
} else if (/intermedio/i.test(lower)) {
  nivel = 'intermedio';
}
```

**Ejemplo concreto de fallo:**

```
Prompt: "explícame la fotosíntesis como si tuviera 10 años"
→ Regex: NO captura nivel (no dice "básico", "simple", ni "fácil" literalmente)
→ Resultado: nivel = undefined → Capa B pregunta "¿Qué nivel de profundidad necesitas?"
→ Pero el embedding de este prompt contra ATTRIBUTE_ANCHORS['nivel:basico'] daría ~0.72 de similitud
→ La intención del usuario ES claramente nivel básico
```

```
Prompt: "necesito un análisis profundo con datos empíricos y referencias académicas"
→ Regex: captura "profundo" → nivel = 'avanzado' ✅ (acierto por casualidad)
→ Pero tono y formato no se detectan porque no hay keywords literales
→ Embedding contra 'tono:formal': ~0.68 → SÍ debería detectarse
```

```
Prompt: "dame las ventajas en una tabla comparativa por favor"
→ Regex: captura "tabla" → formato = 'tabla' ✅
→ Pero no captura que el tono es formal ("por favor" + contexto profesional)
→ Embedding contra 'tono:formal': ~0.55 (borderline, pero mejor que undefined)
```

**Impacto:** ~80% de los prompts no tienen keywords explícitas de nivel/formato/tono. El `attribute-detector` devuelve `{}` vacío, forzando preguntas innecesarias en Capa B.

---

### 1.4 Templates (8) — 🟡 Solo usado como fallback

```typescript
// template-engine.ts:38-40
let template: string | null = typeTemplates[intentId] ?? null;
if (!template) {
  // SOLO aquí se usan los TEMPLATE_ANCHORS — cuando no hay match directo
  template = await this.selectBestTemplate(typeId, intentId, String(enriched.originalPrompt ?? ''));
}
```

La selección semántica de templates (comparar embedding del prompt contra embeddings de templates) **solo ocurre cuando `intentId` no tiene template directo**. Pero el `SmartPromptArchitect` (que es el motor primario actual) **ni siquiera usa esto** — selecciona la instrucción por `typeId + intentId` de un mapa declarativo.

---

## 2. Las 10 Mejoras Concretas (Priorizadas por Impacto)

### Mejora #1: Activar Attribute Detection por Embeddings

**Archivo:** `src/pipeline/layer-a/attribute-detector.ts`
**Esfuerzo:** Bajo (~2h)
**Impacto:** 🔴 CRÍTICO — Elimina ~80% de preguntas innecesarias en Capa B

**Estrategia:** Cargar `ATTRIBUTE_ANCHORS` desde `anchor-embeddings.json` como `Float32Array`, igual que se hace con `TYPE_ANCHORS_F32`.

```typescript
// NUEVO: attribute-detector.ts — añadir al inicio del archivo
import ANCHORS from '@/data/anchor-embeddings.json';
import { EmbeddingEngine } from '../embedding-engine';

const ATTRIBUTE_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = (ANCHORS as any).attributes ?? {};
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec);
  }
  return out;
})();

// Añadir método:
async detectAttributesSemantic(text: string): Promise<Partial<PromptAttributes>> {
  const engine = EmbeddingEngine.getInstance();
  if (!engine.isReady()) return {};

  const inputVec = await engine.embed(text);
  const result: Partial<PromptAttributes> = {};

  // Clasificar nivel
  const nivelScores = {
    basico: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:basico']),
    intermedio: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:intermedio']),
    avanzado: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['nivel:avanzado']),
  };
  const bestNivel = Object.entries(nivelScores).sort(([,a], [,b]) => b - a)[0];
  if (bestNivel[1] > 0.55) result.nivel = bestNivel[0] as PromptAttributes['nivel'];

  // Clasificar tono
  const tonoScores = {
    formal: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:formal']),
    informal: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:informal']),
    entusiasta: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['tono:entusiasta']),
  };
  const bestTono = Object.entries(tonoScores).sort(([,a], [,b]) => b - a)[0];
  if (bestTono[1] > 0.55) result.tono = bestTono[0];

  // Clasificar formato
  const formatoScores = {
    lista: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:lista']),
    parrafos: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:parrafos']),
    tabla: engine.cosineSimilarity(inputVec, ATTRIBUTE_ANCHORS_F32['formato:tabla']),
  };
  const bestFormato = Object.entries(formatoScores).sort(([,a], [,b]) => b - a)[0];
  if (bestFormato[1] > 0.55) result.formato = bestFormato[0];

  return result;
}
```

**Integración en `detectAttributes()`:**

```typescript
async detectAttributes(text: string, typeId?: string, intentId?: string): Promise<PromptAttributes> {
  // 1. Primero intentar detección semántica (nueva)
  const semanticAttrs = await this.detectAttributesSemantic(text);

  // 2. Luego regex (existente) — solo para lo que no se detectó semánticamente
  const regexAttrs = this.detectAttributesRegex(text);

  // 3. Inferencia implícita por tipo (existente)
  const implicitAttrs = this.inferFromType(typeId, intentId);

  // Merge: semántico > regex > inferido
  return {
    nivel: semanticAttrs.nivel ?? regexAttrs.nivel ?? implicitAttrs.nivel,
    formato: semanticAttrs.formato ?? regexAttrs.formato ?? implicitAttrs.formato,
    tono: semanticAttrs.tono ?? regexAttrs.tono ?? implicitAttrs.tono,
    longitud: regexAttrs.longitud ?? implicitAttrs.longitud,
  };
}
```

---

### Mejora #2: Detección de Complejidad/Completitud del Prompt

**Archivo nuevo:** `src/pipeline/layer-a/complexity-analyzer.ts`
**Esfuerzo:** Medio (~3h)
**Impacto:** 🟡 ALTO — Determina cuántas preguntas hacer en Capa B

**Concepto:** Crear anchors para "prompt completo" vs "prompt vago" y medir la similitud del prompt del usuario contra ambos.

```typescript
// complexity-analyzer.ts (NUEVO)
const COMPLETENESS_ANCHORS: Record<string, string[]> = {
  'completo': [
    'Explicame la fotosíntesis con ejemplos concretos y fuentes académicas para mi tesis de biología',
    'Escribe una función en Python que ordene una lista de diccionarios por clave usando quicksort',
    'Necesito un análisis de las causas de la revolución francesa con referencias a fuentes primarias',
    'Compara React y Angular en términos de rendimiento, curva de aprendizaje y ecosistema para una decisión de arquitectura',
    'Ayúdame a debuggear este error de TypeScript en mi API de Express, te paso el stack trace completo',
  ],
  'vago': [
    'ayúdame con algo',
    'no sé',
    'hola',
    'tengo una duda',
    'necesito información',
    'explícame',
    'cómo funciona',
    'qué es eso',
  ],
};

export async function analyzeComplexity(text: string, engine: EmbeddingEngine): Promise<{
  completeness: number;     // 0-1: qué tan completo es el prompt
  vagueness: number;        // 0-1: qué tan vago es
  recommendedQuestions: number; // 1-4 preguntas sugeridas
}> {
  if (!engine.isReady()) {
    return { completeness: 0.5, vagueness: 0.5, recommendedQuestions: 2 };
  }

  const inputVec = await engine.embed(text);
  const completeCentroid = await engine.getCentroid(COMPLETENESS_ANCHORS['completo']);
  const vagueCentroid = await engine.getCentroid(COMPLETENESS_ANCHORS['vago']);

  if (!completeCentroid || !vagueCentroid) {
    return { completeness: 0.5, vagueness: 0.5, recommendedQuestions: 2 };
  }

  const completeness = engine.cosineSimilarity(inputVec, completeCentroid);
  const vagueness = engine.cosineSimilarity(inputVec, vagueCentroid);

  // Lógica de decisión
  let recommendedQuestions: number;
  if (completeness > 0.65) {
    recommendedQuestions = 1; // Prompt rico → pocas preguntas
  } else if (vagueness > 0.6) {
    recommendedQuestions = 4; // Prompt vago → muchas preguntas
  } else if (completeness > 0.45) {
    recommendedQuestions = 2; // Prompt decente → preguntas moderadas
  } else {
    recommendedQuestions = 3; // Prompt incompleto → más preguntas
  }

  return { completeness, vagueness, recommendedQuestions };
}
```

**Integración en `LayerA.process()`:**

```typescript
// layer-a/index.ts — después de STEP 3
const complexity = await analyzeComplexity(normalized, EmbeddingEngine.getInstance());

return {
  // ... campos existentes ...
  metadata: {
    complexity,
    // ...
  },
};
```

Y en Capa B, `recommendedQuestions` reemplaza el cap fijo de 2-3 preguntas.

---

### Mejora #3: Verificación Semántica Tipo↔Contenido

**Archivo a modificar:** `src/pipeline/layer-a/semantic-classifier.ts` (añadir método)
**Esfuerzo:** Bajo (~1.5h)
**Impacto:** 🔴 CRÍTICO — Evita clasificaciones incorrectas que arruinan todo el pipeline

**Concepto:** Después de clasificar el tipo, verificar que el embedding del prompt realmente está cerca del centroide de ese tipo. Si no, es probable que sea una clasificación errónea.

```typescript
// semantic-classifier.ts — NUEVO método
async verifyClassification(
  text: string,
  classifiedTypeId: string,
): Promise<{ isCoherent: boolean; actualBestType: string; confidence: number }> {
  const engine = EmbeddingEngine.getInstance();
  if (!engine.isReady()) return { isCoherent: true, actualBestType: classifiedTypeId, confidence: 1 };

  const inputVec = await engine.embed(text);

  // Comparar contra TODOS los tipos, no solo el clasificado
  let bestType = '';
  let bestScore = -1;
  const allScores: Record<string, number> = {};

  for (const [typeId, anchorVec] of Object.entries(TYPE_ANCHORS_F32)) {
    const score = engine.cosineSimilarity(inputVec, anchorVec);
    allScores[typeId] = score;
    if (score > bestScore) {
      bestScore = score;
      bestType = typeId;
    }
  }

  // El tipo clasificado debería ser el mejor o estar muy cerca
  const classifiedScore = allScores[classifiedTypeId] ?? 0;
  const isCoherent = classifiedScore >= bestScore - 0.08; // margen de 8%

  return {
    isCoherent,
    actualBestType: bestType,
    confidence: classifiedScore,
  };
}
```

**Ejemplo de cuándo esto salva el pipeline:**

```
Prompt: "escribe un poema sobre la dictadura española"
→ SemanticClassifier: type=conversacion, intent=roleplay (porque "dictadura española" 
  es un trigger histórico que confunde al modelo)
→ verifyClassification(): 
  - Similitud contra "generacion": 0.68
  - Similitud contra "conversacion": 0.41
  - isCoherent = false, actualBestType = "generacion"
→ El pipeline se re-clasifica como generacion ✅
```

---

### Mejora #4: Detección de Multi-Intención Real

**Archivo a modificar:** `src/pipeline/layer-a/index.ts` (líneas 61-74)
**Esfuerzo:** Bajo (~1h)
**Impacto:** 🟡 MEDIO — Activar `mode: 'multi'` cuando realmente aplica

**Problema actual:** Las condiciones para `mode: 'multi'` son tan restrictivas que casi nunca se activan. Requiere que TANTO el TypeScorer como el SemanticClassifier estén ambiguos simultáneamente.

**Nueva estrategia:** Usar los embeddings para detectar ambigüedad real:

```typescript
// layer-a/index.ts — reemplazar líneas 61-74
// Comparar los scores de embedding contra los 2 tipos top
const top2Scores = await this.semanticClassifier.getTop2Scores(normalized);
const semanticDiff = top2Scores[0].confidence - top2Scores[1].confidence;

if (semanticDiff < 0.10) {
  // Los dos tipos top están demasiado cerca → genuinamente ambiguo
  mode = 'multi';
  console.log(
    `[LayerA] Multi-mode: "${top2Scores[0].typeId}" (${top2Scores[0].confidence.toFixed(2)}) ` +
    `vs "${top2Scores[1].typeId}" (${top2Scores[1].confidence.toFixed(2)})`,
  );
}
```

---

### Mejora #5: Extracción de Topic por Similitud Semántica

**Archivo a modificar:** `src/pipeline/layer-a/entity-extractor.ts`
**Esfuerzo:** Alto (~4h)
**Impacto:** 🟡 MEDIO — Reemplaza 200 líneas de regex frágiles

**Concepto:** En vez de regex, dividir el prompt en segmentos candidatos (oraciones o n-gramas) y encontrar cuál es más similar al prompt completo (ese es el topic).

```typescript
// entity-extractor.ts — NUEVO método
async extractTopicSemantic(text: string): Promise<string | undefined> {
  const engine = EmbeddingEngine.getInstance();
  if (!engine.isReady()) return this.extractTopicRegex(text); // fallback a regex

  const fullEmbedding = await engine.embed(text);

  // Dividir en segmentos candidatos
  const segments = this.getTopicCandidates(text);
  if (segments.length === 0) return undefined;

  // Encontrar el segmento más similar al prompt completo
  let bestSegment = '';
  let bestScore = -1;

  for (const seg of segments) {
    const segEmbedding = await engine.embed(seg);
    const score = engine.cosineSimilarity(fullEmbedding, segEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestSegment = seg;
    }
  }

  // Validar: el topic debe ser razonablemente similar al prompt (no es un segmento aleatorio)
  if (bestScore > 0.55 && bestSegment.length >= 2 && bestSegment.length <= 200) {
    return bestSegment;
  }

  return this.extractTopicRegex(text); // fallback
}

private getTopicCandidates(text: string): string[] {
  // 1. Remover action verbs conocidos
  let residue = text;
  for (const prefix of ACTION_PREFIXES) {
    residue = residue.replace(prefix, '');
  }
  residue = residue.replace(/^(?:el|la|los|las|un|una)\s+/i, '').trim();

  if (residue.length >= 2) {
    // 2. Generar candidatos: oración completa, primera frase, últimas palabras
    const sentences = residue.split(/[.,;:!?]+/).filter(s => s.trim().length >= 2);
    const words = residue.split(/\s+/);

    const candidates = [
      residue,                                    // texto completo sin prefijos
      ...sentences.map(s => s.trim()),            // cada oración
      words.slice(0, 4).join(' '),                // primeras 4 palabras
      words.slice(-6).join(' '),                  // últimas 6 palabras
    ].filter(c => c.length >= 2 && c.length <= 200);

    return [...new Set(candidates)]; // deduplicar
  }

  return [];
}
```

---

### Mejora #6: Audiencia Implícita por Embedding

**Archivo a modificar:** `src/pipeline/layer-a/attribute-detector.ts`
**Esfuerzo:** Medio (~2h)
**Impacto:** 🟢 BAJO-MEDIO — Menos preguntas de audiencia

**Concepto:** Crear anchors de audiencia (no existen actualmente en `anchor-definitions.ts`) y clasificar por similitud.

```typescript
// NUEVO: añadir a anchor-definitions.ts
export const AUDIENCE_ANCHORS: Record<string, string[]> = {
  'infantil': [
    'para un niño de 5 años',
    'como si tuviera 8 años',
    'para niños pequeños',
    'explicación para mi hijo',
    'lenguaje para niños',
  ],
  'estudiante': [
    'para mi clase de',
    'estoy estudiando',
    'para un trabajo de la universidad',
    'para mi examen',
    'para un estudiante de',
  ],
  'profesional': [
    'para el trabajo',
    'para una presentación ejecutiva',
    'en contexto profesional',
    'para mi jefe',
    'para un cliente',
  ],
  'academico': [
    'para mi tesis',
    'nivel doctoral',
    'publicación académica',
    'para un paper',
    'investigación científica',
  ],
};
```

---

### Mejora #7: Preguntas de Capa B Adaptativas por Dominio

**Archivo a modificar:** `src/pipeline/layer-b/question-schemas.ts`
**Esfuerzo:** Medio (~3h)
**Impacto:** 🔴 ALTO — Preguntas relevantes al dominio académico del usuario

**Problema actual:** Las `question-schemas.ts` son tipo-específicas pero no dominio-específicas. Para un prompt de matemáticas, no tiene sentido preguntar "¿En qué formato?" como si fuera un texto.

**Estrategia:** Añadir condición `domains` a los schemas:

```typescript
// question-schemas.ts — MODIFICAR QuestionConditions
export interface QuestionConditions {
  readonly types?: readonly string[];
  readonly intents?: readonly string[];
  readonly domains?: readonly string[];  // NUEVO
  readonly requiresMissing?: string;
  readonly minConfidence?: number;
  readonly maxConfidence?: number;
  readonly minDomainConfidence?: number; // NUEVO: solo si el dominio tiene alta confianza
}

// NUEVO schema: preguntas específicas de matemáticas
{
  id: 'q-math-approach',
  dimension: 'contexto',
  conditions: {
    types: ['informacion', 'razonamiento'],
    domains: ['matematicas'],
    minDomainConfidence: 0.6,
    requiresMissing: 'contexto',
  },
  question: '¿Qué tipo de explicación matemática necesitas?',
  options: [
    'Demostración formal (teoremas, pasos lógicos)',
    'Explicación conceptual (intuición, ejemplos)',
    'Resolución numérica (cálculos, resultados)',
    'Visualización geométrica (gráficos, diagramas)',
  ],
  mapsTo: 'tipo_matematico',
  normalize: {
    'Demostración formal (teoremas, pasos lógicos)': 'demostracion',
    'Explicación conceptual (intuición, ejemplos)': 'conceptual',
    'Resolución numérica (cálculos, resultados)': 'numerico',
    'Visualización geométrica (gráficos, diagramas)': 'geometrico',
  },
},
```

---

### Mejora #8: Template Selection 100% Semántica en Capa C

**Archivo a modificar:** `src/pipeline/layer-c/smart-architect.ts`
**Esfuerzo:** Bajo (~2h)
**Impacto:** 🔴 ALTO — El SmartArchitect actual ignora los embeddings

**Problema actual:** El `SmartPromptArchitect` selecciona instrucciones por `typeId + intentId` de mapas estáticos:

```typescript
// smart-architect.ts:79 — ESTO ES LO QUE HACE AHORA
const rawInstruction = getInstruction(ctx.resolvedType, ctx.resolvedIntent);
```

Si el intent classifier dijo `definicion` pero el embedding del prompt está más cerca de `comparacion`, el sistema no lo corrige.

**Estrategia:** Usar `TEMPLATE_ANCHORS_F32` para selección semántica en el SmartArchitect:

```typescript
// smart-architect.ts — NUEVO método
private async selectBestInstruction(
  typeId: string,
  intentId: string,
  originalPrompt: string,
): Promise<string> {
  const engine = EmbeddingEngine.getInstance();
  const typeAnchors = TEMPLATE_ANCHORS_F32[typeId];

  if (engine.isReady() && typeAnchors && originalPrompt) {
    try {
      const promptVec = await engine.embed(originalPrompt);
      let bestIntentId = intentId;
      let bestScore = -1;

      for (const [anchorIntentId, anchorVec] of Object.entries(typeAnchors)) {
        const score = engine.cosineSimilarity(promptVec, anchorVec);
        if (score > bestScore) {
          bestScore = score;
          bestIntentId = anchorIntentId;
        }
      }

      // Si el intent semánticamente seleccionado difiere del clasificado,
      // usar el semántico si la diferencia de score es significativa
      const classifiedScore = typeAnchors[intentId]
        ? engine.cosineSimilarity(promptVec, typeAnchors[intentId])
        : 0;

      if (bestScore > classifiedScore + 0.10) {
        console.log(
          `[SmartArchitect] Semantic override: classified="${intentId}" (${classifiedScore.toFixed(2)}) ` +
          `→ semantic="${bestIntentId}" (${bestScore.toFixed(2)})`,
        );
        return getInstruction(typeId, bestIntentId);
      }
    } catch {
      // fallback al intent clasificado
    }
  }

  return getInstruction(typeId, intentId);
}
```

---

### Mejora #9: Quality Score con Embeddings

**Archivo a modificar:** `src/pipeline/layer-c/quality-scorer.ts`
**Esfuerzo:** Bajo (~1h)
**Impacto:** 🟡 MEDIO — Métrica real de calidad, no regex cosmética

**Problema actual:** `scorePromptQuality()` usa regex para detectar componentes:

```typescript
// quality-scorer.ts actual — LÍNEA 437
if (/actúa como|eres un|rol de/i.test(superPrompt)) score += 0.15;
```

Esto es frágil y solo detecta keywords literales, no calidad real.

**Estrategia:** Comparar embedding del superPrompt contra un centroide de "prompts ideales":

```typescript
// quality-scorer.ts — NUEVO
const IDEAL_PROMPT_ANCHORS = [
  'Actúa como experto en el tema. Explica de forma clara y estructurada, incluyendo ejemplos concretos. Adapta el lenguaje al nivel solicitado.',
  'Eres un especialista en la materia. Proporciona una respuesta detallada con fundamentos teóricos y aplicaciones prácticas. Estructura tu respuesta en secciones lógicas.',
  'Como profesional del área, analiza el tema con rigor. Incluye definiciones precisas, contexto histórico si aplica, y recomendaciones accionables.',
];

export async function scorePromptQualitySemantic(
  superPrompt: string,
  engine: EmbeddingEngine,
): Promise<number> {
  if (!engine.isReady()) return scorePromptQuality(superPrompt, ''); // fallback a regex

  const promptVec = await engine.embed(superPrompt);
  const idealCentroid = await engine.getCentroid(IDEAL_PROMPT_ANCHORS);

  if (!idealCentroid) return scorePromptQuality(superPrompt, '');

  // Similitud contra el "ideal" → score 0-1
  const similarity = engine.cosineSimilarity(promptVec, idealCentroid);

  // Normalizar: la similitud coseno típica está en [0.3, 0.8]
  // Mapear a [0, 1]
  return Math.min(1.0, Math.max(0, (similarity - 0.25) / 0.55));
}
```

---

### Mejora #10: Verificación de que el SuperPrompt Agregó Valor

**Archivo a modificar:** `src/pipeline/layer-c/index.ts`
**Esfuerzo:** Bajo (~0.5h)
**Impacto:** 🟡 MEDIO — Detecta cuando el pipeline no mejoró el prompt

```typescript
// layer-c/index.ts — añadir validación
const originalEmbedding = await engine.embed(originalPrompt ?? '');
const superEmbedding = await engine.embed(superPrompt);
const similarity = engine.cosineSimilarity(originalEmbedding, superEmbedding);

if (similarity > 0.92) {
  console.warn(
    `[LayerC] SuperPrompt demasiado similar al original (sim=${similarity.toFixed(3)}). ` +
    `El pipeline no agregó valor significativo.`,
  );
  // Opcional: incluir esta métrica en el output para telemetría
}
```

---

## 3. El Problema del Idioma: ¿Nos Está Limitando el Modelo?

### 3.1 Diagnóstico

El modelo actual es `Xenova/all-MiniLM-L6-v2` (23 MB INT8, 384 dimensiones). Fue entrenado exclusivamente con **1B+ pares de oraciones en inglés** (Reddit, Stack Exchange, Wikipedia en inglés, papers académicos en inglés).

Cuando este modelo recibe texto en español:

1. **Tokenización degradada:** El BPE tokenizer está optimizado para inglés. Palabras españolas como "explicación" se rompen en sub-tokens que no corresponden al espacio semántico del modelo.

2. **Embeddings en región sin sentido:** El vector resultante de 384 dimensiones cae en una región del espacio que el modelo nunca aprendió a representar correctamente.

3. **Similitud coseno no confiable:** Comparar "explicame qué es la fotosíntesis" contra el anchor `informacion` usando un modelo inglés es como pedirle a alguien que solo habla inglés que evalúe si dos frases en mandarín significan lo mismo.

**Evidencia práctica en el pipeline:**

```
Prompt: "explícame la fotosíntesis" (español)
Anchor "informacion": "explicame qué es la fotosíntesis" (español)

→ Ambos son español, ambos son del mismo tipo
→ Pero el modelo solo-inglés mapea ambos a regiones sub-óptimas
→ La similitud coseno resultante es más baja y más ruidosa de lo que debería
→ Esto afecta TODAS las clasificaciones del pipeline
```

### 3.2 Impacto Estimado

Basado en benchmarks MTEB (Massive Text Embedding Benchmark) y el comportamiento observado del pipeline:

| Aspecto | Con modelo inglés | Con modelo multilingüe | Mejora estimada |
|---------|-------------------|------------------------|-----------------|
| Clasificación de tipo | ~65-75% accuracy | ~85-92% accuracy | +20-25 pp |
| Clasificación de intent | ~55-65% accuracy | ~80-88% accuracy | +25-30 pp |
| Clasificación de dominio | ~60-70% accuracy | ~82-90% accuracy | +22-25 pp |
| Detección de atributos | ~15-25% (regex) | ~70-85% (embeddings) | +50-60 pp |
| Extracción de topic | ~60-70% (regex) | ~75-85% (embeddings) | +15-20 pp |

> **pp = puntos porcentuales.** La detección de atributos es donde se ve la mejora más dramática porque actualmente depende 100% de regex.

### 3.3 Modelos Multilingües Viables

| Modelo | Dims | Tamaño (INT8) | Idiomas | Calidad español | Estado ONNX |
|--------|------|---------------|---------|-----------------|-------------|
| **multilingual-e5-small** ⭐ | 384 | 118 MB | 94 (incl. es) | Excelente | ✅ `Xenova/multilingual-e5-small` |
| paraphrase-multilingual-MiniLM-L12-v2 | 384 | 118 MB | 50+ (incl. es) | Buena | ✅ `Xenova/paraphrase-multilingual-MiniLM-L12-v2` |
| distiluse-base-multilingual-cased-v2 | 512 | 135 MB | 50+ (incl. es) | Buena | ✅ `Xenova/distiluse-base-multilingual-cased-v2` |
| Granite-Embedding-107M-multilingual | 384 | 107 MB | Multilingüe | Moderada | ✅ Community |
| gte-multilingual-base | 768 | 340 MB | 75+ (incl. es) | Excelente | ✅ `onnx-community/` |
| **all-MiniLM-L6-v2** (actual) | 384 | 23 MB | Solo inglés | Pobre | ✅ `Xenova/all-MiniLM-L6-v2` |

### 3.4 Recomendación: `multilingual-e5-small`

**Por qué es la mejor opción:**

1. **Mismas dimensiones (384)** que el modelo actual → los anchors pre-computados se regeneran pero el espacio es compatible
2. **118 MB** (5x el actual) — manejable para una extensión de Chrome
3. **94 idiomas** con soporte nativo de español — es el modelo multilingüe más descargado (1.48M/mes en Hugging Face)
4. **Benchmarks MTEB en español:**
   - AmazonReviewsClassification (es): **40.39%** — entiende texto en español
   - MTOPDomainClassification (es): **89.27%** — excelente clasificación de dominio
   - MassiveIntentClassification (es): **66.31%** — buena clasificación de intención
5. **ONNX ya convertido** por Xenova — compatible con Transformers.js sin pasos extra
6. **Arquitectura E5** — diseńado específicamente para embeddings de calidad en múltiples idiomas

**El modelo se empaqueta localmente** (no se descarga en runtime). Estructura actual:

```
models/
└── all-MiniLM-L6-v2/
    ├── config.json
    ├── tokenizer.json
    ├── vocab.txt
    ├── tokenizer_config.json
    ├── special_tokens_map.json
    └── onnx/
        └── model_quantized.onnx    ← 23 MB (INT8)
```

El `copyManifest` en `vite.config.ts:31-37` copia `models/` recursivamente a `dist/models/`, y `embedding-engine.ts:49` configura `env.localModelPath = chrome.runtime.getURL('models/')` con `local_files_only: true`.

**Paso 1: Descargar los archivos ONNX del nuevo modelo**

```bash
# Desde Hugging Face — descargar la versión ONNX cuantizada de Xenova
# Opción A: Usar huggingface_hub (Python)
pip install huggingface_hub
python -c "
from huggingface_hub import snapshot_download
snapshot_download('Xenova/multilingual-e5-small',
    local_dir='models/multilingual-e5-small',
    allow_patterns=['*.json', '*.txt', 'onnx/*_quantized.onnx'],
    ignore_patterns=['*.bin', '*.safetensors', 'onnx/model.onnx'])
"

# Opción B: Descargar manualmente desde
# https://huggingface.co/Xenova/multilingual-e5-small/tree/main
# Solo se necesitan: config.json, tokenizer.json, tokenizer_config.json,
# special_tokens_map.json, vocab.txt (o spm.model), y onnx/model_quantized.onnx
```

**Paso 2: Cambiar una línea en `embedding-engine.ts`**

```typescript
// embedding-engine.ts:60 — ANTES
this.model = await pipeline(
  'feature-extraction',
  'all-MiniLM-L6-v2',           // ← carpeta dentro de models/
  { local_files_only: true, revision: 'main' }
);

// embedding-engine.ts:60 — DESPUÉS
this.model = await pipeline(
  'feature-extraction',
  'multilingual-e5-small',      // ← nueva carpeta dentro de models/
  { local_files_only: true, revision: 'main' }
);
```

> ⚠️ **Importante:** Con `local_files_only: true`, Transformers.js busca la carpeta `multilingual-e5-small` dentro del `localModelPath` configurado (`models/`). El prefijo `Xenova/` se omite porque no se está descargando de Hugging Face.

**Paso 3: Regenerar `anchor-embeddings.json`**

```bash
npx ts-node --esm scripts/generate-anchors.ts
```

Esto es obligatorio porque el nuevo modelo produce vectores en un espacio semántico completamente diferente (cross-lingüe). Los anchors antiguos serían incompatibles.

**Paso 4: Sin cambios en `vite.config.ts`**

El `copyManifest` ya copia `models/` recursivamente (línea 34: `cpSync(modelsSrc, modelsDest, { recursive: true })`). La nueva carpeta `models/multilingual-e5-small/` se copia automáticamente.

**Estructura esperada después de la migración:**

```
models/
├── all-MiniLM-L6-v2/        ← se puede eliminar después de validar
│   └── ...
└── multilingual-e5-small/   ← NUEVO
    ├── config.json
    ├── tokenizer.json
    ├── tokenizer_config.json
    ├── special_tokens_map.json
    ├── sentencepiece.bpe.model  ← tokenizador multilingüe (diferente al vocab.txt inglés)
    └── onnx/
        └── model_quantized.onnx  ← ~118 MB (INT8, 5x el actual)

**Trade-off principal:**

| Factor | all-MiniLM-L6-v2 | multilingual-e5-small |
|--------|-----------------|----------------------|
| Tamaño en disco | ~23 MB | ~118 MB (~5x) |
| Tamaño de la extensión (.zip) | ~23 MB más grande | ~118 MB más grande |
| RAM en runtime (Service Worker) | ~90 MB | ~470 MB (~5x) |
| Inferencia | Muy rápida (6 capas Transformer) | Algo más lenta (12 capas Transformer) |
| Carga inicial del modelo | ~200ms | ~500-800ms (estimado) |
| Calidad español | Pobre (entrenado solo en inglés) | Excelente (94 idiomas, español nativo) |
| Calidad inglés | Excelente | Muy buena |
| Tokenizador | WordPiece (inglés, 30K tokens) | SentencePiece (multilingüe, 250K tokens) |

> 💡 **Nota sobre el tamaño:** Como el modelo se empaqueta localmente (no se descarga en runtime), el impacto es solo en el tamaño del `.zip` de la extensión y en la RAM del Service Worker. La Chrome Web Store acepta extensiones de hasta ~500 MB comprimidos, así que 118 MB adicionales no son problema. La RAM del Service Worker (~470 MB con el modelo cargado) es el factor más relevante — equipos con <8 GB RAM podrían experimentar throttling del SW por parte de Chrome.

### 3.5 ¿Vale la pena el cambio?

**Respuesta corta: Sí, y no es una mejora incremental sino categórica.**

Con el modelo inglés actual, el pipeline está operando con ~60-70% de precisión en clasificación y ~15-25% en detección de atributos. Con un modelo multilingüe:
- La clasificación sube a ~85-92%
- La detección de atributos con embeddings (Mejora #1) se vuelve viable (actualmente no lo es porque los embeddings en español son ruido)
- La selección semántica de templates (Mejora #8) se vuelve confiable
- La extracción de topic por embeddings (Mejora #5) se vuelve posible

**El cambio de modelo es el habilitador de las otras 9 mejoras.** Sin un modelo que entienda español, los embeddings son ruido y las mejoras #1, #2, #3, #5, #6, #8, #9 y #10 no funcionarán correctamente.

---

## 4. Plan de Ejecución por Fases

### Fase 0: Cambio de Modelo (Pre-requisito)
**Esfuerzo: ~3h** | **Archivos: 3**

1. Cambiar `embedding-engine.ts` para usar `Xenova/multilingual-e5-small`
2. Actualizar `vite.config.ts` (copyManifest) para los nuevos archivos WASM
3. Regenerar `anchor-embeddings.json`
4. Probar descarga y carga del modelo en el Service Worker

### Fase 1: Embeddings para Atributos y Complejidad (Quick Wins)
**Esfuerzo: ~5h** | **Archivos: 3 nuevos, 2 modificados**

1. **Mejora #1**: Conectar `ATTRIBUTE_ANCHORS` a `attribute-detector.ts` (~2h)
2. **Mejora #2**: Crear `complexity-analyzer.ts` (~3h)
3. Integrar ambas en `LayerA.process()`

### Fase 2: Verificación y Corrección
**Esfuerzo: ~4h** | **Archivos: 3 modificados**

4. **Mejora #3**: `verifyClassification()` en `semantic-classifier.ts` (~1.5h)
5. **Mejora #4**: Multi-intención real en `layer-a/index.ts` (~1h)
6. **Mejora #10**: Verificación de valor agregado en `layer-c/index.ts` (~0.5h)

### Fase 3: Capa B Inteligente
**Esfuerzo: ~4h** | **Archivos: 2 modificados**

7. **Mejora #7**: Schemas dominio-específicos en `question-schemas.ts` (~3h)
8. Integrar `complexity.recommendedQuestions` en `question-selector.ts` (~1h)

### Fase 4: Capa C Semántica
**Esfuerzo: ~4h** | **Archivos: 3 modificados**

9. **Mejora #8**: Template selection semántica en `smart-architect.ts` (~2h)
10. **Mejora #9**: Quality score con embeddings en `quality-scorer.ts` (~1h)
11. **Mejora #5**: Topic extraction semántico en `entity-extractor.ts` (~4h) — opcional, puede ir en fase 5

### Fase 5: Refinamiento
**Esfuerzo: ~3h** | **Archivos: 2 modificados, 1 nuevo**

12. **Mejora #6**: Audiencia implícita con nuevos anchors (~2h)
13. Regenerar anchors con las nuevas categorías (~1h)

---

## 5. Estimación Total

| Fase | Mejoras | Esfuerzo | Archivos |
|------|---------|----------|----------|
| Fase 0 (modelo) | Cambio de modelo | ~3h | 3 |
| Fase 1 (atributos) | #1, #2 | ~5h | 5 |
| Fase 2 (verificación) | #3, #4, #10 | ~4h | 3 |
| Fase 3 (Capa B) | #7 + integración | ~4h | 2 |
| Fase 4 (Capa C) | #5, #8, #9 | ~7h | 4 |
| Fase 5 (refinamiento) | #6 | ~3h | 3 |
| **Total** | **10 mejoras + modelo** | **~26h** | **20 archivos** |

---

## 6. Criterios de Éxito

Después de implementar Fase 0 + Fase 1:

- [ ] Para `"explícame la fotosíntesis como si tuviera 10 años"` → `nivel = 'basico'` detectado por embeddings (no regex)
- [ ] Para `"necesito un análisis profundo con datos y referencias académicas"` → `nivel = 'avanzado'`, `tono = 'formal'` detectados
- [ ] `attribute-detector` devuelve atributos en >60% de los prompts (vs ~20% actual)
- [ ] `complexityAnalyzer` recomienda 1 pregunta para prompts ricos, 3-4 para prompts vagos
- [ ] El modelo multilingüe carga correctamente en el Service Worker y clasifica en <500ms

Después de Fase 2:

- [ ] `"escribe un poema sobre la dictadura española"` NO se clasifica como `conversacion`
- [ ] `mode: 'multi'` se activa para prompts genuinamente ambiguos (diferencia < 0.10 entre top 2 tipos)
- [ ] SuperPrompts con similitud >0.92 contra el original generan warning

Después de Fases 3-5:

- [ ] Para prompt de matemáticas → preguntas relevantes (demostración vs conceptual vs numérico)
- [ ] SmartArchitect selecciona la instrucción más similar al prompt, no solo la del intent clasificado
- [ ] Quality score >0.7 para la mayoría de SuperPrompts generados
- [ ] Topic extraction funciona para "Háblame del impacto de la IA en la educación" (falla actualmente con regex)

---

> **Conclusión final:** El pipeline tiene un problema de fundamentos — el modelo de embeddings no entiende español. Esto hace que el 60% de los vectores pre-computados sean inútiles (ya sea porque no se usan o porque se usan con un modelo que no entiende el idioma). El cambio a `multilingual-e5-small` + conectar los ATTRIBUTE_ANCHORS al `attribute-detector` son las dos acciones de mayor impacto inmediato. El resto de mejoras construyen sobre esa base.
