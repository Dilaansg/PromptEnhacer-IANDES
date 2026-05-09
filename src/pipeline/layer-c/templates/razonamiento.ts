export const razonamientoTemplates: Record<string, string> = {
  resolver_problema:
    'Resuelve el siguiente problema paso a paso: {{topic}}. Muestra tu razonamiento, considera múltiples enfoques, selecciona el óptimo y verifica la solución.',
  toma_decisiones:
    'Ayuda a tomar una decisión sobre {{topic}}. Genera alternativas, evalúa pros y contras de cada una, considera riesgos y recomienda la mejor opción con justificación.',
  prediccion:
    'Basándote en {{#if datos}}los datos: {{datos}}{{else}}tendencias actuales{{/if}}, predice el futuro de {{topic}}. Justifica tu predicción con escenarios posibles y factores críticos.',
  causa_raiz:
    'Identifica la causa raíz de {{topic}}. Usa el método de los 5 Porqués o análisis de Ishikawa, descarta correlaciones espurias y propone soluciones preventivas.',
  estrategia:
    'Diseña una estrategia para {{topic}}. Define objetivos SMART, recursos necesarios, hitos temporales, métricas de éxito y planes de contingencia.',

  // Phase 4.1: Unificados con PROMPT_TYPE_REGISTRY
  deduccion:
    'Aplica razonamiento deductivo para {{topic}}. Parte de premisas generales bien establecidas y deriva conclusiones específicas paso a paso. Verifica la validez lógica de cada inferencia y señala cualquier supuesto implícito.',

  argumentacion:
    'Construye una argumentación sólida sobre {{topic}}. Presenta: (1) Tesis clara, (2) Premisas fundamentadas, (3) Desarrollo lógico con evidencia, (4) Anticipación y refutación de objeciones, (5) Conclusión que sintetice el razonamiento.',

  metodologia:
    'Propón una metodología rigurosa para abordar {{topic}}. Define: (1) Enfoque general y justificación, (2) Pasos secuenciales del proceso, (3) Criterios de evaluación en cada etapa, (4) Mecanismos de validación, (5) Limitaciones y cómo mitigarlas.',
};
