export const DOMAIN_KEYWORDS = [
  { name: 'historia', keywords: ['guerra', 'revolucion', 'imperio', 'historia', 'roma', 'egipto', 'medieval', 'edad media', 'colonial', 'independencia', 'siglo', 'batalla', 'conquista', 'monarquia', 'republica'] },
  { name: 'biologia', keywords: ['fotosintesis', 'celula', 'genetica', 'especie', 'evolucion', 'anatomia', 'biologia', 'organismo', 'ecosistema', 'virus', 'bacteria', 'adn', 'proteina', 'cuerpo'] },
  { name: 'tecnologia', keywords: ['software', 'codigo', 'inteligencia artificial', 'programacion', 'datos', 'algoritmo', 'computadora', 'internet', 'redes', 'ciberseguridad', 'nube', 'servidor', 'app', 'blockchain', 'ia'] },
  { name: 'fisica', keywords: ['gravedad', 'relatividad', 'cuantica', 'energia', 'movimiento', 'particula', 'fisica', 'termodinamica', 'optica', 'ondas', 'atomo', 'fuerza', 'universo', 'espacio'] },
  { name: 'economia', keywords: ['economia', 'mercado', 'inflacion', 'dinero', 'inversion', 'finanzas', 'banco', 'comercio', 'capital', 'deuda', 'pib', 'bolsa', 'empresa', 'negocio'] },
  { name: 'filosofia', keywords: ['filosofia', 'etica', 'metafisica', 'epistemologia', 'existencialismo', 'moral', 'conocimiento', 'verdad', 'razon', 'pensamiento', 'ser', 'existencia'] },
  { name: 'quimica', keywords: ['quimica', 'molecula', 'reaccion', 'elemento', 'compuesto', 'acido', 'base', 'quimica organica', 'catalisis', 'enlace', 'tabla periodica', 'atomos'] },
  { name: 'matematicas', keywords: ['matematica', 'algebra', 'calculo', 'geometria', 'estadistica', 'probabilidad', 'ecuacion', 'teorema', 'numero', 'funcion', 'trigonometria', 'matriz', 'vector', 'complejos'] },
  { name: 'literatura', keywords: ['literatura', 'novela', 'poesia', 'escritor', 'autor', 'genero literario', 'narrativa', 'drama', 'ensayo', 'poema', 'cuento', 'libro', 'clasico'] },
  { name: 'medicina', keywords: ['medicina', 'salud', 'enfermedad', 'sintoma', 'diagnostico', 'tratamiento', 'farmaco', 'cirugia', 'anatomia', 'medico', 'paciente', 'cura', 'hospital'] },
  { name: 'psicologia', keywords: ['psicologia', 'mente', 'comportamiento', 'terapia', 'psique', 'emocion', 'sentimiento', 'trastorno', 'sindrome', 'ansiedad', 'depresion', 'cognitivo', 'conductual'] },
  { name: 'academico', keywords: ['universidad', 'academico', 'tesis', 'examen', 'paper', 'investigacion', 'tesina', 'monografia', 'trabajo de grado', 'tesis doctoral', 'tesis de maestria', 'seminario', 'congreso', 'publicacion', 'revista cientifica', 'literatura academica', 'contexto academico', 'entorno universitario', 'estudio universitario', 'campo academico'] },
];

export const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'en', 'de', 'del',
  'al', 'y', 'o', 'pero', 'si', 'no', 'me', 'te', 'se', 'lo', 'le', 'les',
  'con', 'sin', 'para', 'por', 'a', 'ante', 'bajo', 'desde', 'hasta', 'entre',
  'durante', 'mediante', 'según', 'so', 'tras', 'versus', 'vía', 'como', 'cómo',
  'qué', 'que', 'cuál', 'cuáles', 'quién', 'quiénes', 'dónde', 'cuando', 'cuándo',
  'por qué', 'porque', 'es', 'son', 'fue', 'fueron', 'será', 'serán', 'un', 'una',
  'explica', 'explicame', 'explícame', 'define', 'describe', 'dime', 'cuéntame', 'cuentame',
  'muestra', 'enseña', 'escribe', 'genera', 'crea', 'analiza', 'compara', 'diferencia',
  'haz', 'hacer', 'quiero', 'necesito', 'podrías', 'podrias', 'puedes', 'favor',
]);
