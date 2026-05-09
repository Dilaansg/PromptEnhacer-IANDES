export const generacionTemplates: Record<string, string> = {
  texto_creativo:
    'Escribe un texto creativo sobre {{topic}}. {{#if (eq nivel "basico")}}Usa un estilo simple, mágico y evocador, ideal para niños o lectores jóvenes.{{else}}Emplea un tono {{#if tono}}{{tono}}{{else}}original y cautivador{{/if}}, destacando imágenes sensoriales, ritmo narrativo y una estructura que mantenga el interés.{{/if}}',
  contenido_profesional:
    'Actúa como un redactor experto. Genera contenido profesional{{#if target}} dirigido a {{target}}{{/if}} sobre {{topic}}. Usa un tono formal, datos respaldados y una estructura impecable: introducción estratégica, desarrollo analítico y conclusiones accionables.',
  contenido_marketing:
    'Crea un copy de marketing persuasivo para {{#if canal}}{{canal}}{{else}}redes sociales{{/if}} sobre {{topic}}. Incluye un gancho inicial impactante, propuesta de valor clara, y una llamada a la acción (CTA) efectiva. El tono debe ser {{#if tono}}{{tono}}{{else}}atractivo y dinámico{{/if}}.',
  estructura:
    'Genera un esquema jerárquico y detallado sobre {{topic}}. Organiza la información en secciones lógicas con títulos descriptivos, subtítulos y breves guías sobre qué contenido debe incluirse en cada apartado para garantizar una cobertura exhaustiva.',
  guion:
    'Escribe un guion estructurado para {{#if formato}}{{formato}}{{else}}un video o presentación{{/if}} sobre {{topic}}. Incluye tiempos estimados, indicaciones de tono, desarrollo por escenas y un cierre con un mensaje clave potente.',
  producto:
    'Genera una descripción de producto de alta conversión para {{topic}}. {{#if target}}Enfócate en las necesidades de {{target}}.{{/if}} Destaca los beneficios principales, características diferenciadoras y resuelve posibles objeciones del cliente.',
};
