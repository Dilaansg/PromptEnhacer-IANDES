/**
 * SmartPromptArchitect — Modular Prompt Composition (MPC) engine.
 *
 * Phase 2.3 of the Mitigation Plan.
 *
 * Assembles a SuperPrompt from composable modules instead of selecting a
 * monolithic template. This produces richer, more context-aware prompts that
 * leverage the full intelligence of Layers A and B.
 *
 * Assembly pipeline:
 *   1. PERSONA        — "Actúa como..." from domain registry
 *   2. INSTRUCTION    — Task description from type+intent registry
 *   3. RIGOR          — Domain-specific quality rules
 *   4. CONSTRAINTS    — Level, tone, length from user answers
 *   5. FORMAT         — Output structure guide
 *   6. EXTRA CONTEXT  — propósito, materia, nivel_curso (academic flows)
 *   7. ORIGINAL PROMPT — The user's original text as reference
 */

import { getPersona } from './modules/personas';
import { getInstruction, interpolateInstruction } from './modules/instructions';
import { getFormatInstruction } from './modules/formats';
import { EmbeddingEngine } from '../embedding-engine';
import ANCHORS from '@/data/anchor-embeddings.json';
import type { LayerBOutput } from '@shared/types';

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

// ────────────────────────────────────────────────────────────────────────────
// Level constraint mapping
// ────────────────────────────────────────────────────────────────────────────

const LEVEL_CONSTRAINTS: Record<string, string> = {
  basico:
    'Mantén un nivel introductorio. Evita tecnicismos innecesarios. Explica los conceptos como si fuera la primera vez que el usuario los encuentra.',
  intermedio:
    'Mantén un nivel intermedio. Asume conocimiento básico del tema pero explica los conceptos avanzados cuando aparezcan.',
  avanzado:
    'Mantén un nivel avanzado. Usa terminología técnica sin explicaciones introductorias. Profundiza en los detalles y matices del tema.',
};

const TONE_CONSTRAINTS: Record<string, string> = {
  formal: 'Usa un tono formal, objetivo y profesional.',
  informal: 'Usa un tono cercano e informal, como si hablaras con un colega.',
  neutral: 'Mantén un tono neutral y equilibrado.',
  creativo: 'Usa un tono creativo e inspirador, con lenguaje vívido y estimulante.',
  tecnico: 'Usa un tono técnico y preciso, enfocado en exactitud y claridad.',
  objetivo: 'Mantén un tono objetivo e imparcial. Presenta hechos y datos sin sesgo.',
  conversacional: 'Usa un tono conversacional, como en un diálogo natural.',
  practico: 'Usa un tono práctico y orientado a la acción. Ve directo al grano.',
};

const LENGTH_CONSTRAINTS: Record<string, string> = {
  corto: 'Sé conciso. Prioriza la información esencial y evita divagaciones.',
  medio: 'Proporciona una respuesta de extensión moderada, equilibrando profundidad con brevedad.',
  largo: 'Desarrolla una respuesta extensa y detallada. Cubre el tema en profundidad.',
  extenso: 'Produce una respuesta muy extensa y exhaustiva. Cubre todos los aspectos relevantes del tema.',
};

// ────────────────────────────────────────────────────────────────────────────
// SmartPromptArchitect
// ────────────────────────────────────────────────────────────────────────────

export class SmartPromptArchitect {
  /**
   * Assemble a complete SuperPrompt from the enriched Layer B context.
   *
   * @returns The assembled prompt string, or null if the result is too short
   *          (caller should fall back to TemplateEngine in that case).
   */
  async assemblePrompt(ctx: LayerBOutput): Promise<string> {
    const attrs = ctx.enrichedAttributes;
    const domain = String(attrs.contexto || attrs.context || '');
    const topic =
      typeof ctx.entities.topic === 'string'
        ? ctx.entities.topic
        : String(attrs.topic || '');

    const parts: string[] = [];

    // ── 1. PERSONA + INSTRUCTION (adaptada al nivel del usuario) ─────────────
    const persona = getPersona(domain, ctx.resolvedType);
    const rawInstruction = await this.selectBestInstruction(
      ctx.resolvedType,
      ctx.resolvedIntent,
      ctx.originalPrompt,
    );
    let instruction = interpolateInstruction(rawInstruction, {
      ...attrs,
      topic,
      ...ctx.entities,
    });

    // Adaptar instrucción al nivel explícito del usuario.
    const nivel = String(attrs.nivel || '').toLowerCase();
    if (nivel === 'basico') {
      instruction = this._adaptForBasicLevel(instruction);
    } else if (nivel === 'avanzado') {
      instruction = this._adaptForAdvancedLevel(instruction);
    }

    // Adaptar instrucción al dominio: "rigor técnico", "mecanismos subyacentes"
    // no tienen sentido para historia, literatura, filosofía, etc.
    instruction = this._adaptForDomain(instruction, domain);

    parts.push(`Actúa como ${persona}. ${instruction}`);

    // ── 2. ACADEMIC RIGOR — SUPRIMIDO ────────────────────────────────────────
    // Las reglas de rigor académico (persona + tono + fuentes + dominio)
    // producían prompts excesivamente largos y pedantes para consultas simples.
    // El modelo de IA ya sabe mantener rigor sin instrucciones redundantes.
    // Si el usuario requiere nivel académico, el TemplateEngine (fallback)
    // tiene templates especializados con estas reglas integradas.

    // ── 3. CONSTRAINTS — solo si fueron explícitamente provistos ──────────────
    // No inyectar defaults inferidos. Si el usuario no pidió nivel, no lo impongas.
    const tono = String(attrs.tono || '').toLowerCase();
    const longitud = String(attrs.longitud || '').toLowerCase();

    // Solo incluir constraints que el usuario EXPLÍCITAMENTE pidió
    // (los atributos inferidos por Capa A no deben generar líneas extra)
    const constraints: string[] = [];
    if (nivel && LEVEL_CONSTRAINTS[nivel]) {
      constraints.push(LEVEL_CONSTRAINTS[nivel]);
    }
    if (tono && TONE_CONSTRAINTS[tono]) {
      constraints.push(TONE_CONSTRAINTS[tono]);
    }
    if (longitud && LENGTH_CONSTRAINTS[longitud]) {
      constraints.push(LENGTH_CONSTRAINTS[longitud]);
    }
    if (constraints.length > 0) {
      parts.push(constraints.join(' '));
    }

    // ── 4. AUDIENCE — solo si no es genérica ──────────────────────────────────
    if (attrs.audiencia) {
      const audiencia = String(attrs.audiencia);
      if (audiencia && audiencia !== 'personal' && audiencia !== 'para mí') {
        parts.push(`Adapta el lenguaje para: ${audiencia}.`);
      }
    }

    // ── 5. FORMAT — solo si el usuario lo pidió explícitamente ────────────────
    const formato = String(attrs.formato || '').toLowerCase();
    if (formato && formato !== 'parrafos') {
      const formatInstruction = getFormatInstruction(formato);
      if (formatInstruction && formatInstruction !== getFormatInstruction('parrafos')) {
        parts.push(formatInstruction);
      }
    }

    // ── 6. EXTRA CONTEXT — una sola línea concisa ─────────────────────────────
    const extras: string[] = [];
    if (attrs.proposito) extras.push(`Propósito: ${attrs.proposito}`);
    if (attrs.materia) extras.push(`Área: ${attrs.materia}`);
    if (attrs.nivel_curso) extras.push(`Nivel: ${attrs.nivel_curso}`);
    if (attrs.tipo_texto) extras.push(`Formato esperado: ${attrs.tipo_texto}`);
    if (extras.length > 0) {
      parts.push(extras.join('. ') + '.');
    }

    // ── 7. ORIGINAL PROMPT — ELIMINADO ────────────────────────────────────────
    // El modelo de IA ya recibe el prompt original en el contexto de la
    // conversación. Repetirlo aquí solo duplica tokens sin aportar valor.
    // Eliminado por redundancia y sostenibilidad.

    return parts.join('\n\n');
  }

  /**
   * Select the best instruction semantically (Mejora #8).
   * Compares the original prompt embedding against all template anchors
   * for the given type. If a different intent has significantly higher
   * similarity, overrides the classified intent.
   */
  private async selectBestInstruction(
    typeId: string,
    intentId: string,
    originalPrompt: string,
  ): Promise<string> {
    const engine = EmbeddingEngine.getInstance();
    const typeAnchors = TEMPLATE_ANCHORS_F32[typeId];

    if (!engine.isReady() || !typeAnchors || !originalPrompt) {
      return getInstruction(typeId, intentId);
    }

    try {
      const promptVec = await engine.embed(originalPrompt, 'query');
      let bestIntentId = intentId;
      let bestScore = -1;

      for (const [anchorIntentId, anchorVec] of Object.entries(typeAnchors)) {
        const score = engine.cosineSimilarity(promptVec, anchorVec);
        if (score > bestScore) {
          bestScore = score;
          bestIntentId = anchorIntentId;
        }
      }

      const classifiedScore = typeAnchors[intentId]
        ? engine.cosineSimilarity(promptVec, typeAnchors[intentId])
        : 0;

      if (bestScore > classifiedScore + 0.10) {
        console.log(
          `[SmartArchitect] Semantic override: classified="${intentId}" (${classifiedScore.toFixed(2)}) ` +
          `→ semantic="${bestIntentId}" (${bestScore.toFixed(2)})`,
        );
        return getInstruction(typeId, bestIntentId);
      }
    } catch {
      // Fall through to classified intent
    }

    return getInstruction(typeId, intentId);
  }

  /**
   * Quick quality heuristic: returns true if the assembled prompt has
   * enough substance to be worth using over the legacy template engine.
   *
   * Phase 4.3: This is complemented by the quality-scorer.ts module.
   *
   * Bugfix: Also rejects prompts where the original text contains strong
   * lexical signals for a DIFFERENT type than what was classified.
   * Example: "Explicame la dictadura española" (strong informacion signals)
   * classified as conversacion/roleplay → rejected, fallback to TemplateEngine.
   */
  isViable(superPrompt: string, originalPrompt: string, classifiedType?: string): boolean {
    // Must be at least 1.2x the original prompt length (was 1.5x — lowered
    // because the original prompt line was removed for sustainability)
    if (superPrompt.length < originalPrompt.length * 1.2) return false;

    // Must contain a persona
    const hasPersona = /actúa como/i.test(superPrompt);
    if (!hasPersona) return false;

    // Must not have unresolved variables
    if (/\{\{/.test(superPrompt)) return false;

    // ── Type mismatch guard ───────────────────────────────────────────────
    // If the original prompt contains STRONG signals for a type that differs
    // from the classified type, reject MPC (let TemplateEngine handle it).
    if (classifiedType && this._detectTypeMismatch(originalPrompt, classifiedType)) {
      return false;
    }

    return true;
  }

  /**
   * Detects when the original prompt's lexical signals contradict the
   * classified type. Returns true if a mismatch is found.
   *
   * Each type registers STRONG_EXCLUSIVE signals — words that almost
   * exclusively indicate that type. If the original prompt matches a
   * different type's strong signals, it's a mismatch.
   */
  private _detectTypeMismatch(text: string, classifiedType: string): boolean {
    const lower = text.toLowerCase();

    // Strong-exclusive signals that override classification
    const STRONG_SIGNALS: Record<string, RegExp[]> = {
      informacion: [
        /explicame|expl[ií]came|expl[ií]ca\b|explica\b/i,
        /definici[oó]n|define\b|significa\b/i,
        /qu[eé]\s+es\b|que\s+es\b/i,
        /c[oó]mo\s+funciona|como\s+funciona/i,
        /dime\s+(?:sobre|qu[eé]|que)|cu[eé]ntame\s+(?:sobre|qu[eé]|que)/i,
      ],
      generacion: [
        // Match content-generation verbs followed by content-type nouns.
        // "haz/hacer/haga" are the most common Spanish imperatives for "make/write".
        /escribe\s+(?:un\s+(?:poema|art[ií]culo|ensayo|cuento|blog|post|correo|email|discurso|informe|libro|cap[ií]tulo)|una\s+(?:historia|carta|novela|canci[oó]n|reseña|biograf[ií]a|narrativa|cr[oó]nica))/i,
        /haz\s+(?:un\s+(?:poema|art[ií]culo|ensayo|cuento|blog|post|correo|email|discurso|informe|libro|cap[ií]tulo|resumen|análisis|plan|diseño|proyecto)|una\s+(?:historia|carta|novela|canci[oó]n|reseña|biograf[ií]a|narrativa|cr[oó]nica|gu[ií]a|lista|tabla|presentaci[oó]n))/i,
        /hacer\s+(?:un\s+(?:poema|art[ií]culo|ensayo|cuento|blog|post|correo|email|discurso|informe|libro|resumen|análisis)|una\s+(?:historia|carta|novela|canci[oó]n|reseña|gu[ií]a|presentaci[oó]n))/i,
        /crea\s+(?:un\s+(?:poema|art[ií]culo|ensayo|cuento|blog|post|logotipo|diseño|video|podcast)|una\s+(?:historia|carta|canci[oó]n|marca|campaña|estrategia\s+de\s+marketing))/i,
        /genera\s+(?:un\s+(?:texto|informe|reporte)|una\s+(?:idea|lista|propuesta))/i,
        /redacta\s+(?:un|una)\s/i,
        /elabora\s+(?:un|una)\s/i,
        /desarrolla\s+(?:un\s+(?:ensayo|art[ií]culo|tema|proyecto\s+de\s+investigaci[oó]n|informe|plan\s+de\s+negocio)|una\s+(?:tesis|monograf[ií]a|propuesta|estrategia|investigaci[oó]n))/i,
      ],
      codigo: [
        /escribe\s+(?:c[oó]digo|una\s+funci[oó]n|un\s+script|un\s+programa)/i,
        /\bdebug\b|\brefactorizar\b|\bfunci[oó]n\s+que\b/i,
      ],
      analisis: [
        /\banaliza\b|\beval[uú]a\b/i,
        /\bpros\s+y\s+contras\b|\bventajas\s+y\s+desventajas\b/i,
      ],
      transformacion: [
        /\bresume\b|\btraduce\b|\bsimplifica\b|\bconvierte\b/i,
        /\breformula\b|\bparafrasea\b|\bcondensa\b/i,
      ],
      accion: [
        /\btutorial\b|\bgu[ií]a\b|\bchecklist\b/i,
        /\bplan\s+de\s+acci[oó]n\b|\bpaso\s+a\s+paso\b/i,
      ],
      conversacion: [
        /\bconversa\b|\bdebate\b|\broleplay\b|\bsimula\b/i,
        /\bact[uú]a\s+como\b|\bjuega\s+el\s+papel\b/i,
      ],
      razonamiento: [
        /\bresuelve\b|\bcalcula\b|\brazona\b|\bdeduce\b|\bdemuestra\b/i,
        /\bcausa\s+ra[ií]z\b|\bpredict/i,
      ],
    };

    // Check each type's strong signals against the classified type
    for (const [typeId, signals] of Object.entries(STRONG_SIGNALS)) {
      if (typeId === classifiedType) continue; // same type, no mismatch

      for (const signal of signals) {
        if (signal.test(lower)) {
          // Found strong signal for a DIFFERENT type → mismatch!
          console.log(
            `[SmartArchitect] Type mismatch detected: classified as "${classifiedType}" ` +
            `but prompt has strong "${typeId}" signals. Rejecting MPC.`,
          );
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Adapt instruction wording to fit the domain.
   * Technical jargon ("mecanismos subyacentes", "terminología precisa")
   * makes no sense for humanities like history, literature, or philosophy.
   */
  private _adaptForDomain(instruction: string, domain: string): string {
    const HUMANITIES_DOMAINS = new Set([
      'historia', 'literatura', 'filosofia', 'derecho', 'arte', 'politica',
    ]);

    if (!HUMANITIES_DOMAINS.has(domain)) return instruction;

    return instruction
      .replace(/con rigor técnico,?\s*/gi, 'con rigor histórico y contextual, ')
      .replace(/cubriendo mecanismos subyacentes,?\s*/gi, 'cubriendo causas, consecuencias y contexto, ')
      .replace(/principios fundamentales y aplicaciones prácticas/gi, 'eventos clave, actores principales y su legado')
      .replace(/Usa terminología precisa\.?\s*/gi, 'Apóyate en fuentes primarias y datos verificables. ')
      .replace(/mecanismos subyacentes/gi, 'causas y factores determinantes')
      .replace(/aplicaciones prácticas/gi, 'implicaciones y consecuencias concretas')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Adapt a technical instruction for basic-level users.
   * Replaces phrases like "rigor técnico", "terminología precisa",
   * "mecanismos subyacentes" with beginner-friendly alternatives
   * so the instruction doesn't contradict the level constraint.
   */
  private _adaptForBasicLevel(instruction: string): string {
    return instruction
      .replace(/con rigor técnico,?\s*/gi, 'de forma sencilla y accesible, ')
      .replace(/cubriendo mecanismos subyacentes,?\s*/gi, '')
      .replace(/principios fundamentales y aplicaciones prácticas/gi, 'conceptos básicos y ejemplos cotidianos')
      .replace(/Usa terminología precisa\.?\s*/gi, 'Evita tecnicismos. Usa lenguaje claro y ejemplos sencillos. ')
      .replace(/con rigor metodológico/gi, 'de forma clara y didáctica')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Intensify an instruction for advanced-level users.
   * Adds depth cues like "análisis profundo", "considera edge cases",
   * "evalúa trade-offs" so the instruction matches the expert constraint.
   */
  private _adaptForAdvancedLevel(instruction: string): string {
    // Only intensify if the instruction doesn't already have advanced cues
    if (/avanzado|profund|exhaustivo|experto/i.test(instruction)) {
      return instruction;
    }
    return instruction
      .replace(/\.\s*$/, '. Profundiza en los detalles técnicos, considera casos límite y evalúa trade-offs.')
      .trim();
  }
}
