export const codigoTemplates: Record<string, string> = {
  escribir_codigo:
    'Actúa como desarrollador experto{{#if context}} en {{context}}{{else}} en el lenguaje o stack relevante{{/if}}. Tu tarea es escribir código que {{topic}}. Incluye manejo de errores, comentarios explicativos, validaciones de entrada y sigue las mejores prácticas del lenguaje.',
  debug:
    'Actúa como debugger experto{{#if context}} en {{context}}{{/if}}. Analiza este código:\n```\n{{code}}\n```\nIdentifica bugs potenciales, problemas de rendimiento, riesgos de seguridad y propone correcciones con explicaciones.',
  refactorizar:
    'Refactoriza el siguiente código para mejorar {{#if objetivo}}{{objetivo}}{{else}}legibilidad y mantenibilidad{{/if}}:\n```\n{{code}}\n```\nExplica los cambios realizados y los principios aplicados.',
  explicar_codigo:
    'Explica línea por línea este código:\n```\n{{code}}\n```\nDetalla qué hace cada bloque, por qué se usó cada función o estructura, y qué resultado produce.',
  documentar_codigo:
    'Genera documentación técnica para el siguiente código, incluyendo docstrings, README breve y diagrama de flujo si aplica:\n```\n{{code}}\n```',
  test_unitarios:
    'Escribe tests unitarios para el siguiente código cubriendo casos normales, edge cases y manejo de errores. Usa {{#if framework}}{{framework}}{{else}}el framework de testing estándar del lenguaje{{/if}}:\n```\n{{code}}\n```',
};
