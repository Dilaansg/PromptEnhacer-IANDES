import { EmbeddingEngine } from '../embedding-engine';
import ANCHORS from '@/data/anchor-embeddings.json';

export interface DomainResult {
  domain: string;
  confidence: number;
}

/** Keyword fallback map — activated when engine not ready or confidence < threshold */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  matematicas: [
    'álgebra', 'algebra', 'cálculo', 'calculo', 'geometría', 'geometria',
    'estadística', 'estadistica', 'ecuación', 'ecuacion', 'matriz', 'vector',
    'derivada', 'integral', 'probabilidad', 'trigonometría', 'trigonometria',
    'función', 'funcion', 'polinomio', 'número', 'numero', 'fracción',
    'regresion', 'regresión', 'lineal', 'logaritmo', 'exponencial',
  ],
  tecnologia: [
    'programación', 'programacion', 'software', 'código', 'codigo', 'algoritmo',
    'función', 'funcion', 'variable', 'clase', 'objeto', 'api', 'framework',
    'base de datos', 'servidor', 'cloud', 'devops', 'frontend', 'backend',
    'javascript', 'python', 'typescript', 'java', 'rust', 'docker', 'kubernetes',
    'machine learning', 'inteligencia artificial', 'ia', 'ai', 'red neuronal',
  ],
  historia: [
    'guerra', 'revolución', 'revolucion', 'imperio', 'civilización', 'civilizacion',
    'conquista', 'colonia', 'independencia', 'medieval', 'antiguo', 'moderno',
    'siglo', 'época', 'epoc', 'historia', 'histórico', 'historico',
    'batalla', 'rey', 'reina', 'monarquía', 'monarquia', 'república', 'republica',
  ],
  biologia: [
    'célula', 'celula', 'adn', 'gen', 'genética', 'genetica', 'evolución',
    'evolucion', 'organismo', 'bacteria', 'virus', 'proteína', 'proteina',
    'metabolismo', 'fotosíntesis', 'fotosintesis', 'ecosistema', 'especie',
    'reproducción', 'reproduccion', 'tejido', 'órgano', 'organo',
  ],
  fisica: [
    'gravedad', 'fuerza', 'energía', 'energia', 'masa', 'velocidad',
    'aceleración', 'aceleracion', 'relatividad', 'cuántica', 'cuantica',
    'termodinámica', 'termodinamica', 'electromagnetismo', 'óptica', 'optica',
    'mecánica', 'mecanica', 'ondas', 'partícula', 'particula', 'átomo', 'atomo',
  ],
  quimica: [
    'elemento', 'molécula', 'molecula', 'reacción', 'reaccion', 'compuesto',
    'ácido', 'acido', 'base', 'óxido', 'oxido', 'enlace', 'valencia',
    'tabla periódica', 'tabla periodica', 'isótopo', 'isotopo', 'catálisis',
    'catalizador', 'oxidación', 'oxidacion', 'reducción', 'reduccion',
  ],
  economía: [
    'economía', 'economia', 'mercado', 'precio', 'inflación', 'inflacion',
    'pib', 'gdp', 'oferta', 'demanda', 'inversión', 'inversion', 'finanzas',
    'banco', 'deuda', 'déficit', 'deficit', 'comercio', 'empresa',
    'microeconomía', 'macroeconomía', 'tributación',
  ],
  psicologia: [
    'psicología', 'psicologia', 'mente', 'cognitivo', 'conductual',
    'emoción', 'emocion', 'ansiedad', 'depresión', 'depresion', 'terapia',
    'neurociencia', 'cerebro', 'comportamiento', 'inconsciente', 'freud',
    'síndrome', 'sindrome', 'trastorno', 'impostor',
  ],
  filosofia:
    ['filosofía', 'filosofia', 'ética', 'etica', 'epistemología', 'epistemologia',
    'metafísica', 'metafisica', 'ontología', 'ontologia', 'moral', 'virtud',
    'existencia', 'consciencia', 'libre albedrío', 'libre albedrio', 'lógica',
    'logica', 'pensamiento', 'sócrates', 'socrates', 'platón', 'platon', 'teoría', 'teoria',
    'experimento mental', 'paradoja',
    ],
  literatura: [
    'literatura', 'novela', 'poesía', 'poesia', 'poema', 'narración',
    'narracion', 'autor', 'escritor', 'obra', 'personaje', 'trama',
    'narrativa', 'cuento', 'relato', 'lírica', 'lirica', 'épica', 'epica',
    'género literario', 'genero literario', 'historia corta', 'cuento corto',
  ],
  medicina: [
    'medicina', 'médico', 'medico', 'enfermedad', 'diagnóstico', 'diagnostico',
    'tratamiento', 'síntoma', 'sintoma', 'fármaco', 'farmaco', 'cirugía',
    'cirugia', 'paciente', 'clínica', 'clinica', 'hospital', 'salud',
    'anatomía', 'anatomia', 'patología', 'patologia',
  ],
  academico: [
    'universidad', 'académico', 'academico', 'tesis', 'investigación',
    'investigacion', 'ensayo', 'asignatura', 'materia', 'profesor', 'estudiante',
    'semestre', 'trabajo', 'citación', 'citacion', 'bibliografía', 'bibliografia',
  ],
  derecho: [
    'ley', 'legal', 'jurídico', 'juridico', 'contrato', 'demanda', 'tribunal',
    'juez', 'abogado', 'constitución', 'constitucion', 'derecho', 'código penal',
    'código civil', 'legislación', 'legislacion', 'normativa', 'sentencia',
    'herencia', 'notarial', 'jurisprudencia', 'penal', 'delito',
  ],
  negocios: [
    'negocio', 'empresa', 'startup', 'emprendimiento', 'marketing', 'estrategia',
    'estrategia de negocio', 'roi', 'business', 'plan de negocios', 'inversor',
    'management', 'pricing', 'saas', 'ecommerce', 'b2b', 'b2c', 'growth',
    'churn', 'pitch', 'foda', 'okr', 'kpi', 'revenue',
  ],
  arte: [
    'arte', 'pintura', 'escultura', 'artista', 'obra de arte', 'museo',
    'impresionismo', 'renacimiento', 'cubismo', 'surrealismo', 'picasso',
    'van gogh', 'frida', 'cuadro', 'galería', 'galeria', 'exposición',
    'exposicion', 'estética', 'estetica', 'barroco', 'muralismo', 'bauhaus',
  ],
  politica: [
    'política', 'politica', 'gobierno', 'elección', 'eleccion', 'voto',
    'democracia', 'congreso', 'parlamento', 'presidente', 'partido político',
    'partido politico', 'diputado', 'senador', 'constitución', 'constitucion',
    'federalismo', 'soberanía', 'soberania', 'geopolítica', 'geopolitica',
    'populismo', 'estado', 'naciones unidas',
  ],
  medio_ambiente: [
    'medio ambiente', 'cambio climático', 'cambio climatico', 'ecología',
    'ecologia', 'reciclaje', 'sostenibilidad', 'huella de carbono',
    'energía renovable', 'energia renovable', 'contaminación', 'contaminacion',
    'deforestación', 'deforestacion', 'biodiversidad', 'ecosistema',
    'calentamiento global', 'capa de ozono', 'protocolo de kioto',
    'energía solar', 'energia solar', 'residuos', 'microplásticos',
    'microplasticos', 'especie en peligro', 'agricultura sostenible',
  ],
};

// Pre-convert domain anchor arrays to Float32Array once at module load
const DOMAIN_ANCHORS_F32: Record<string, Float32Array> = (() => {
  const raw = ((ANCHORS as any).domains ?? {}) as Record<string, number[]>;
  const out: Record<string, Float32Array> = {};
  for (const [id, vec] of Object.entries(raw)) {
    out[id] = new Float32Array(vec);
  }
  return out;
})();

export class DomainClassifier {
  private readonly DOMAIN_CONFIDENCE_THRESHOLD = 0.45;

  async classify(text: string): Promise<DomainResult> {
    if (!text || text.length < 3) {
      return { domain: 'desconocido', confidence: 0 };
    }

    const engine = EmbeddingEngine.getInstance();

    // Primary: semantic classification via embeddings
    if (engine.isReady()) {
      try {
        const result = await engine.classify(text, DOMAIN_ANCHORS_F32);

        if (result.confidence >= this.DOMAIN_CONFIDENCE_THRESHOLD) {
          console.log(
            `[DomainClassifier] Classified as "${result.id}" with confidence ${result.confidence.toFixed(2)}`,
          );
          return { domain: result.id, confidence: result.confidence };
        }

        console.log(
          `[DomainClassifier] Low confidence (${result.confidence.toFixed(2)}) for domain "${result.id}". Trying keyword fallback.`,
        );
      } catch (error) {
        console.error('[DomainClassifier] Semantic classification error:', error);
      }
    }

    // Fallback: keyword matching
    return this._keywordFallback(text);
  }

  /** Keyword-based fallback — always available, no engine required. */
  private _keywordFallback(text: string): DomainResult {
    let bestDomain = 'desconocido';
    let bestCount = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      const count = keywords.reduce((acc, kw) => {
        // Use word boundaries to avoid false positives (e.g., 'ia' in 'guerra')
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return acc + (regex.test(text) ? 1 : 0);
      }, 0);
      if (count > bestCount) {
        bestCount = count;
        bestDomain = domain;
      }
    }

    if (bestCount > 0) {
      // Normalize to a pseudo-confidence: each keyword match adds 0.15, capped at 0.75
      const pseudoConfidence = Math.min(0.75, bestCount * 0.15);
      console.log(
        `[DomainClassifier] Keyword fallback → "${bestDomain}" (${bestCount} matches, pseudo-conf ${pseudoConfidence.toFixed(2)})`,
      );
      return { domain: bestDomain, confidence: pseudoConfidence };
    }

    return { domain: 'desconocido', confidence: 0 };
  }
}
