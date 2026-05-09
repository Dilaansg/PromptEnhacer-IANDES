import { Normalizer } from '../normalizer';
import { TypeScorer } from '../scorer';
import { EntityExtractor } from '../entity-extractor';
import { AttributeDetector } from '../attribute-detector';
import { LayerA } from '../index';
import { PROMPT_TYPE_REGISTRY } from '@/data/prompt-types';

// Mock chrome for EmbeddingEngine initialization in Node environment
(global as any).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
  },
};

describe('Layer A — Semantic Classification Pipeline', () => {
  describe('Normalizer', () => {
    const normalizer = new Normalizer();

    it('should lowercase, trim and collapse spaces', () => {
      const result = normalizer.normalize('  Explícame   RECURSIVIDAD  ');
      expect(result).toBe('explícame recursividad');
    });

    it('should remove punctuation but preserve accents', () => {
      const result = normalizer.normalize('¡Explícame, por favor, qué es la recursividad!');
      expect(result).toBe('explícame por favor qué es la recursividad');
    });

    it('should strip emojis', () => {
      const result = normalizer.normalize('Escribe un poema 🌙✨ por favor');
      expect(result).toBe('escribe un poema por favor');
    });

    it('should return empty string for empty input', () => {
      expect(normalizer.normalize('')).toBe('');
      expect(normalizer.normalize('   ')).toBe('');
    });

    it('should tokenize correctly', () => {
      expect(normalizer.tokenize('uno dos tres')).toEqual(['uno', 'dos', 'tres']);
      expect(normalizer.tokenize('')).toEqual([]);
    });
  });

  describe('TypeScorer', () => {
    const scorer = new TypeScorer();

    it('should classify "explícame recursividad" as informacion', () => {
      const result = scorer.scoreTypes('explícame recursividad', PROMPT_TYPE_REGISTRY);
      expect(result.topType).not.toBeNull();
      expect(result.topType!.id).toBe('informacion');
      expect(result.scores['informacion']).toBeGreaterThan(0);
    });

    it('should classify "escribe un poema" as generacion', () => {
      const result = scorer.scoreTypes('escribe un poema', PROMPT_TYPE_REGISTRY);
      expect(result.topType).not.toBeNull();
      expect(result.topType!.id).toBe('generacion');
    });

    it('should handle multiple competing types', () => {
      const result = scorer.scoreTypes(
        'explícame y escribe un ejemplo',
        PROMPT_TYPE_REGISTRY,
      );
      // Both informacion and generacion may score > 0
      expect(Object.values(result.scores).some((s) => s > 0)).toBe(true);
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should produce ambiguity score between 0 and 1', () => {
      const result = scorer.scoreTypes('código en python', PROMPT_TYPE_REGISTRY);
      expect(result.ambiguityScore).toBeGreaterThanOrEqual(0);
      expect(result.ambiguityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('EntityExtractor', () => {
    const extractor = new EntityExtractor();

    it('should extract topic from "explícame recursividad en Python"', async () => {
      const entities = await extractor.extract('explícame recursividad en Python', 'informacion');
      expect(entities.topic).toBeDefined();
      expect(entities.topic!.toLowerCase()).toContain('recursividad');
    });

    it('should detect context/language keywords', async () => {
      const entities = await extractor.extract('función en javascript', 'codigo');
      expect(entities.context).toBe('javascript');
    });

    it('should extract target after "para"', async () => {
      const entities = await extractor.extract('escribe un email para el cliente', 'generacion');
      expect(entities.target).toBeDefined();
      expect(entities.target!.toLowerCase()).toContain('cliente');
    });

    it('should detect inputContent flag', async () => {
      const entities = await extractor.extract('resume el siguiente texto', 'transformacion');
      expect(entities.inputContent).toBe(true);
    });
  });

  describe('AttributeDetector', () => {
    const detector = new AttributeDetector();

    it('should detect "avanzado" nivel', async () => {
      const attrs = await detector.detectAttributes('explicación avanzada de redes neuronales');
      expect(attrs.nivel).toBe('avanzado');
    });

    it('should detect "basico" nivel', async () => {
      const attrs = await detector.detectAttributes('explicación básica para principiantes');
      expect(attrs.nivel).toBe('basico');
    });

    it('should detect formato json', async () => {
      const attrs = await detector.detectAttributes('devuélveme esto en json');
      expect(attrs.formato).toBe('json');
    });

    it('should return undefined when no keywords match', async () => {
      const attrs = await detector.detectAttributes('hola mundo');
      expect(attrs.nivel).toBeUndefined();
      expect(attrs.formato).toBeUndefined();
      expect(attrs.longitud).toBeUndefined();
      expect(attrs.tono).toBeUndefined();
    });
  });

  describe('LayerA — Full Pipeline', () => {
    const layerA = new LayerA();

    it('should process a complete prompt end-to-end', async () => {
      const output = await layerA.process('Explícame recursividad en Python de nivel avanzado');

      expect(output.input).toBe('Explícame recursividad en Python de nivel avanzado');
      expect(output.normalized).toContain('explícame');
      expect(output.normalized).toContain('recursividad');

      // Classification
      expect(output.classification.typeId).toBe('informacion');
      expect(output.classification.confidence).toBeGreaterThan(0);

      // Entities
      expect(output.entities.topic).toBeDefined();
      expect(output.entities.topic!.toLowerCase()).toContain('recursividad');
      expect(output.entities.context).toBe('python');
      expect(output.entities.inputContent).toBe(false);

      // Attributes
      expect(output.attributes.nivel).toBe('avanzado');
      expect(output.attributes.formato).not.toBe('desconocido');
      expect(output.attributes.longitud).not.toBe('desconocido');
      expect(output.attributes.tono).not.toBe('desconocido');

      // Mode
      expect(output.mode).toBe('single');

      // Timestamp
      expect(output.timestamp).toBeGreaterThan(0);
    });

    it('should handle empty input gracefully', async () => {
      const output = await layerA.process('');
      expect(output.normalized).toBe('');
      expect(output.classification.typeId).toBe('desconocido');
    });

    it('should handle ambiguous prompts in multi mode', async () => {
      // A prompt that might trigger both generacion and informacion
      const output = await layerA.process('Escribe y explícame un artículo');
      // We just verify the pipeline doesn't throw and produces valid output
      expect(output.classification.allScores).toBeDefined();
      expect(Object.keys(output.classification.allScores).length).toBeGreaterThan(0);
    });
  });
});
