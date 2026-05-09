# Arquitectura de IAndes V6: Análisis Quirúrgico del Pipeline

IAndes opera como un pipeline de optimización semántica de tres capas (A, B, C) que transforma prompts crudos en instrucciones de nivel experto.

---

## Capa A: Clasificación y Extracción Semántica (El "Cerebro")
La misión de la Capa A es deconstruir el input del usuario para entender **qué** pide y **cómo** lo pide.

1.  **Normalización**: Saneamiento del input (lowercase, eliminación de ruidos, colapso de espacios). Mantiene acentos para preservar la semántica del español.
2.  **Clasificación Híbrida**:
    *   **Semántica (Vectorial)**: Genera embeddings locales con `all-MiniLM-L6-v2`. Compara el vector del input contra "Centroides de Ancla" para determinar el `Tipo` (información, código, etc.) e `Intención` (definición, comparación, etc.).
    *   **Heurística (Palabras Clave)**: Fallback basado en puntuación de keywords si la confianza vectorial es baja (<0.45).
3.  **Extracción de Entidades**: Identifica el `Topic` (tema central), `Context` (tecnologías/entorno), `Target` (audiencia) y `Language`. Usa Regex escapados para evitar errores con términos técnicos (ej. "C++").
4.  **Detección de Atributos**: Mapea keywords a metadatos: `nivel`, `formato`, `longitud`, `tono` y `dominio` (Historia, Matemáticas, Psicología, etc.).

---

## Capa B: Enriquecimiento Interactivo (Los "Sentidos")
La Capa B actúa como un puente de retroalimentación si la Capa A no tiene suficiente información para ser excelente.

1.  **Selección de Preguntas**: Un motor de reglas evalúa el output de la Capa A. Si faltan atributos críticos o la intención es ambigua, selecciona preguntas de un registro dinámico.
2.  **Gestión de Estado**: Pausa el pipeline y envía una señal al Side Panel (`SHOW_QUESTIONS`). El sistema queda en estado de espera ("Idle").
3.  **Fusión de Datos**: Al recibir las respuestas del usuario, fusiona estos nuevos atributos con los detectados en la Capa A, creando un perfil de contexto enriquecido.

---

## Capa C: Síntesis de Plantillas (La "Voz")
La Capa C construye el Super-Prompt final inyectando lógica de experto y mejores prácticas.

1.  **Especialización de Dominio (Overrides)**: Antes de usar la librería genérica, consulta el mapa de `DOMAIN_OVERRIDES`. Si el dominio es "Historia", el sistema ignora las plantillas base y usa el rol de "Historiador Experto".
2.  **Motor de Renderizado Recursivo**: Soporta lógica condicional compleja:
    *   `{{#if context}}`: Inyecta contexto específico.
    *   `{{#if isTech}}`: Añade requerimientos de arquitectura y mejores prácticas.
    *   `{{#if isHistory}}`: Añade requerimientos de antecedentes y legado.
3.  **Expansión de Variables**: Sustituye tokens (ej. `{{topic}}`, `{{nivel}}`) por los valores extraídos o definidos por defecto según el tipo de prompt.

---

## Flujo Técnico de Datos
`Prompt Original` -> `Layer A (Clasificación/Entidades)` -> `Layer B (Preguntas? [Opcional])` -> `Layer C (Template + Overrides)` -> `Super-Prompt Optimizado`.
