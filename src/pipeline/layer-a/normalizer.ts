/**
 * Normalizer — cleans and tokenizes raw user input for Layer A scoring.
 *
 * Rules:
 * - Preserve technical tokens (C++, C#, .NET, Node.js, e-mail, full-stack, etc.)
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove punctuation (keep accents & diacritics, and preserved tokens)
 * - Strip emojis and zero-width joiners
 */

/** Tokens that must survive normalization, stored as [original, placeholder] pairs. */
const TECHNICAL_TOKENS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bc\+\+/gi, '__CPP__'],
  [/\bc#/gi, '__CSHARP__'],
  [/\.net\b/gi, '__DOTNET__'],
  [/\bnode\.js\b/gi, '__NODEJS__'],
  [/\bvue\.js\b/gi, '__VUEJS__'],
  [/\breact\.js\b/gi, '__REACTJS__'],
  [/\bnext\.js\b/gi, '__NEXTJS__'],
  [/\bnuxt\.js\b/gi, '__NUXTJS__'],
  [/\bexpress\.js\b/gi, '__EXPRESSJS__'],
  [/\bthree\.js\b/gi, '__THREEJS__'],
  [/\be-mail\b/gi, '__EMAIL__'],
  [/\bfull-stack\b/gi, '__FULLSTACK__'],
  [/\bback-end\b/gi, '__BACKEND__'],
  [/\bfront-end\b/gi, '__FRONTEND__'],
  [/\bci-cd\b/gi, '__CICD__'],
  [/\bia\b/gi, '__IA__'],
  [/\bai\b/gi, '__AI__'],
];

/** Reverse map: placeholder → lowercased canonical token. */
const TOKEN_RESTORE: ReadonlyMap<string, string> = new Map(
  TECHNICAL_TOKENS.map(([pattern, placeholder]) => {
    // derive the canonical lowercase form from the pattern source
    const canonical = pattern.source
      .replace(/\\b/g, '')
      .replace(/\\\./g, '.')
      .replace(/\\\+/g, '+')
      .replace(/\//g, '')
      .replace(/i$/, '') // strip trailing flags
      .toLowerCase();
    return [placeholder, canonical] as [string, string];
  }),
);

export class Normalizer {
  normalize(text: string): string {
    if (!text) return '';

    // Step 1: protect technical tokens
    let result = text;
    for (const [pattern, placeholder] of TECHNICAL_TOKENS) {
      result = result.replace(pattern, placeholder);
    }

    result = result
      .toLowerCase()
      .trim()
      // collapse whitespace
      .replace(/\s+/g, ' ')
      // remove emojis and related symbols (broad range)
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{E0100}-\u{E01EF}]/gu,
        '',
      )
      // remove zero-width characters
      .replace(/[\u200B-\u200F\uFEFF]/g, '')
      // remove punctuation but keep letters, numbers, spaces, accented chars,
      // and our placeholder underscores
      .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
      // collapse again after punctuation removal
      .replace(/\s+/g, ' ')
      .trim();

    // Step 2: restore technical tokens
    for (const [placeholder, canonical] of TOKEN_RESTORE) {
      result = result.replace(placeholder.toLowerCase(), canonical);
    }

    return result;
  }

  tokenize(text: string): string[] {
    if (!text) return [];
    return text.split(/\s+/).filter((t) => t.length > 0);
  }
}
