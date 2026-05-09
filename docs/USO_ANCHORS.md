# Guía de Uso de Anchors

## ¿Qué son los anchors?

Los **anchors** son frases de referencia que representan cada categoría que el pipeline puede clasificar. El modelo `all-MiniLM-L6-v2` convierte cada frase en un vector numérico de 384 dimensiones. En runtime, el input del usuario se compara contra estos vectores para encontrar la categoría más similar.

## Archivos Involucrados

- **`src/data/anchor-definitions.ts`**: Frases en texto plano (español).
- **`src/data/anchor-embeddings.json`**: Vectores numéricos pre-computados.
- **`scripts/generate-anchors.ts`**: Script que convierte definiciones → vectores.

## Cómo Agregar o Modificar Anchors

### 1. Editar definiciones

Abre `src/data/anchor-definitions.ts` y modifica los arrays:

```typescript
export const TYPE_ANCHORS: Record<string, string[]> = {
  informacion: [
    'explicame qué es la fotosíntesis',
    'qué son las leyes de mendel',
    // ... agrega más frases aquí
  ],
  // ...
};
```

**Reglas**:
- Usa español natural y coloquial.
- 8-15 frases por tipo es suficiente.
- Varía la estructura: preguntas, imperativos, frases cortas y largas.

### 2. Regenerar vectores

Después de editar las definiciones, ejecuta:

```bash
npx ts-node --esm scripts/generate-anchors.ts
```

O si `ts-node` con ESM da problemas:

```bash
tsc -p scripts/tsconfig.scripts.json
node dist-scripts/generate-anchors.js
```

Esto sobrescribe `src/data/anchor-embeddings.json` con los nuevos vectores.

### 3. Verificar

Comprueba que el JSON generado tenga la estructura correcta:

```bash
node -e "const j=require('./src/data/anchor-embeddings.json'); console.log('types:',Object.keys(j.types).length, 'intents:',Object.keys(j.intents).length, 'domains:',Object.keys(j.domains).length, 'dim:',j.types.informacion.length)"
```

Debe imprimir: `types: 7 intents: 28 domains: 12 dim: 384` (o valores similares según tus cambios).

### 4. Commit

Incluye tanto `anchor-definitions.ts` como `anchor-embeddings.json` en el commit.

## Buenas Prácticas

- **No modifiques `anchor-embeddings.json` a mano**: Siempre regenera desde el script.
- **Mantén consistencia de idioma**: Todos los anchors deben estar en español (o el idioma principal de tus usuarios).
- **Cobertura semántica**: Asegúrate de cubrir sinónimos y variantes. Ej: "explicame", "cuéntame", "dime sobre".
- **Evita frases ambiguas**: Una frase como "haz esto" podría pertenecer a múltiples tipos.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Script no encuentra el modelo | Verifica que `models/all-MiniLM-L6-v2/` exista y tenga `model_quantized.onnx` |
| Error de WASM | Asegúrate de tener `onnxruntime-node` instalado (`npm ls onnxruntime-node`) |
| Vectores de dimensión incorrecta | Revisa `config.json` del modelo: debe tener `hidden_size: 384` |
