export const transformacionTemplates: Record<string, string> = {
  resumen:
    'Resume el siguiente texto sobre {{topic}} en {{#if formato}}{{formato}}{{else}}puntos clave{{/if}}.{{#if nivel}} Nivel de detalle: {{nivel}}.{{/if}} Mantén las ideas principales y omite detalles secundarios.',
  traduccion:
    'Traduce el siguiente contenido sobre {{topic}} al {{#if idioma}}{{idioma}}{{else}}español{{/if}}.{{#if nivel}} Adapta la complejidad al nivel {{nivel}}.{{/if}} Preserva el tono y significado original.',
  simplificacion:
    'Simplifica el siguiente texto sobre {{topic}}.{{#if nivel}} Adapta al nivel {{nivel}}.{{/if}} Usa lenguaje claro, oraciones cortas y elimina jerga innecesaria.',
  reformulacion:
    'Reformula el siguiente contenido sobre {{topic}}.{{#if formato}} Formato deseado: {{formato}}.{{/if}} Mantén el mensaje original pero cambia la estructura y vocabulario.',
};
