/**
 * analisis.ts — Generic analysis templates with domain-flag enrichment.
 * Domain blocks are additive — they add role/criteria context without replacing
 * the base structure.
 */
export const analisisTemplates: Record<string, string> = {
  analizar_texto:
    'Actúa como {{#if isHistory}}historiador analítico{{else}}{{#if isPsychology}}psicólogo académico{{else}}{{#if isTech}}arquitecto de software{{else}}{{#if isLiterature}}crítico literario{{else}}{{#if isPhilosophy}}filósofo analítico{{else}}analista experto{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}. Analiza el siguiente contenido sobre {{topic}}. Identifica la tesis principal, argumentos clave, supuestos implícitos, sesgos potenciales y fortalezas de la estructura argumentativa. {{#if isHistory}}Incluye contexto socio-político e impacto a largo plazo.{{/if}}{{#if isPsychology}}Considera perspectivas cognitiva, conductual y humanista.{{/if}}',

  analizar_datos:
    'Actúa como analista de datos{{#if contexto}} en {{contexto}}{{/if}}. Analiza los datos proporcionados sobre {{topic}}, identifica patrones, anomalías, correlaciones relevantes y presenta hallazgos con interpretación contextual. {{#if isEconomics}}Incluye perspectivas micro y macroeconómicas y datos comparativos de mercado.{{/if}}{{#if isScience}}Valida la significancia estadística y menciona posibles confundidores.{{/if}}',

  evaluar_argumentos:
    'Evalúa los argumentos presentados sobre {{topic}}. Clasifícalos en fuertes, débiles o falaces, explica por qué y sugiere contra-argumentos o evidencia faltante. {{#if isPhilosophy}}Aplica criterios de validez lógica, coherencia interna y solidez epistemológica.{{/if}}{{#if isEconomics}}Evalúa asunciones de racionalidad, datos empíricos y posibles externalidades.{{/if}}',

  revision_critica:
    'Realiza una revisión crítica de {{topic}}. Examina metodología, fuentes, conclusiones y limitaciones. {{#if isScience}}Evalúa el rigor científico: reproducibilidad, tamaño de muestra, significancia estadística y posibles sesgos de publicación.{{/if}}{{#if isLiterature}}Analiza recursos retóricos, estilo narrativo y recepción crítica de la obra.{{/if}} Asigna una calificación general y justifícala.',

  extraccion_insights:
    'Extrae los insights más valiosos de {{topic}}. Prioriza hallazgos accionables, señala tendencias emergentes y relaciona los datos con implicaciones estratégicas. {{#if isTech}}Incluye implicaciones arquitectónicas y de deuda técnica.{{/if}}{{#if isEconomics}}Relaciona con indicadores macroeconómicos y perspectivas de mercado.{{/if}}',

  // Phase 4.1: Intents unificados con PROMPT_TYPE_REGISTRY
  feedback:
    'Proporciona retroalimentación constructiva y detallada sobre {{topic}}. Organiza tu respuesta en: (1) Fortalezas — qué funciona bien y por qué, (2) Áreas de mejora — qué podría optimizarse y cómo, (3) Recomendaciones accionables — pasos concretos para mejorar. Sé específico, evita generalidades y enfócate en el impacto.',

  pros_contras:
    'Analiza los pros y contras de {{topic}}. Para cada aspecto: (1) Describe el punto, (2) Evalúa su impacto (positivo o negativo), (3) Pondera su importancia relativa. Concluye con un balance general y una recomendación fundamentada. {{#if isEconomics}}Considera costos de oportunidad y externalidades.{{/if}}{{#if isTech}}Evalúa deuda técnica, escalabilidad y mantenibilidad.{{/if}}',
};
