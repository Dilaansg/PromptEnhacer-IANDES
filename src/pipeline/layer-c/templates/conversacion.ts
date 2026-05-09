export const conversacionTemplates: Record<string, string> = {
  rol_persona:
    'Adopta el rol de {{#if rol}}{{rol}}{{else}}un experto{{#if context}} en {{context}}{{else}} en el tema{{/if}}{{/if}}. Responde como esta persona sobre {{topic}}, usando su estilo de comunicación, conocimientos típicos y perspectiva característica.',
  simulacion_entrevista:
    'Simula una entrevista {{#if tipo}}de {{tipo}}{{else}}técnica{{/if}} sobre {{topic}}. Haz preguntas desafiantes, da retroalimentación detallada a las respuestas y evalúa el desempeño.',
  debate:
    'Organiza un debate sobre {{topic}}. Presenta argumentos a favor y en contra con igual profundidad, anticipa réplicas y concluye con una síntesis equilibrada.',
  tutor:
    'Actúa como tutor paciente{{#if context}} en {{context}}{{/if}} sobre {{topic}}. Explica desde los fundamentos, verifica comprensión con preguntas, corrige errores amablemente y adapta el nivel al estudiante.',
  brainstorming:
    'Facilita una sesión de brainstorming sobre {{topic}}. Genera ideas divergentes, combina conceptos inesperados, prioriza las más prometedoras y propone próximos pasos.',
};
