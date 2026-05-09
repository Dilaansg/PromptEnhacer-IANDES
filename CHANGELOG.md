# Changelog

## [6.2.0] — 2026-05-02

### Added
- **Pipeline Semántico Local Optimizado (Fase 6)**: Migración total a clasificación por embeddings pre-computados para tipos, intents y plantillas.
  - Selección de plantillas (`LayerC`) ahora utiliza vectores de proximidad semántica pre-calculados, reduciendo la latencia y el consumo de RAM.
  - El script `generate-anchors.ts` ahora pre-computa vectores para toda la librería de plantillas.
- **Copy-Paste Inteligente (Fase 3/5)**: Intercepción de contenido pegado en ChatGPT, Claude y Gemini.
  - Detección de volumen de pegado (>60% activa modo contexto).
  - Sub-flujo de preguntas en `LayerB` específico para acciones sobre texto pegado (Resumir, Analizar, Mejorar).
- **Sistema de Log Levels**: Implementación de `Logger` centralizado con soporte para niveles `DEBUG`, `INFO`, `WARN` y `ERROR`.

### Fixed
- **Hotfix: Extracción de Tópicos**: Corregida la truncación de títulos que contienen "de" (ej. "la teoría del huevo" ya no se corta como "la teoría").
- **Hotfix: Preguntas Redundantes**: El selector de preguntas ahora verifica si un atributo (nivel, contexto, intención) ya fue detectado semánticamente antes de disparar la pregunta, eliminando diálogos innecesarios.
- **Hotfix: Desambiguación de IA/AI**: Elevado el umbral de confianza del `DomainClassifier` a 0.45 y protegidas las siglas "IA" y "AI" como tokens técnicos para evitar clasificaciones erróneas hacia Filosofía en temas puramente tecnológicos.
- **Robustez de Dominios**: Corregido bug de falsos positivos en dominios (ej. "ia" en "guerra") mediante el uso de límites de palabra (`\b`) en el motor de búsqueda.


- **Refinamiento de Contextos Académicos**: Los templates de Historia ahora detectan automáticamente y eliminan sugerencias de "ejemplos prácticos" irrelevantes, sustituyéndolos por "legado histórico".
- **Estabilidad de Contexto Chrome**: Implementada protección contra el error "Extension context invalidated" en scripts de contenido tras actualizaciones de la extensión.
- **Validación de Sesión (Anti-Crosstalk)**: Introducción de `sessionId` (UUID) para asegurar que las respuestas del usuario en el panel correspondan a la solicitud de prompt correcta.

### Technical
- Cobertura de tests ampliada: 121 tests unitarios e integración pasando (100% verde).
- Unificación total de tipado en `src/shared/types.ts`.
- Scripts de generación de anchors migrados a `tsx` para soporte ESM nativo.


## [6.1.0] — 2026-05-02

### Added
- **Reconstrucción de Capa A**: Restauración completa de los módulos de la Capa A tras regresión de código.
  - `Normalizer`: Normalización de texto (puntuación, mayúsculas, emojis).
  - `TypeScorer`: Clasificación por palabras clave (Legacy support).
  - `DomainClassifier`: Clasificación semántica de dominios académicos (Matemáticas, Historia, etc.) vía Transformers.js.
  - `EntityExtractor`: Extracción heurística de tópicos, objetivos y contextos.
  - `AttributeDetector`: Detección de atributos de prompt (nivel, formato, tono).
- **Mapeo de Dominios en Layer C**: Integración de resultados del `DomainClassifier` directamente en los atributos de `LayerC` para selección de templates específicos.

### Fixed
- **Estabilización de Mensajería**: Resolución del error "message channel closed" mediante la corrección de los listeners en el panel lateral y el Service Worker.
- **Sincronización de Componentes**: Eliminación de condiciones de carrera entre el botón flotante y el Service Worker al abrir el panel lateral.
- **Type Safety**: Corrección de errores de asignación a propiedades `readonly` en los extractores de la Capa A.
- **Regex Robustez**: Actualización de expresiones regulares en `EntityExtractor` y `AttributeDetector` para soportar tildes y formas femeninas (ej. "avanzada", "explicame").

### Technical
- Verificación completa del pipeline con tests unitarios (20/20 pasando en Capa A).
- Build verificado exitosamente con Vite y TypeScript estricto.

## [6.0.0] — 2026-04-30
... (Previous changes)
