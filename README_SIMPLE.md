# README for Dummies — IAndes v6

> No sabes de código? No pasa nada. Esta guía es para ti.

## ¿Qué hace IAndes?

Escribes en ChatGPT algo como *"explícame la inteligencia artificial"* y IAndes lo convierte en algo como:

> *"Actúa como un experto en tecnología. Define inteligencia artificial de forma clara... Incluye ejemplos..."*

El resultado es un prompt más largo, más específico y que obtiene **mejores respuestas** del chat.

## ¿Cómo lo instalo?

### Paso 1 — Descargar

Pídele al desarrollador la carpeta `dist/` o clona el proyecto y ejecuta:

```bash
npm install
npm run build
```

### Paso 2 — Instalar en Chrome

1. Abre Chrome y ve a `chrome://extensions`
2. Activa el switch **"Modo de desarrollador"** (arriba a la derecha)
3. Click en **"Cargar descomprimida"**
4. Selecciona la carpeta `dist/`

Listo. Verás el icono de IAndes en la barra de extensiones.

## ¿Cómo lo uso?

1. Abre **ChatGPT**, **Claude** o **Gemini**
2. Escribe un prompt cualquiera (ej: *"explícame qué es un agujero negro"*)
3. Aparecerá un botón flotante con el logo de IA — haz click
4. IAndes analizará tu prompt. Si necesita más información, te hará 1 o 2 preguntas en el panel lateral
5. Cuando termine, verás el **SuperPrompt generado** en el panel
6. Click en **"Usar este prompt"** para inyectarlo en el chat
7. Envía el mensaje — recibirás una respuesta mucho mejor

## El panel lateral

- **Prompt Original**: tu texto sin modificar
- **SuperPrompt**: la versión mejorada que generó IAndes
- **Usar este prompt**: reemplaza tu texto original por el SuperPrompt
- **Descartar**: vuelve al estado inicial

## Botones de debug (solo si están activados)

- 📋 — Copia los datos internos del análisis (para developers)
- 🔍 — Abre la página de logs del pipeline (diagnóstico)

> El desarrollador puede activar/desactivar estos botones escribiendo `toggleIAndesDebug()` en la consola del Service Worker.

## ¿Por qué me hace preguntas a veces?

IAndes detecta automáticamente:

- **Nivel** de profundidad que necesitas (básico, intermedio, avanzado)
- **Formato** de respuesta (párrafos, lista, tabla, código, paso a paso)
- **Tono** (formal, informal, creativo, técnico)
- **Audiencia** (para niños, estudiantes, profesionales)

Si no puede detectarlo solo, te pregunta. Responde y obtendrás un mejor resultado.

## ¿Qué prompts funcionan mejor?

| Tipo de prompt | Ejemplo |
|----------------|---------|
| Definición | *"qué es la teoría de la relatividad"* |
| Explicación | *"cómo funciona un motor eléctrico"* |
| Código | *"escribe una función que ordene una lista en Python"* |
| Ensayo | *"haz un ensayo sobre el cambio climático"* |
| Análisis | *"analiza los pros y contras de las criptomonedas"* |
| Resumen | *"resume este texto sobre historia"* |
| Tutorial | *"guía paso a paso para configurar Docker"* |

## ¿Tarda mucho?

El primer análisis tarda 2-3 segundos (carga el modelo). Los siguientes son casi instantáneos. Todo se ejecuta en tu computadora, no se envía nada a internet.

## Problemas comunes

| Problema | Solución |
|----------|----------|
| El botón IA no aparece | Refresca la página (F5). A veces tarda unos segundos en detectar el input |
| El panel no abre | Haz click en el icono de IAndes en la barra de extensiones |
| "Usar este prompt" no funciona | Recarga la extensión en `chrome://extensions` |
| Error raro | Abre `chrome://extensions`, click en "service worker" y mira la consola |

---

> **TL;DR**: Escribes, click en el botón IA, respondes 1-2 preguntas, obtienes un mejor prompt. Fin.
