/**
 * informacion.ts — Generic information templates with domain-flag blocks.
 *
 * DESIGN CONSTRAINT: The render engine handles {{#if key}}...{{else}}...{{/if}}
 * as leaf-level blocks. The `(eq nivel "val")` pattern also works at leaf level.
 * HOWEVER: NESTED {{else}} inside an outer {{else}} branch does NOT work reliably.
 *
 * Pattern used here:
 *   1. A BASE text that always renders (unconditional).
 *   2. ADDITIVE {{#if domainFlag}} blocks that append domain-specific context.
 *   3. Leaf-level {{#if (eq nivel "basico")}}...{{else}}...{{/if}} blocks
 *      (these are simple, non-nested else — safe to use).
 *
 * Domain flags (set by TemplateEngine.enrichContext):
 *   isMath, isHistory, isTech, isScience, isPsychology,
 *   isMedicine, isEconomics, isLiterature, isPhilosophy, isAcademic
 */
export const informacionTemplates: Record<string, string> = {
  definicion:
    'Define {{topic}} de forma clara y precisa, incluyendo su significado esencial y su importancia.{{#if (eq nivel "basico")}} Usa un lenguaje muy sencillo, pedagógico y ejemplos cotidianos.{{else}}{{#if (eq nivel "avanzado")}} Proporciona una definición técnica y exhaustiva, abordando matices complejos y su posición dentro de la disciplina.{{/if}}{{/if}}{{#if isMath}} Incluye notación estándar, propiedades fundamentales y un ejemplo numérico resuelto paso a paso.{{/if}}{{#if isPsychology}} Explica el origen terminológico de {{topic}}, cómo se diferencia de conceptos similares y las principales corrientes que lo abordan.{{/if}}{{#if isHistory}} Abarca su origen, evolución cronológica y relevancia histórica.{{/if}}{{#if isPhilosophy}} Presenta el problema central, principales posiciones filosóficas y criterios de distinción entre ellas.{{/if}}{{#if isTech}} Explica el stack técnico, casos de uso comunes y su lugar en el ecosistema actual.{{/if}}{{#if contexto}} En el contexto de {{contexto}}, detalla la relevancia{{#if isHistory}} y el legado histórico{{else}} y aplicaciones específicas{{/if}} de {{topic}}.{{/if}}',

  explicacion_tecnica:
    'Actúa como experto{{#if contexto}} en {{contexto}}{{else}} en el tema{{/if}}. Explica {{topic}} con claridad y precisión.{{#if (eq nivel "basico")}} Hazlo de manera amena y didáctica, usando analogías claras y lenguaje accesible para principiantes. Evita tecnicismos innecesarios.{{else}}{{#if (eq nivel "avanzado")}} Realiza una explicación profunda y técnica, analizando mecanismos internos, teorías subyacentes y debates académicos actuales.{{/if}}{{/if}}{{#if isMath}} Usa rigor formal, notación estándar y presenta demostraciones paso a paso. Incluye axiomas o teoremas relacionados y verificación del resultado.{{/if}}{{#if isPsychology}} Aborda el tema desde una perspectiva científica: teorías subyacentes, manifestaciones comunes, impacto en el bienestar y enfoques terapéuticos modernos. Evita emitir diagnósticos clínicos.{{/if}}{{#if isHistory}} Incluye antecedentes históricos, contexto socio-político, figuras clave, impacto a largo plazo y legado actual.{{/if}}{{#if isMedicine}} Aborda con precisión clínica: fisiopatología, criterios diagnósticos, opciones terapéuticas y evidencia científica actualizada.{{/if}}{{#if isEconomics}} Incluye contexto de mercado, perspectivas micro y macroeconómicas, indicadores clave y debates actuales en la literatura económica.{{/if}}{{#if isPhilosophy}} Estructura el razonamiento lógicamente: menciona autores o corrientes relacionadas y distingue posiciones filosóficas contrastantes.{{/if}}{{#if isLiterature}} Incluye corriente literaria, contexto histórico del autor/obra, recursos retóricos o narrativos y recepción crítica.{{/if}}{{#if isScience}} Incluye mecanismos relevantes, base experimental y evidencia empírica.{{/if}}{{#if isTech}} Enfócate en arquitectura, patrones de diseño, escalabilidad, seguridad y mejores prácticas actuales. Incluye comparaciones con tecnologías similares.{{/if}} Incluye conceptos clave y definiciones precisas{{#if isHistory}}.{{else}}, ejemplos prácticos y aplicaciones reales en el mundo actual.{{/if}}',

  comparacion:
    'Compara {{topic}} de forma detallada, estableciendo criterios claros de análisis.{{#if isHistory}} Analiza: contexto histórico, causas subyacentes, líderes involucrados y consecuencias globales. Presenta una tabla cronológica de eventos.{{/if}}{{#if isMath}} Analiza: propiedades estructurales, complejidad computacional, teoremas aplicables y casos de uso.{{/if}}{{#if isTech}} Analiza: rendimiento, escalabilidad, mantenibilidad, soporte de la comunidad y curva de aprendizaje. Incluye una matriz de decisión técnica.{{/if}}{{#if isPsychology}} Analiza: perspectivas teóricas (cognitiva, conductual, psicoanalítica, humanista), evidencia empírica y aplicaciones clínicas.{{/if}}{{#if isEconomics}} Analiza: eficiencia, equidad, costo-beneficio, externalidades y efectos a corto y largo plazo.{{/if}} Presenta una tabla comparativa y una síntesis crítica.',

  ejemplo:
    'Proporciona {{#if cantidad}}{{cantidad}}{{else}}varios{{/if}} ejemplos ilustrativos de {{topic}}.{{#if (eq nivel "basico")}} Asegúrate de que los ejemplos sean divertidos, visuales y fáciles de entender.{{else}} Los ejemplos deben ser rigurosos y demostrar casos de aplicación real en {{#if contexto}}{{contexto}}{{else}}su campo{{/if}}.{{/if}}',

  resumen:
    'Realiza un resumen estructurado sobre {{topic}}. Organiza la información en {{#if formato}}{{formato}}{{else}}puntos clave de alto valor{{/if}}, priorizando los hallazgos más importantes.{{#if isAcademic}} Incluye referencias a autores o fuentes relevantes.{{/if}}',

  paso_a_paso:
    'Guía al usuario paso a paso para {{topic}}. Estructura el proceso en fases lógicas, indicando requisitos previos, advertencias sobre errores comunes y consejos de experto para cada etapa.{{#if isTech}} Incluye snippets de código donde aplique.{{/if}}',
};
