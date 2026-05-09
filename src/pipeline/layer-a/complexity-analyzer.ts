import { EmbeddingEngine } from '../embedding-engine';

const COMPLETENESS_ANCHORS: Record<string, string[]> = {
  completo: [
    'Explicame la fotosíntesis con ejemplos concretos y fuentes académicas para mi tesis de biología',
    'Escribe una función en Python que ordene una lista de diccionarios por clave usando quicksort',
    'Necesito un análisis de las causas de la revolución francesa con referencias a fuentes primarias',
    'Compara React y Angular en términos de rendimiento, curva de aprendizaje y ecosistema para una decisión de arquitectura',
    'Ayúdame a debuggear este error de TypeScript en mi API de Express, te paso el stack trace completo',
    'Explica el concepto de herencia en POO con ejemplos en Java y diagramas de clases',
    'Necesito una guía paso a paso para configurar un servidor Nginx con SSL y balanceo de carga',
    'Analiza el impacto económico de la pandemia en las pymes latinoamericanas con datos del Banco Mundial',
  ],
  vago: [
    'ayúdame con algo',
    'no sé',
    'hola',
    'tengo una duda',
    'necesito información',
    'explícame',
    'cómo funciona',
    'qué es eso',
    'dime algo',
    'una pregunta',
    'necesito ayuda',
    'puedes ayudarme',
  ],
};

export interface ComplexityResult {
  completeness: number;
  vagueness: number;
  recommendedQuestions: number;
}

let cachedCompletenessCentroid: Float32Array | null = null;
let cachedVaguenessCentroid: Float32Array | null = null;

export async function analyzeComplexity(
  text: string,
  engine: EmbeddingEngine,
): Promise<ComplexityResult> {
  if (!engine.isReady()) {
    return { completeness: 0.5, vagueness: 0.5, recommendedQuestions: 2 };
  }

  try {
    if (!cachedCompletenessCentroid) {
      cachedCompletenessCentroid = await engine.getCentroid(COMPLETENESS_ANCHORS.completo, 'passage');
    }
    if (!cachedVaguenessCentroid) {
      cachedVaguenessCentroid = await engine.getCentroid(COMPLETENESS_ANCHORS.vago, 'passage');
    }

    if (!cachedCompletenessCentroid || !cachedVaguenessCentroid) {
      return { completeness: 0.5, vagueness: 0.5, recommendedQuestions: 2 };
    }

    const inputVec = await engine.embed(text, 'query');
    const completeness = engine.cosineSimilarity(inputVec, cachedCompletenessCentroid);
    const vagueness = engine.cosineSimilarity(inputVec, cachedVaguenessCentroid);

    let recommendedQuestions: number;
    if (completeness > 0.88) {
      recommendedQuestions = 1;
    } else if (vagueness > 0.70) {
      recommendedQuestions = 4;
    } else if (completeness > 0.55) {
      recommendedQuestions = 2;
    } else {
      recommendedQuestions = 3;
    }

    return { completeness, vagueness, recommendedQuestions };
  } catch {
    return { completeness: 0.5, vagueness: 0.5, recommendedQuestions: 2 };
  }
}
