/**
 * Instruction Registry — task‑specific instructions keyed by type + intent.
 *
 * Phase 2.2.1 of the Mitigation Plan.
 * Replaces the monolithic template strings with composable instructions that
 * the SmartPromptArchitect assembles into a complete prompt.
 */

export const INSTRUCTION_REGISTRY: Record<string, Record<string, string>> = {
  // ── INFORMACION ──────────────────────────────────────────────────────────
  informacion: {
    definicion:
      'Define {{topic}} de forma clara, estructurada y completa. Incluye su significado esencial, origen si es relevante, y su importancia en el contexto actual.',
    explicacion_tecnica:
      'Explica {{topic}} con rigor técnico, cubriendo mecanismos subyacentes, principios fundamentales y aplicaciones prácticas. Usa terminología precisa.',
    comparacion:
      'Realiza una comparación sistemática de {{topic}}. Establece criterios explícitos de comparación, señala similitudes y diferencias clave, y ofrece una síntesis final.',
    ejemplo:
      'Proporciona ejemplos concretos e ilustrativos sobre {{topic}}. Cada ejemplo debe estar contextualizado y explicado para facilitar la comprensión.',
    resumen:
      'Resume los aspectos esenciales de {{topic}}, priorizando información de alto valor. Destaca los puntos más importantes y descarta detalles secundarios.',
    paso_a_paso:
      'Guía al usuario paso a paso para comprender o realizar {{topic}}. Cada paso debe ser claro, autocontenido y estar en orden lógico.',
  },

  // ── CODIGO ───────────────────────────────────────────────────────────────
  codigo: {
    escribir_codigo:
      'Escribe código limpio, bien documentado y funcional para {{topic}}. Incluye comentarios explicativos, manejo de errores y sigue las mejores prácticas del lenguaje.',
    debug:
      'Identifica y corrige los problemas en el código proporcionado. Explica cada error encontrado, su causa raíz y la solución aplicada.',
    refactorizar:
      'Refactoriza el código de {{topic}} para mejorar su legibilidad, mantenibilidad y rendimiento. Explica los cambios realizados y su justificación.',
    explicar_codigo:
      'Explica el funcionamiento del código relacionado con {{topic}}. Desglosa cada sección, su propósito y cómo interactúa con el resto del sistema.',
  },

  // ── GENERACION ───────────────────────────────────────────────────────────
  generacion: {
    texto_creativo:
      'Genera contenido creativo sobre {{topic}}. Usa un estilo envolvente, con narrative flow y elementos que capturen el interés del lector.',
    contenido_profesional:
      'Genera contenido profesional sobre {{topic}}. Mantén un tono formal pero accesible, estructura clara y argumentos bien fundamentados.',
    contenido_marketing:
      'Genera contenido de marketing persuasivo sobre {{topic}}. Enfócate en beneficios, diferenciadores y llamados a la acción efectivos.',
    estructura:
      'Crea una estructura o esquema detallado para {{topic}}. Organiza las ideas jerárquicamente, con secciones, subsecciones y puntos clave.',
    ensayo:
      'Escribe un ensayo estructurado sobre {{topic}}. Incluye introducción con tesis, desarrollo con argumentos, y conclusión que sintetice los hallazgos.',
    resumen:
      'Resume de manera concisa pero completa el contenido sobre {{topic}}. Captura las ideas principales sin perder precisión.',
    guion:
      'Escribe un guion para {{topic}}. Define la estructura narrativa, diálogos, indicaciones de tono y ritmo.',
  },

  // ── ANALISIS ─────────────────────────────────────────────────────────────
  analisis: {
    feedback:
      'Proporciona retroalimentación constructiva y detallada sobre {{topic}}. Señala fortalezas, áreas de mejora y ofrece sugerencias accionables.',
    evaluacion:
      'Evalúa {{topic}} con criterios objetivos y bien definidos. Asigna valoraciones fundamentadas y justifica cada juicio.',
    pros_contras:
      'Analiza los pros y contras de {{topic}}. Presenta un balance imparcial, considera múltiples perspectivas y ofrece una conclusión ponderada.',
    comparacion:
      'Compara sistemáticamente {{topic}} usando criterios explícitos. Identifica dónde cada opción destaca y dónde se queda corta.',
    critica:
      'Realiza una crítica fundamentada de {{topic}}. Examina supuestos, evalúa la solidez de los argumentos y propone perspectivas alternativas.',
    analizar_texto:
      'Analiza el texto proporcionado sobre {{topic}}. Examina estructura, argumentación, estilo, y extrae los insights principales.',
    analizar_datos:
      'Analiza los datos relacionados con {{topic}}. Identifica patrones, tendencias, anomalías y presenta conclusiones respaldadas por la evidencia.',
    evaluar_argumentos:
      'Evalúa la solidez de los argumentos sobre {{topic}}. Identifica premisas, examina la lógica y determina si las conclusiones están justificadas.',
    revision_critica:
      'Realiza una revisión crítica de {{topic}}. Cuestiona supuestos, identifica sesgos y propone interpretaciones alternativas.',
    extraccion_insights:
      'Extrae insights accionables de {{topic}}. Identifica patrones relevantes, formula hipótesis y sugiere implicaciones prácticas.',
  },

  // ── RAZONAMIENTO ─────────────────────────────────────────────────────────
  razonamiento: {
    resolver_problema:
      'Resuelve el problema de {{topic}} de forma metódica. Desglosa el problema, aplica el razonamiento paso a paso y verifica la solución.',
    toma_decisiones:
      'Ayuda a tomar una decisión informada sobre {{topic}}. Evalúa opciones con criterios ponderados, considera trade-offs y recomienda un curso de acción.',
    prediccion:
      'Realiza una predicción fundamentada sobre {{topic}}. Basa el pronóstico en datos, tendencias observables y razonamiento lógico.',
    causa_raiz:
      'Identifica la causa raíz del problema {{topic}}. Aplica análisis sistemático, descarta explicaciones superficiales y llega al origen.',
    deduccion:
      'Aplica razonamiento deductivo sobre {{topic}}. Parte de premisas generales para llegar a conclusiones específicas y verificables.',
    argumentacion:
      'Construye una argumentación sólida sobre {{topic}}. Presenta premisas claras, razonamiento lógico y aborda posibles objeciones.',
    metodologia:
      'Propón una metodología rigurosa para abordar {{topic}}. Define pasos, criterios de evaluación y mecanismos de validación.',
  },

  // ── ACCION ───────────────────────────────────────────────────────────────
  accion: {
    tutorial:
      'Crea un tutorial claro y práctico sobre {{topic}}. Estructura el contenido en pasos secuenciales con explicaciones y ejemplos.',
    plan:
      'Desarrolla un plan de acción detallado para {{topic}}. Define objetivos, hitos, recursos necesarios y criterios de éxito.',
    checklist:
      'Genera una lista de verificación exhaustiva para {{topic}}. Cada ítem debe ser accionable, específico y verificable.',
    solucion:
      'Propón una solución paso a paso para {{topic}}. Cada paso debe ser concreto, con instrucciones claras y resultados esperados.',
  },

  // ── TRANSFORMACION ───────────────────────────────────────────────────────
  transformacion: {
    resumen:
      'Resume el contenido de {{topic}} de forma concisa pero completa. Captura los puntos esenciales y elimina redundancias.',
    traduccion:
      'Traduce el contenido de {{topic}} manteniendo el significado, tono y matices del original. Asegura precisión terminológica.',
    simplificacion:
      'Simplifica {{topic}} haciéndolo accesible sin perder precisión. Usa lenguaje claro, evita jerga innecesaria y explica conceptos complejos.',
    reformulacion:
      'Reformula {{topic}} manteniendo el mensaje central pero mejorando claridad, fluidez y estructura.',
  },

  // ── CONVERSACION ─────────────────────────────────────────────────────────
  conversacion: {
    roleplay:
      'Participa en un roleplay sobre {{topic}}. Mantén el personaje asignado, responde de forma natural y enriquece la interacción.',
    debate:
      'Participa en un debate estructurado sobre {{topic}}. Presenta argumentos sólidos, responde a contraargumentos y mantén un tono respetuoso.',
    entrevista:
      'Conduce una entrevista simulada sobre {{topic}}. Haz preguntas relevantes, profundiza en las respuestas y mantén un flujo natural.',
    brainstorm:
      'Facilita una sesión de lluvia de ideas sobre {{topic}}. Genera ideas diversas, fomenta la creatividad y organiza las contribuciones.',
  },
};

/** Fallback instruction when type/intent combination is not found. */
export function getInstruction(typeId: string, intentId: string): string {
  const typeInstructions = INSTRUCTION_REGISTRY[typeId];
  if (typeInstructions) {
    if (typeInstructions[intentId]) return typeInstructions[intentId];
    // Return first available instruction for this type
    const first = Object.values(typeInstructions)[0];
    if (first) return first;
  }
  // Ultimate fallback
  return 'Responde a la solicitud del usuario sobre {{topic}} de forma útil, precisa y bien estructurada.';
}

/**
 * Simple template interpolation — replaces {{key}} with context values.
 */
export function interpolateInstruction(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = context[key];
    return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
  });
}
