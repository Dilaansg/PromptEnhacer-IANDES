import { LayerBOutput, LayerCOutput } from '@shared/types';
import { TemplateEngine } from './template-engine';
import { SmartPromptArchitect } from './smart-architect';
import { scorePromptQuality, scorePromptQualitySemantic } from './quality-scorer';
import { EmbeddingEngine } from '../embedding-engine';

export class LayerC {
  private templateEngine: TemplateEngine;
  private smartArchitect: SmartPromptArchitect;

  constructor() {
    this.templateEngine = new TemplateEngine();
    this.smartArchitect = new SmartPromptArchitect();
  }

  async generate(enrichedContext: LayerBOutput): Promise<LayerCOutput> {
    const { resolvedType, resolvedIntent, enrichedAttributes, entities, originalPrompt } = enrichedContext;

    console.log('[LayerC] Rendering with:', {
      type: resolvedType,
      intent: resolvedIntent,
      topic: entities.topic,
      engine: 'smart-architect (primary)',
    });

    // Clean undefined entities so they don't overwrite valid attributes from user answers
    const cleanEntities = Object.fromEntries(
      Object.entries(entities).filter(([_, v]) => v !== undefined),
    );

    // ── Phase 2.3: SmartPromptArchitect as PRIMARY engine ──────────────────
    const mpcSuperPrompt = await this.smartArchitect.assemblePrompt({
      ...enrichedContext,
      enrichedAttributes: {
        ...enrichedAttributes,
        ...cleanEntities,
        originalPrompt,
      } as Record<string, unknown>,
    });

    const mpcViable = this.smartArchitect.isViable(mpcSuperPrompt, originalPrompt || '', resolvedType);

    // ── Also generate via legacy TemplateEngine for comparison logging ─────
    const legacySuperPrompt = await this.templateEngine.renderTemplate(
      resolvedType,
      resolvedIntent,
      { ...enrichedAttributes, ...cleanEntities, originalPrompt },
    );

    const legacyLength = legacySuperPrompt.length;
    const mpcLength = mpcSuperPrompt.length;

    console.log(
      `[LayerC] MPC: ${mpcLength} chars (viable=${mpcViable}) | Legacy: ${legacyLength} chars`,
    );

    // ── Decision: Use MPC if viable AND it's richer than the legacy output ─
    let superPrompt: string;
    let engineUsed: string;

    if (mpcViable && mpcLength >= legacyLength * 0.5) {
      superPrompt = mpcSuperPrompt;
      engineUsed = 'mpc-smart-architect';
    } else {
      console.log('[LayerC] MPC not viable or shorter than legacy, falling back to TemplateEngine');
      superPrompt = legacySuperPrompt;
      engineUsed = 'template-engine';
    }

    const originalLength = originalPrompt ? originalPrompt.length : 0;
    const estimatedTokenDelta = superPrompt.length - originalLength;

    // Validation 1: Under-enrichment warning
    if (superPrompt.length < originalLength + 50) {
      console.warn(
        '[LayerC] superPrompt under-enriched. Length:',
        superPrompt.length,
        'Original:',
        originalLength,
      );
    }

    // Validation 2: Unresolved variables guard
    if (/\{\{/.test(superPrompt)) {
      console.error('[LayerC] superPrompt contains unresolved variables. Falling back to generic prompt.');
      const fallbackPrompt = this.renderFallback(enrichedContext);
      return {
        superPrompt: fallbackPrompt,
        originalPrompt: originalPrompt || '',
        templateUsed: `${resolvedType}/${resolvedIntent}`,
        estimatedTokenDelta: fallbackPrompt.length - originalLength,
        componentsUsed: ['tarea'],
        metadata: {
          engineVersion: '2.0.0',
          renderedAt: new Date().toISOString(),
          fallback: true,
          engine: 'fallback',
        },
      };
    }

    // Determine components used — MPC always includes several by design
    let componentsUsed = this.extractComponents(superPrompt);

    // MPC guarantees at minimum rol + tarea
    if (componentsUsed.length <= 1) {
      componentsUsed = ['rol', 'tarea', 'formato'];
    }

    // Phase 4.3: Compute quality score for observability
    const quality = scorePromptQuality(superPrompt, originalPrompt || '');
    const embedEngine = EmbeddingEngine.getInstance();
    const semanticQuality = originalPrompt
      ? await scorePromptQualitySemantic(superPrompt, embedEngine)
      : null;

    if (semanticQuality !== null) {
      console.log(
        `[LayerC] Quality: regex=${quality.total.toFixed(2)} (${quality.label}) ` +
        `| semantic=${semanticQuality.toFixed(2)}`,
      );
    }

    // Mejora #10: Verify that the SuperPrompt added value vs the original
    if (embedEngine.isReady() && originalPrompt) {
      try {
        const originalVec = await embedEngine.embed(originalPrompt, 'query');
        const superVec = await embedEngine.embed(superPrompt, 'query');
        const similarity = embedEngine.cosineSimilarity(originalVec, superVec);

        if (similarity > 0.92) {
          console.warn(
            `[LayerC] SuperPrompt demasiado similar al original (sim=${similarity.toFixed(3)}). ` +
            `El pipeline no agregó valor significativo.`,
          );
        } else {
          console.log(
            `[LayerC] SuperPrompt value delta: sim=${similarity.toFixed(3)} (lower = more value added)`,
          );
        }
      } catch {
        // Silently skip value verification if embedding fails
      }
    }

    return {
      superPrompt,
      originalPrompt: originalPrompt || '',
      templateUsed: `${resolvedType}/${resolvedIntent}`,
      estimatedTokenDelta,
      componentsUsed,
      metadata: {
        engineVersion: '2.0.0',
        renderedAt: new Date().toISOString(),
        engine: engineUsed,
        mpcLength,
        legacyLength,
        mpcViable,
        quality,
      },
    };
  }

  private renderFallback(context: LayerBOutput): string {
    const topic = typeof context.entities.topic === 'string' ? context.entities.topic : '';
    const original = context.originalPrompt || '';

    if (topic) {
      return `El usuario solicita información o acción relacionada con "${topic}". A continuación el prompt original: ${original}. Por favor, responde de manera útil y estructurada, solicitando aclaración si el tipo de tarea no está claro.`;
    }

    return `El usuario ha enviado el siguiente prompt: "${original}". Analiza la intención y responde de la mejor manera posible. Si no estás seguro de qué tipo de respuesta espera el usuario, pregunta amablemente para aclarar.`;
  }

  private extractComponents(prompt: string): string[] {
    const components: string[] = [];
    if (/actúa como|eres un|rol/i.test(prompt)) components.push('rol');
    if (/contexto|datos|información|solicitud original/i.test(prompt)) components.push('contexto');
    if (/tarea|objetivo|instrucción|define|explica|escribe|resuelve/i.test(prompt)) components.push('tarea');
    if (/estructura|organiza|formato|tabla|lista|pasos|párrafos/i.test(prompt)) components.push('formato');
    if (/ejemplo|muestra|caso/i.test(prompt)) components.push('ejemplos');
    if (/restricción|regla|nivel|tono|extensión|evita|no incluyas/i.test(prompt)) components.push('restricciones');
    if (/calidad|rigor|directrices/i.test(prompt)) components.push('rigor');

    // Ensure at least some default components if none matched
    if (components.length === 0) {
      components.push('contexto', 'tarea');
    }

    return components;
  }
}
