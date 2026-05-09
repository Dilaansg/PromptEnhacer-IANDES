export const TYPE_EXAMPLES = {
  informacion: [
    'explicame sobre', 'que es', 'como funciona', 'dime la definicion de', 'quiero saber mas de', 
    'fundamentos de', 'historia de', 'conceptos basicos de', 'teoria de', 'descripcion de',
    'quien fue', 'donde queda', 'cuando ocurrio'
  ],
  generacion: [
    'crea un', 'escribe una', 'genera un texto', 'redacta', 'inventa una historia', 
    'haz un guion', 'produce un informe', 'compone un poema', 'diseña un plan',
    'dame ideas para', 'propón un nombre', 'elabora'
  ],
  codigo: [
    'escribe una funcion', 'codigo para', 'como programar', 'refactoriza este codigo', 
    'busca el error en', 'optimiza esta funcion', 'explica este snippet', 'traduce de python a js',
    'crea un componente react', 'clase en java para', 'script de bash'
  ],
  analisis: [
    'analiza este texto', 'extrae las ideas principales', 'evalua los pros y contras', 
    'critica constructiva de', 'identifica falacias en', 'revisa la coherencia',
    'compara estos dos articulos', 'analisis de sentimiento'
  ],
  razonamiento: [
    'resuelve este problema', 'ayudame a decidir', 'paso a paso para', 'logica detras de',
    'como llegar a la conclusion', 'razona sobre', 'hipotesis para', 'estrategia para resolver'
  ],
  transformacion: [
    'resume este texto', 'parafrasea', 'cambia el tono a', 'traduce al ingles',
    'acorta este parrafo', 'amplia esta idea', 'reescribe de forma profesional',
    'pasa este texto a bullet points'
  ],
  conversacion: [
    'hola', 'buenos dias', 'como estas', 'gracias', 'adios', 'charlemos un rato',
    'quien eres', 'que puedes hacer', 'cuentame un chiste', 'hablemos de futbol'
  ],
  accion: [
    'busca en google', 'reserva un vuelo', 'añade a mi calendario', 'envia un correo',
    'reproduce musica', 'pon una alarma', 'compra esto'
  ]
};

export const INTENT_EXAMPLES = {
  'informacion.explicacion_tecnica': [
    'explicame tecnicamente como', 'detalles tecnicos de', 'como funciona internamente',
    'arquitectura de', 'mecanismo detras de', 'explicacion profunda de'
  ],
  'informacion.definicion': [
    'que significa', 'definicion de', 'que es exactamente', 'concepto de', 'termino'
  ],
  'informacion.comparacion': [
    'diferencias entre A y B', 'compara X con Y', 'versus', 'ventajas y desventajas de X frente a Y',
    'tabla comparativa de', 'mejor entre A o B'
  ],
  'informacion.resumen': [
    'resume brevemente', 'puntos clave de', 'lo mas importante de', 'en pocas palabras'
  ],
  'codigo.generacion': [
    'crea una funcion', 'haz un script', 'genera codigo para', 'implementa'
  ],
  'codigo.explicacion': [
    'explica este codigo', 'que hace este script', 'paso a paso del codigo'
  ],
  'codigo.refactorizacion': [
    'mejora este codigo', 'refactoriza', 'haz mas limpio este script', 'optimiza'
  ]
};
