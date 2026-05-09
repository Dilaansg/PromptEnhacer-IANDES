import { TEMPLATE_REGISTRY } from './templates';
import { EmbeddingEngine } from '../embedding-engine';
import ANCHORS from '@/data/anchor-embeddings.json';

const TEMPLATE_ANCHORS_F32: Record<string, Record<string, Float32Array>> = (() => {
  const raw = (ANCHORS as any).templates ?? {};
  const out: Record<string, Record<string, Float32Array>> = {};
  for (const [typeId, intents] of Object.entries(raw)) {
    out[typeId] = {};
    for (const [intentId, vec] of Object.entries(intents as Record<string, number[]>)) {
      out[typeId][intentId] = new Float32Array(vec);
    }
  }
  return out;
})();

export class TemplateEngine {
  private templates: Record<string, Record<string, string>>;

  constructor() {
    this.templates = { ...TEMPLATE_REGISTRY };
  }

  async renderTemplate(
    typeId: string,
    intentId: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const enriched = await this.enrichContext(context);

    // Look up template in registry
    const typeTemplates = this.templates[typeId];
    if (!typeTemplates) {
      return this.renderFallback(enriched);
    }

    let template: string | null = typeTemplates[intentId] ?? null;
    if (!template) {
      template = await this.selectBestTemplate(typeId, intentId, String(enriched.originalPrompt ?? ''));
    }

    if (!template) {
      return this.renderFallback(enriched);
    }

    return this.render(template, enriched);
  }

  private async selectBestTemplate(
    typeId: string,
    _intentId: string,
    originalPrompt: string,
  ): Promise<string | null> {
    const typeTemplates = this.templates[typeId];
    if (!typeTemplates) return null;

    const engine = EmbeddingEngine.getInstance();
    const typeAnchors = TEMPLATE_ANCHORS_F32[typeId];

    if (engine.isReady() && originalPrompt && typeAnchors) {
      try {
        const promptVec = await engine.embed(originalPrompt, 'query');
        let bestTemplate: string | null = null;
        let bestScore = -1;

        for (const [intentId, template] of Object.entries(typeTemplates)) {
          const templateVec = typeAnchors[intentId];
          if (!templateVec) continue;

          const score = engine.cosineSimilarity(promptVec, templateVec);
          if (score > bestScore) {
            bestScore = score;
            bestTemplate = template;
          }
        }
        return bestTemplate;
      } catch {
        // Fall through to first template
      }
    }

    return Object.values(typeTemplates)[0] ?? null;
  }

  private async enrichContext(
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const enriched = { ...context };

    // Naturalize topic (add articles if missing)
    if (typeof enriched.topic === 'string') {
      enriched.topic = this.naturalizeTopic(enriched.topic);
    }

    // ── Tarea 4.4: Fix context vs contexto ambiguity ──────────────────────────
    // `contexto` (Spanish) is the canonical key. If only `context` (English) is
    // set and `contexto` is missing, copy it. Then use `contexto` everywhere.
    if (!enriched.contexto && enriched.context) {
      enriched.contexto = enriched.context;
    }
    // Always expose `context` too for backward-compat with old templates
    if (!enriched.context && enriched.contexto) {
      enriched.context = enriched.contexto;
    }

    // Domain string — derived from the canonical `contexto` field
    const domainStr = String(enriched.contexto || '').toLowerCase();

    // Phase 4.2: Only set domain flags when domainConfidence exceeds threshold.
    // This prevents low-confidence domain guesses from injecting incorrect
    // domain-specific instructions.
    const domainConf =
      typeof enriched.domainConfidence === 'number'
        ? (enriched.domainConfidence as number)
        : 0.5; // default: moderate confidence if not provided

    // Preserve domainConfidence for downstream use
    enriched.domainConfidence = domainConf;

    // Boolean domain flags — used by all templates.
    // Only computed from domainStr when domainStr is non-empty AND confidence > 0.5.
    // If domainStr is empty, preserve any flags the caller already set
    // (e.g. tests or Service Worker passing isTech=true directly).
    if (domainStr && domainConf > 0.5) {
      enriched.isTech = domainStr === 'tecnologia' || domainStr === 'programacion';
      enriched.isHistory = domainStr === 'historia';
      enriched.isMath = domainStr === 'matematicas';
      enriched.isScience =
        domainStr === 'biologia' ||
        domainStr === 'fisica' ||
        domainStr === 'quimica';
      enriched.isPsychology = domainStr === 'psicologia';
      enriched.isMedicine = domainStr === 'medicina';
      enriched.isEconomics = domainStr === 'economia';
      enriched.isLiterature = domainStr === 'literatura';
      enriched.isPhilosophy = domainStr === 'filosofia';
      enriched.isAcademic = domainStr === 'academico';
    }

    return enriched;
  }

  private naturalizeTopic(topic: string): string {
    const t = topic.trim();
    const lower = t.toLowerCase();
    
    // If already has an article, return as is
    if (/^(?:el|la|los|las|un|una|unos|unas)\s+/i.test(lower)) {
      return t;
    }

    // Common concepts that usually need "la"
    if (/^(?:teor[ií]a|historia|guerra|revoluci[oó]n|importancia|evoluci[oó]n|biolog[ií]a|psicolog[ií]a|filosof[ií]a|econom[ií]a|literatura|qu[ií]mica|f[ií]sica|matem[aá]tica|ley|norma|constituci[oó]n|empresa|industria|sociedad|cultura)\b/i.test(lower)) {
      return `la ${t}`;
    }

    // Common concepts that usually need "el"
    if (/^(?:impacto|legado|concepto|significado|origen|desarrollo|proceso|sistema|mercado|capital|valor|precio|derecho|tribunal|procedimiento|algoritmo|snipet|c[oó]digo|lenguaje|marco|framework|m[eé]todo|uso|sentido|objetivo|prop[oó]sito)\b/i.test(lower)) {
      return `el ${t}`;
    }

    // Multi-word history/academic topics
    if (/(?:segunda guerra mundial|primera guerra mundial|guerra fr[ií]a|revoluci[oó]n francesa|revoluci[oó]n industrial)/i.test(lower)) {
      return `la ${t}`;
    }

    return t;
  }

  private render(template: string, context: Record<string, unknown>): string {
    let result = template;

    // Iterate until no more #if tags are found to handle nesting correctly
    // We process the innermost tags first
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (result.includes('{{#if') && iterations < MAX_ITERATIONS) {
      iterations++;
      
      // Pattern to match an innermost #if block (one that doesn't contain another #if)
      const innerIfPattern = /{{#if ([^{]*?)}}((?:(?!{{#if)[\s\S])*?)(?:{{else}}((?:(?!{{#if)[\s\S])*?))?{{\/if}}/g;
      
      const newResult = result.replace(innerIfPattern, (_match, condition, truthyPart, falsyPart) => {
        let isTrue = false;
        
        // Handle complex conditions (eq key "val") or (or a b)
        if (condition.startsWith('(')) {
          const complexMatch = condition.match(/^\((eq|or) ([^)]+)\)$/);
          if (complexMatch) {
            const [, op, args] = complexMatch;
            if (op === 'eq') {
              const [key, val] = args.split(/\s+/).map((s: string) => s.replace(/['"]/g, ''));
              isTrue = String(context[key] || '') === val;
            } else if (op === 'or') {
              const keys = args.split(/\s+/);
              isTrue = keys.some((k: string) => !!context[k]);
            }
          }
        } else {
          // Simple condition {{#if key}}
          const value = context[condition.trim()];
          isTrue = value !== undefined && value !== null && value !== '' && value !== false;
        }

        return isTrue ? truthyPart : (falsyPart || '');
      });

      if (newResult === result) break;
      result = newResult;
    }

    // 3. Handle variables: {{key}}
    const variablePattern = /{{(\w+)}}/g;
    result = result.replace(variablePattern, (_match, key) => {
      const value = context[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
      return '';
    });

    return result;
  }

  private renderFallback(context: Record<string, unknown>): string {
    const original =
      typeof context.originalPrompt === 'string' ? context.originalPrompt : '';
    const topic =
      typeof context.topic === 'string' ? context.topic : '';

    if (topic) {
      return `El usuario solicita información o acción relacionada con "${topic}". A continuación el prompt original: ${original}. Por favor, responde de manera útil y estructurada, solicitando aclaración si el tipo de tarea no está claro.`;
    }

    return `El usuario ha enviado el siguiente prompt: "${original}". Analiza la intención y responde de la mejor manera posible. Si no estás seguro de qué tipo de respuesta espera el usuario, pregunta amablemente para aclarar.`;
  }
}
