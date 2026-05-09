import { ExtractedEntities } from '@shared/types';
import { EmbeddingEngine } from '../embedding-engine';

/**
 * Known action‑verb prefixes that typically precede a topic.
 * Removing these leaves the core topic noun phrase.
 */
const ACTION_PREFIXES: readonly RegExp[] = [
  /^(?:expl[ií]came|expl[ií]ca|explicame|explica)\s+/i,
  /^(?:define|definici[oó]n(?:\s+de)?|significado\s+de)\s+/i,
  /^(?:dime|cu[eé]ntame|cuentame|h[aá]blame\s+de|hablame\s+de|h[aá]blame|hablame)\s+/i,
  /^(?:resume|sintetiza|simplifica|condensa)\s+/i,
  /^(?:crea|escribe|genera|redacta|elabora|comp[oó]n|compon|haz|hacer|haga)\s+/i,
  /^(?:analiza|eval[uú]a|evalua|revisa|compara|cr[ií]tica|critica)\s+/i,
  /^(?:traduce|convierte|transforma|adapta|reformula|parafrasea)\s+/i,
  /^(?:resuelve|calcula|razona|deduce|demuestra|predice|decide)\s+/i,
  /^(?:qu[eé]\s+es|que\s+es|c[oó]mo\s+funciona|como\s+funciona|qu[eé]\s+significa|que\s+significa|para\s+qu[eé]\s+sirve|para\s+que\s+sirve|en\s+qu[eé]\s+consiste|en\s+que\s+consiste)\s+/i,
  /^(?:necesito\s+saber\s+(?:sobre\s+)?|quiero\s+saber\s+(?:sobre\s+)?|me\s+gustar[ií]a\s+saber\s+(?:sobre\s+)?|quisiera\s+saber\s+(?:sobre\s+)?)\s+/i,
  /^(?:cu[aá]l\s+es\s+(?:el|la|los|las)?|cual\s+es\s+(?:el|la|los|las)?)\s+/i,
  /^(?:por\s+qu[eé]\s+|por\s+que\s+)\s*/i,
];

/**
 * Common trailing modifiers that aren't part of the topic.
 */
const TRAILING_MODIFIERS = [
  /\s+en\s+\w+$/i,
  /\s+para\s+\w+$/i,
  /\s+de\s+nivel\s+\w+$/i,
  /\s+en\s+formato\s+\w+$/i,
  /\s+usando\s+\w+$/i,
  /\s+con\s+ejemplos?$/i,
];

/**
 * Known programming languages — used for context detection.
 */
const KNOWN_LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'rust', 'go',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'html', 'css', 'sql',
  'bash', 'shell', 'powershell', 'perl', 'dart', 'elixir', 'haskell', 'lua',
];

export class EntityExtractor {
  async extract(text: string, typeId: string): Promise<ExtractedEntities> {
    const lower = text.toLowerCase();

    let inputContent = false;
    let topic: string | undefined;
    let target: string | undefined;
    let context: string | undefined;

    // 1. Detect if the prompt refers to input content
    // Covers transformacion + analysis prompts that reference external text
    if (
      typeId === 'transformacion' ||
      /(?:este|el siguiente|del siguiente|la siguiente)\s+(?:texto|contenido|párrafo|parrafo|artículo|articulo|documento|código|codigo|mensaje|prompt|historia|cuento|ensayo|material)/i.test(lower) ||
      /(?:la intención|la intencion|el sentimiento|el idioma|las ideas|la estructura|el tema)\s*(?:\w+\s+)*(?:de|del)\s+(?:este|el|la|los|las|texto|contenido|prompt|documento|artículo|articulo|párrafo|parrafo)/i.test(lower) ||
      /arriba|abajo|texto:|contenido:|pegar|copiar|lo anterior|lo siguiente/i.test(lower)
    ) {
      inputContent = true;
    }

    // 2. Extract language context
    for (const lang of KNOWN_LANGUAGES) {
      if (lower.includes(lang)) {
        context = lang;
        break;
      }
    }

    // 3. Extract topic — Phase 3.1: robust prefix‑removal approach
    // Mejora #5: Try semantic first, fallback to regex
    const semanticTopic = await this.extractTopicSemantic(text, typeId);
    topic = semanticTopic ?? this.extractTopic(text, typeId);

    // 4. Extract target (after "para")
    const targetRegex = /para\s+([^.,?!(]+)/i;
    const targetMatch = text.match(targetRegex);
    if (targetMatch && targetMatch[1]) {
      const rawTarget = targetMatch[1].trim();
      // Don't capture trailing modifiers in target
      const cleanTarget = rawTarget
        .replace(/\s+en\s+\w+$/i, '')
        .replace(/\s+de\s+nivel\s+\w+$/i, '')
        .trim();
      if (cleanTarget.length > 1) {
        target = cleanTarget;
      }
    }

    return {
      inputContent,
      topic,
      target,
      context,
    };
  }

  /**
   * Phase 3.1: Robust topic extraction.
   *
   * Strategy:
   *  1. Strip known action‑verb prefixes from the beginning.
   *  2. Remove common filler phrases.
   *  3. Strip trailing modifiers.
   *  4. Clean up residual punctuation and whitespace.
   *  5. If what remains is short (<= 6 words), use it as the topic.
   *  6. Fallback: for longer residues, try the original regex approach
   *     as a secondary heuristic.
   */
  private extractTopic(text: string, _typeId: string): string | undefined {
    let residue = text.trim();

    // Step 1: Remove action prefixes iteratively until no more match
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of ACTION_PREFIXES) {
        const prev = residue;
        residue = residue.replace(prefix, '');
        if (residue !== prev) {
          changed = true;
        }
      }
    }

    // Step 2: Remove leading articles from the residue
    residue = residue.replace(/^(?:el|la|los|las|un|una|unos|unas)\s+/i, '');

    // Step 3: Remove trailing modifiers
    for (const modifier of TRAILING_MODIFIERS) {
      residue = residue.replace(modifier, '');
    }

    // Step 4: Clean up punctuation and whitespace
    residue = residue
      .replace(/^[¿¡?]+|[?!.]+$/g, '')
      .replace(/["""]/g, '')
      .trim();

    // Step 5: Validate — topic must be a reasonable length
    if (residue.length >= 2 && residue.length <= 200) {
      // For short residues (<= 8 words), accept directly
      if (residue.split(/\s+/).length <= 8) {
        return residue;
      }

      // For longer residues, try to extract just the key noun phrase
      // by removing trailing subordinate clauses
      const shortened = residue
        .replace(/\s+(?:que|donde|cuando|mientras|porque|ya que|puesto que|debido a).*$/i, '')
        .trim();

      if (shortened.length >= 2) {
        return shortened;
      }
    }

    // Step 6: Fallback — original regex approach for structured prompts
    return this.regexFallback(text);
  }

  /**
   * Legacy regex‑based extraction as a fallback for structured prompts
   * that the prefix‑removal approach might miss.
   */
  private regexFallback(text: string): string | undefined {
    const cleanText = text
      .replace(/de nivel (basico|básico|intermedio|avanzado)/gi, '')
      .replace(/en formato (json|markdown|tabla|lista)/gi, '')
      .replace(/en (python|javascript|typescript|java|sql)/gi, '');

    const topicTriggers = [
      /expl[ií]came\s+(?:qu[eé] es (?:la |el |los |las )?|c[oó]mo funciona\s+|sobre\s+)?(.+?)(?:\s+en|\s+para|\.|\?|!|$)/i,
      /resume\s+(?:el\s+|la\s+|los\s+|las\s+)?(.+?)(?:\s+en|\s+para|\.|\?|!|$)/i,
      /escribe\s+(?:un|una|sobre)\s+(.+?)(?:\s+en|\s+para|\.|\?|!|$)/i,
      /(?:dime|cu[eé]ntame)\s+(?:sobre\s+|qu[eé] es\s+|c[oó]mo funciona\s+)?(?:el |la |los |las )?(.+?)(?:\.|\?|!|$)/i,
      /(?:sobre|acerca de)\s+(.+?)(?:\s+en|\s+para|\.|\?|!|$)/i,
      /c[oó]mo funciona\s+(?:el |la |los |las )?(.+?)(?:\.|\?|!|$)/i,
      /qu[eé]\s+(?:es|significa)\s+(?:el |la |los |las )?(.+?)(?:\.|\?|!|$)/i,
    ];

    for (const regex of topicTriggers) {
      const match = cleanText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Short prompt fallback (e.g., just a topic name)
    if (cleanText.length > 0 && cleanText.split(' ').length <= 6) {
      return cleanText.replace(/^[¿¡?]+|[?!.]+$/g, '').trim();
    }

    return undefined;
  }

  /**
   * Mejora #5: Semantic topic extraction using embeddings.
   * Splits the text into candidate segments and finds the one most
   * similar to the full prompt embedding. Falls back to regex if
   * the engine is not ready or embeddings fail.
   */
  private async extractTopicSemantic(
    text: string,
    _typeId: string,
  ): Promise<string | undefined> {
    const engine = EmbeddingEngine.getInstance();
    if (!engine.isReady()) return undefined;

    try {
      const fullEmbedding = await engine.embed(text, 'query');
      const segments = this.getTopicCandidates(text);

      if (segments.length === 0) return undefined;

      let bestSegment = '';
      let bestScore = -1;

      for (const seg of segments) {
        const segEmbedding = await engine.embed(seg, 'passage');
        const score = engine.cosineSimilarity(fullEmbedding, segEmbedding);
        if (score > bestScore) {
          bestScore = score;
          bestSegment = seg;
        }
      }

      if (bestScore > 0.55 && bestSegment.length >= 2 && bestSegment.length <= 200) {
        console.log(`[EntityExtractor] Semantic topic: "${bestSegment}" (score: ${bestScore.toFixed(3)})`);
        return bestSegment;
      }
    } catch {
      // Fallback to regex
    }

    return undefined;
  }

  private getTopicCandidates(text: string): string[] {
    let residue = text;

    for (const prefix of ACTION_PREFIXES) {
      residue = residue.replace(prefix, '');
    }
    residue = residue.replace(/^(?:el|la|los|las|un|una)\s+/i, '').trim();

    if (residue.length < 2) return [];

    const sentences = residue.split(/[.,;:!?]+/).filter((s) => s.trim().length >= 2);
    const words = residue.split(/\s+/);

    const candidates = [
      residue,
      ...sentences.map((s) => s.trim()),
      words.slice(0, 4).join(' '),
      words.slice(-6).join(' '),
    ].filter((c) => c.length >= 2 && c.length <= 200);

    return [...new Set(candidates)];
  }
}
