/**
 * Registro de Personalidades Expertas — lookup en cascada:
 *  1. typeId + domain   (más específico)
 *  2. typeId solo       (rol genérico por tipo de tarea)
 *  3. domain solo       (experto de dominio, sin tipo)
 *  4. default           (fallback multidisciplinario)
 *
 * Ej: generacion + tecnologia → "escritor y divulgador técnico"
 *     informacion + tecnologia → "arquitecto de software senior" (explica, no crea)
 */
export const DOMAIN_PERSONAS: Record<string, string> = {
  historia: 'un historiador experto con enfoque en análisis crítico y fuentes primarias',
  matematicas: 'un matemático académico especializado en resolución de problemas y pedagogía técnica',
  tecnologia: 'un arquitecto de software senior con visión estratégica y mejores prácticas',
  psicologia: 'un psicólogo investigador con enfoque en evidencia científica y corrientes teóricas',
  economia: 'un economista analítico con visión macro y microeconómica',
  biologia: 'un biólogo investigador experto en mecanismos moleculares y ecología',
  fisica: 'un físico docente con rigor conceptual y dominio de leyes fundamentales',
  quimica: 'un químico académico experto en estructura molecular y reactividad',
  literatura: 'un crítico literario con profundidad interpretativa y contexto estético',
  filosofia: 'un filósofo analítico con rigor lógico y dominio de la tradición filosófica',
  derecho: 'un jurista académico con precisión normativa y visión dogmática',
  default: 'un experto académico multidisciplinario',
};

/**
 * Personas combinadas: typeId + domain.
 * Clave = `${typeId}+${domain}`. Solo se definen las combinaciones que difieren
 * del experto de dominio puro.
 */
const TYPE_DOMAIN_PERSONAS: Record<string, string> = {
  // Generacion → creador de contenido, no solo experto técnico
  'generacion+tecnologia':  'un escritor y divulgador técnico especializado en tecnología',
  'generacion+historia':    'un historiador y divulgador con talento narrativo',
  'generacion+biologia':    'un divulgador científico especializado en biología',
  'generacion+fisica':      'un divulgador científico con rigor conceptual y claridad expositiva',
  'generacion+quimica':     'un divulgador científico experto en química',
  'generacion+matematicas': 'un divulgador y pedagogo matemático',
  'generacion+psicologia':  'un psicólogo y divulgador con enfoque accesible y riguroso',
  'generacion+economia':    'un economista y analista con habilidad de comunicación',
  'generacion+literatura':  'un escritor y crítico literario con estilo cuidado',
  'generacion+filosofia':   'un filósofo y ensayista con claridad argumentativa',
  'generacion+derecho':     'un jurista y redactor jurídico con precisión y claridad',
  // Analisis → analista, no solo experto
  'analisis+tecnologia':    'un analista técnico senior con pensamiento crítico',
  'analisis+economia':      'un analista económico con rigor metodológico',
  // Codigo → igual que domain (sin override necesario)
  // Informacion → igual que domain (sin override necesario)
};

/**
 * Personas por tipo de tarea (sin dominio específico).
 */
const TYPE_PERSONAS: Record<string, string> = {
  generacion:     'un redactor creativo y versátil con dominio de múltiples géneros',
  analisis:       'un analista crítico con capacidad de síntesis y evaluación objetiva',
  codigo:         'un desarrollador de software senior con enfoque en buenas prácticas',
  transformacion: 'un editor experto en resúmenes, traducción y adaptación de contenido',
  accion:         'un planificador estratégico orientado a resultados',
  conversacion:   'un facilitador de diálogo con capacidad de roleplay y debate',
  razonamiento:   'un razonador lógico con enfoque en resolución de problemas',
};

export function getPersona(domain?: string, typeId?: string): string {
  const dom = domain?.toLowerCase() || '';
  const type = typeId?.toLowerCase() || '';

  // 1. Type + Domain (más específico)
  if (dom && type) {
    const comboKey = `${type}+${dom}`;
    const combo = TYPE_DOMAIN_PERSONAS[comboKey];
    if (combo) return combo;
  }

  // 2. Type-only persona (rol genérico según tipo de tarea)
  if (type) {
    const typePersona = TYPE_PERSONAS[type];
    if (typePersona) return typePersona;
  }

  // 3. Domain-only persona (experto de dominio)
  if (dom) {
    const domainPersona = DOMAIN_PERSONAS[dom];
    if (domainPersona) return domainPersona;
  }

  // 4. Default fallback
  return DOMAIN_PERSONAS.default;
}
