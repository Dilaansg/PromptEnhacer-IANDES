# Side Panel — IAndes v6

> Cómo funciona y cómo modificar el panel lateral de la extensión.

## Arquitectura

```
src/panel/
├── index.html              → Entry point (template HTML)
├── index.ts                → IAndesPanel (controller principal)
├── styles/main.css         → Estilos
├── components/
│   ├── comparison-view.ts  → Muestra original vs SuperPrompt
│   ├── questions-view.ts   → Muestra preguntas de Capa B
│   └── action-buttons.ts   → Botones de acción (Usar/Descartar)
```

## Flujo de mensajes

```
Service Worker                    Side Panel
    │                                 │
    ├── SHOW_LOADING ────────────────→│ muestra spinner
    │                                 │
    ├── SHOW_QUESTIONS ──────────────→│ muestra preguntas Capa B
    │   {questions, originalPrompt,   │
    │    sessionId}                   │
    │                                 │
    │←─ QUESTIONS_ANSWERED ──────────┤ usuario responde
    │   {answers, originalPrompt,     │
    │    sessionId}                   │
    │                                 │
    ├── DISPLAY_RESULT ──────────────→│ muestra SuperPrompt
    │   {superPrompt, ...}            │
    │                                 │
    ├── DEBUG_MODE ──────────────────→│ toggle iconos debug
    │   {enabled: boolean}            │
    │                                 │
    │←─ GET_DEBUG_MODE ──────────────┤ consulta estado al cargar
    │   → {enabled: boolean}          │
    │                                 │
    │←─ INJECT_PROMPT ───────────────┤ usuario clickea "Usar"
    │   → SW reenvía al content       │
```

## Cómo añadir contenido al panel

### 1. Añadir un nuevo componente

Crear archivo en `src/panel/components/`:

```typescript
// src/panel/components/my-component.ts
export class MyComponent {
  render(data: unknown): HTMLElement {
    const el = document.createElement('div');
    el.className = 'my-component';
    el.textContent = String(data);
    return el;
  }
}
```

### 2. Usarlo en el panel

```typescript
// src/panel/index.ts
import { MyComponent } from './components/my-component';

// En displayResult():
const myComp = new MyComponent();
this.app.appendChild(myComp.render(algúnDato));
```

### 3. Añadir estilos

```css
/* src/panel/styles/main.css */
.my-component {
  padding: 12px;
  border-radius: 8px;
}
```

## Cómo añadir un nuevo tipo de mensaje

### En el panel (receptor)

```typescript
// src/panel/index.ts — setupMessageListener()
case 'MY_NEW_MESSAGE':
  this.handleNewMessage(msg.payload);
  sendResponse({ ok: true });
  break;
```

### En el Service Worker (emisor)

```typescript
// src/background/service-worker.ts
chrome.runtime.sendMessage({
  type: 'MY_NEW_MESSAGE',
  payload: { data: 'hello' }
}).catch(() => {});
```

## Manejo de sesiones (anti-crosstalk)

El sistema usa `sessionId` + `originalPrompt` para evitar que respuestas de un prompt se mezclen con otro:

```typescript
// layer-b/index.ts
const sessionId = generateSessionId();

// Al recibir QUESTIONS_ANSWERED:
const sessionMatch = !payload?.sessionId || payload.sessionId === sessionId;
const promptMatch = payload?.originalPrompt === originalPrompt;
if (sessionMatch && promptMatch) {
  // respuesta válida
}
```

## Debug mode

Los iconos 📋🔍 del panel se controlan con:

```js
// Consola del Service Worker
toggleIAndesDebug()   // ON/OFF
getDebugMode()        // true/false
```

El panel recibe `DEBUG_MODE` y actualiza `display: none/flex` en `.toolbar-icons`.

## Build

El panel se compila con Vite como entry point HTML:

```typescript
// vite.config.ts
input: {
  panel: resolve(__dirname, 'src/panel/index.html'),
}
```

El plugin `copyManifest` mueve el HTML compilado a `dist/panel.html` y limpia `dist/src/`.
