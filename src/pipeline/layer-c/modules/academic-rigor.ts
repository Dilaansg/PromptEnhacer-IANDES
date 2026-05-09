/**
 * Reglas de Rigor Académico por Dominio.
 * Estas instrucciones se inyectan dinámicamente para asegurar la calidad IAndes.
 */
export const ACADEMIC_RIGOR_RULES: Record<string, string[]> = {
  historia: [
    'Distingue claramente entre hechos documentados e interpretaciones historiográficas.',
    'Menciona el contexto socio-político de la época.',
    'Si es posible, referencia corrientes de pensamiento histórico relevantes.'
  ],
  matematicas: [
    'Define formalmente los términos y variables antes de usarlos.',
    'Presenta los pasos lógicos de forma deductiva.',
    'Verifica la validez de los resultados mediante contraejemplos o pruebas.'
  ],
  tecnologia: [
    'Analiza las compensaciones (trade-offs) entre diferentes soluciones.',
    'Considera la escalabilidad y mantenibilidad del código o arquitectura.',
    'Menciona patrones de diseño estándar de la industria.'
  ],
  filosofia: [
    'Identifica las premisas implícitas en el razonamiento.',
    'Evita falacias lógicas y define conceptos abstractos con precisión.',
    'Sitúa la discusión dentro de la tradición filosófica pertinente.'
  ],
  general: [
    'Mantén un tono objetivo, riguroso y académico.',
    'Evita generalizaciones sin sustento y adjetivos subjetivos.',
    'Cita fuentes o autores clave si la profundidad del tema lo requiere.'
  ]
};

export function getRigorRules(domain?: string): string[] {
  const specific = ACADEMIC_RIGOR_RULES[domain?.toLowerCase() || ''] || [];
  return [...ACADEMIC_RIGOR_RULES.general, ...specific];
}
