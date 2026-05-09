import { QuestionDefinition } from '@shared/types';

export const QUESTION_BANK: QuestionDefinition[] = [
  // paste — highest priority
  {
    id: 'q-paste-action',
    dimension: 'paste_action',
    trigger: (output) =>
      !!output.entities.inputContent && !!output.entities.externalContext,
    question: '¿Qué quieres hacer con el texto pegado?',
    options: ['Resumirlo', 'Analizarlo', 'Traducirlo', 'Mejorarlo', 'Usarlo como contexto'],
    mapsTo: 'intencion',
  },

  // tipo — when mode is multi
  {
    id: 'q-tipo-1',
    dimension: 'tipo',
    trigger: (output) => output.mode === 'multi',
    question: '¿Qué quieres hacer principalmente?',
    options: ['Explicar', 'Crear', 'Analizar', 'Comparar', 'Traducir', 'Resumir'],
    mapsTo: 'tipo',
  },
  {
    id: 'q-tipo-2',
    dimension: 'tipo',
    trigger: (output) => output.mode === 'multi',
    question: '¿Cuál es el objetivo principal de tu solicitud?',
    options: ['Obtener información', 'Generar contenido', 'Resolver un problema', 'Aprender algo nuevo'],
    mapsTo: 'tipo',
  },
  {
    id: 'q-tipo-3',
    dimension: 'tipo',
    trigger: (output) => output.mode === 'multi',
    question: '¿Qué tipo de tarea estás intentando realizar?',
    options: ['Escritura', 'Programación', 'Investigación', 'Brainstorming', 'Edición'],
    mapsTo: 'tipo',
  },

  // nivel — when nivel is not detected
  {
    id: 'q-nivel-1',
    dimension: 'nivel',
    trigger: (output) => !output.detectedAttributes.nivel,
    question: '¿Qué nivel de profundidad necesitas?',
    options: ['Básico', 'Intermedio', 'Avanzado'],
    mapsTo: 'nivel',
  },
  {
    id: 'q-nivel-2',
    dimension: 'nivel',
    trigger: (output) => !output.detectedAttributes.nivel,
    question: '¿Cuánto detalle técnico requieres?',
    options: ['Introductorio', 'Técnico moderado', 'Experto'],
    mapsTo: 'nivel',
  },
  {
    id: 'q-nivel-3',
    dimension: 'nivel',
    trigger: (output) => !output.detectedAttributes.nivel,
    question: '¿Para qué nivel de conocimiento previo es esto?',
    options: ['Principiante', 'Intermedio', 'Experto'],
    mapsTo: 'nivel',
  },

  // formato — when formato is not detected
  {
    id: 'q-formato-1',
    dimension: 'formato',
    trigger: (output) => !output.detectedAttributes.formato,
    question: '¿En qué formato quieres la respuesta?',
    options: ['Texto libre', 'Lista numerada', 'Lista con viñetas', 'Tabla', 'JSON', 'Código'],
    mapsTo: 'formato',
  },
  {
    id: 'q-formato-2',
    dimension: 'formato',
    trigger: (output) => !output.detectedAttributes.formato,
    question: '¿Cómo prefieres que se estructure la respuesta?',
    options: ['Párrafos', 'Pasos', 'Puntos clave', 'Comparación lado a lado'],
    mapsTo: 'formato',
  },
  {
    id: 'q-formato-3',
    dimension: 'formato',
    trigger: (output) => !output.detectedAttributes.formato,
    question: '¿Qué formato de salida te sería más útil?',
    options: ['Resumen corto', 'Explicación detallada', 'Ejemplos prácticos', 'Plantilla'],
    mapsTo: 'formato',
  },

  // intencion — when intent is ambiguous or missing
  {
    id: 'q-intencion-1',
    dimension: 'intencion',
    trigger: (output) =>
      output.classification.confidence < 0.7 ||
      output.classification.intentId === 'desconocido',
    question: '¿Cuál es tu intención específica?',
    options: ['Entender', 'Crear algo nuevo', 'Mejorar existente', 'Depurar/Arreglar', 'Evaluar/Decidir'],
    mapsTo: 'intencion',
  },
  {
    id: 'q-intencion-2',
    dimension: 'intencion',
    trigger: (output) =>
      output.classification.confidence < 0.7 ||
      output.classification.intentId === 'desconocido',
    question: '¿Qué esperas lograr con esta respuesta?',
    options: ['Acción concreta', 'Conocimiento', 'Inspiración', 'Validación de idea'],
    mapsTo: 'intencion',
  },
  {
    id: 'q-intencion-3',
    dimension: 'intencion',
    trigger: (output) =>
      output.classification.confidence < 0.7 ||
      output.classification.intentId === 'desconocido',
    question: '¿Cómo vas a usar la información?',
    options: ['Implementar directamente', 'Tomar una decisión', 'Compartir con otros', 'Referencia futura'],
    mapsTo: 'intencion',
  },

  // audiencia — when not detected
  {
    id: 'q-audiencia-1',
    dimension: 'audiencia',
    trigger: (output) => !output.detectedAttributes.audiencia,
    question: '¿Para quién es esta respuesta?',
    options: ['Para mí', 'Para un cliente', 'Para un estudiante', 'Para un niño', 'Para un ejecutivo', 'Para un técnico'],
    mapsTo: 'audiencia',
  },
  {
    id: 'q-audiencia-2',
    dimension: 'audiencia',
    trigger: (output) => !output.detectedAttributes.audiencia,
    question: '¿Quién leerá o usará esta información?',
    options: ['Uso personal', 'Equipo de trabajo', 'Público general', 'Audiencia técnica'],
    mapsTo: 'audiencia',
  },
  {
    id: 'q-audiencia-3',
    dimension: 'audiencia',
    trigger: (output) => !output.detectedAttributes.audiencia,
    question: '¿Cuál es el perfil del destinatario?',
    options: ['No técnico', 'Semi-técnico', 'Altamente técnico', 'Ejecutivo/CEO'],
    mapsTo: 'audiencia',
  },

  // contexto — when not detected
  {
    id: 'q-contexto-1',
    dimension: 'contexto',
    trigger: (output) => !output.detectedAttributes.contexto,
    question: '¿Hay algún contexto adicional que deba saber?',
    options: ['Sin contexto adicional', 'Proyecto académico', 'Trabajo profesional', 'Proyecto personal', 'Urgente/Deadline'],
    mapsTo: 'contexto',
  },
  {
    id: 'q-contexto-2',
    dimension: 'contexto',
    trigger: (output) => !output.detectedAttributes.contexto,
    question: '¿En qué situación vas a usar esto?',
    options: ['Estudio/Aprendizaje', 'Trabajo', 'Hobby', 'Presentación'],
    mapsTo: 'contexto',
  },
  {
    id: 'q-contexto-3',
    dimension: 'contexto',
    trigger: (output) => !output.detectedAttributes.contexto,
    question: '¿Qué restricciones o limitaciones debo considerar?',
    options: ['Ninguna', 'Tiempo limitado', 'Presupuesto limitado', 'Recursos técnicos limitados', 'Restricciones legales/éticas'],
    mapsTo: 'contexto',
  },

  // proposito — academic context questions
  {
    id: 'q-proposito-1',
    dimension: 'proposito',
    trigger: (output) =>
      output.attributes.contexto === 'academico' ||
      output.detectedAttributes.contexto === 'academico',
    question: '¿Para qué es esto?',
    options: ['Tarea/trabajo', 'Estudio personal', 'Tesis/investigación', 'Presentación', 'Examen', 'Paper/artículo'],
    mapsTo: 'proposito',
  },
  {
    id: 'q-materia-1',
    dimension: 'materia',
    trigger: (output) =>
      output.attributes.contexto === 'academico' ||
      output.detectedAttributes.contexto === 'academico',
    question: '¿A qué área pertenece?',
    options: [
      'Ciencias sociales',
      'Ciencias naturales',
      'Ingeniería/Tecnología',
      'Humanidades',
      'Matemáticas',
      'Salud/Medicina',
      'Economía/Negocios',
      'Derecho',
      'Psicología',
      'Educación',
    ],
    mapsTo: 'materia',
  },
  {
    id: 'q-nivel-curso-1',
    dimension: 'nivel_curso',
    trigger: (output) =>
      output.attributes.contexto === 'academico' ||
      output.detectedAttributes.contexto === 'academico',
    question: '¿Qué nivel tiene el curso?',
    options: ['Pregrado primer año', 'Pregrado avanzado', 'Posgrado', 'Investigación doctoral'],
    mapsTo: 'nivel_curso',
  },
  {
    id: 'q-tipo-texto-1',
    dimension: 'tipo_texto',
    trigger: (output) =>
      output.attributes.contexto === 'academico' ||
      output.detectedAttributes.contexto === 'academico',
    question: '¿Qué tipo de respuesta necesitas?',
    options: ['Explicación conceptual', 'Solución paso a paso', 'Ejemplo resuelto', 'Resumen ejecutivo', 'Análisis crítico'],
    mapsTo: 'tipo_texto',
  },
];
