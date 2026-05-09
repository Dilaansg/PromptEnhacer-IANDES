/**
 * Format Registry — output structure guides keyed by canonical format value.
 *
 * Phase 2.2.2 of the Mitigation Plan.
 * Maps the normalised format values produced by Layer B (parrafos, lista,
 * tabla, paso_a_paso, codigo) to natural‑language output‑formatting
 * instructions injected into the SuperPrompt.
 */

export const FORMAT_REGISTRY: Record<string, string> = {
  parrafos:
    'Estructura tu respuesta en párrafos claros y bien organizados, con transiciones fluidas entre ideas.',

  lista:
    'Presenta la información en una lista de puntos clave. Usa viñetas para cada elemento y organiza de lo más a lo menos importante.',

  tabla:
    'Organiza la información en una tabla comparativa. Define columnas con criterios claros y filas con los elementos a comparar.',

  paso_a_paso:
    'Estructura la respuesta como una guía numerada paso a paso. Cada paso debe ser autocontenido, estar en orden lógico e incluir el resultado esperado.',

  codigo:
    'Presenta la solución como bloques de código formateados. Incluye comentarios explicativos en cada sección relevante y especifica el lenguaje.',

  json:
    'Devuelve la respuesta en formato JSON válido y bien estructurado. Incluye claves descriptivas y valores apropiados.',

  markdown:
    'Formatea la respuesta usando Markdown. Usa encabezados, listas, negritas, bloques de código y otros elementos según corresponda.',

  resumen:
    'Proporciona un resumen conciso y directo. Prioriza la información esencial y elimina detalles secundarios.',

  plantilla:
    'Proporciona una plantilla reusable. Usa marcadores de posición claros para las partes que el usuario debe personalizar.',

  dialogo:
    'Estructura la respuesta como un diálogo. Usa el formato Personaje: texto para cada intervención.',

  ejemplos:
    'Enfoca la respuesta en ejemplos prácticos. Cada concepto debe ir acompañado de al menos un ejemplo concreto y contextualizado.',
};

/** Fallback format instruction when no specific format is requested. */
export const DEFAULT_FORMAT_INSTRUCTION =
  'Estructura la respuesta de forma clara y organizada, adaptándola al tipo de contenido.';

/**
 * Retrieve the format instruction for a given canonical format value.
 * Returns the default if the format is not in the registry.
 */
export function getFormatInstruction(format?: string): string {
  if (!format) return DEFAULT_FORMAT_INSTRUCTION;
  const key = format.toLowerCase().trim();
  return FORMAT_REGISTRY[key] ?? DEFAULT_FORMAT_INSTRUCTION;
}
