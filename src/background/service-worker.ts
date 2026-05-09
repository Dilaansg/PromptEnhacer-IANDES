// Shim for URL.createObjectURL which is not available in Service Workers
if (typeof URL.createObjectURL === 'undefined') {
  // @ts-ignore
  URL.createObjectURL = () => '';
}

import { LayerA } from '@pipeline/layer-a';
import { LayerB } from '@pipeline/layer-b';
import { LayerC } from '@pipeline/layer-c';
import { EmbeddingEngine } from '@pipeline/embedding-engine';
import { QuestionDefinition } from '@shared/types';
import { getLogs, clearLogs } from '@shared/log-collector';

interface PipelineInstance {
  layerA: LayerA;
  layerB: LayerB;
  layerC: LayerC;
}

let pipeline: PipelineInstance | undefined;
let panelReady = false;
let pendingResult: unknown = null;
let isProcessing = false;
let debugMode = true; // Default: icon buttons visible

// Expose toggle globally so user can type toggleIAndesDebug() in SW console
(self as any).toggleIAndesDebug = () => {
  debugMode = !debugMode;
  const status = debugMode ? 'ON ✅' : 'OFF ❌';
  console.log(`[IAndes SW] Debug mode: ${status}`);
  // Broadcast to panel
  chrome.runtime.sendMessage({ type: 'DEBUG_MODE', payload: { enabled: debugMode } }).catch(() => {});
  return status;
};

(self as any).getDebugMode = () => debugMode;

interface PasteState {
  metadata: { pastedText: string; pastedLength: number; totalLength: number };
  timestamp: number;
}
let lastPaste: PasteState | null = null;

function getPipeline(): PipelineInstance {
  if (!pipeline) {
    pipeline = {
      layerA: new LayerA(),
      layerB: new LayerB(),
      layerC: new LayerC(),
    };
    console.log('[IAndes SW] Pipeline lazy-initialized');
  }
  return pipeline;
}

function broadcastResult(result: unknown): void {
  // Send to any listening panel
  chrome.runtime.sendMessage({ type: 'DISPLAY_RESULT', payload: result }).catch(() => {});
  // Also try to send to active tab content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'PIPELINE_RESULT', payload: result }).catch(() => {});
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  pipeline = {
    layerA: new LayerA(),
    layerB: new LayerB(),
    layerC: new LayerC(),
  };
  EmbeddingEngine.getInstance().initialize().catch(err => {
    console.error('[IAndes SW] Failed to pre-initialize EmbeddingEngine:', err);
  });
  console.log(`[IAndes SW] Installed or updated. Reason: ${details.reason}. Pipeline initialized`);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PASTE_DETECTED') {
    lastPaste = {
      metadata: msg.payload as PasteState['metadata'],
      timestamp: Date.now(),
    };
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'PROCESS_PROMPT') {
    isProcessing = true;
    sendResponse({ ok: true }); // Acknowledge receipt immediately

    if (panelReady) {
      chrome.runtime.sendMessage({ type: 'SHOW_LOADING' }).catch(() => {});
    }

    // Use paste metadata if it's from the last 30 seconds
    const usePaste = lastPaste && (Date.now() - lastPaste.timestamp < 30000);
    const pasteMetadata = usePaste ? lastPaste!.metadata : undefined;

    handleProcessPrompt(msg.payload.text as string, pasteMetadata)
      .then(result => {
        isProcessing = false;
        if (result && panelReady) {
          broadcastResult(result);
        } else if (result) {
          pendingResult = result;
          console.log('[IAndes SW] Panel not ready, result queued');
        }
      })
      .catch(err => {
        isProcessing = false;
        console.error('[IAndes SW] Error:', err);
        if (panelReady) {
          chrome.runtime.sendMessage({ 
            type: 'DISPLAY_ERROR', 
            payload: { message: (err as Error).message } 
          }).catch(() => {});
        }
      });
    return true; // async handling
  }

  if (msg.type === 'PANEL_READY') {
    panelReady = true;
    if (pendingResult) {
      broadcastResult(pendingResult);
      pendingResult = null;
    } else if (isProcessing) {
      // If we're still processing but the panel just opened, show loading
      chrome.runtime.sendMessage({ type: 'SHOW_LOADING' }).catch(() => {});
    }
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'PANEL_CLOSED') {
    panelReady = false;
    pendingResult = null;
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'OPEN_PANEL') {
    panelReady = false; // Reset: new panel instance will send PANEL_READY
    pendingResult = null;
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'GET_QUESTIONS') {
    handleGetQuestions(msg.payload.text as string)
      .then((questions: QuestionDefinition[]) => sendResponse({ questions }))
      .catch(err => sendResponse({ error: (err as Error).message }));
    return true; // async response
  }

  if (msg.type === 'INJECT_PROMPT') {
    const text = msg.payload?.text as string | undefined;
    if (text) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { type: 'INJECT_PROMPT', payload: { text } }).catch(() => {
            console.warn('[IAndes SW] Failed to inject prompt: content script not ready');
          });
        }
      });
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: 'No text provided' });
    }
    return false;
  }

  if (msg.type === 'GET_LOGS') {
    sendResponse({ logs: getLogs() });
    return false;
  }

  if (msg.type === 'CLEAR_LOGS') {
    clearLogs();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'OPEN_TUTO') {
    chrome.tabs.create({ url: chrome.runtime.getURL('tuto.html') });
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'GET_DEBUG_MODE') {
    sendResponse({ enabled: debugMode });
    return false;
  }

  return false;
});

async function handleProcessPrompt(text: string, pasteMetadata?: PasteState['metadata']): Promise<unknown | null> {
  const p = getPipeline();

  const engine = EmbeddingEngine.getInstance();
  if (!engine.isReady()) {
    await engine.initialize();
  }

  const layerAOutput = await p.layerA.process(text, pasteMetadata);
  const questions = p.layerB.selectQuestions(layerAOutput);

  if (questions.length > 0) {
    console.log(`[IAndes SW] ${questions.length} questions triggered for Layer B`);

    const answers = await p.layerB.promptUser(questions, text);
    const layerBOutput = p.layerB.buildOutput(layerAOutput, answers, questions);

    return p.layerC.generate(layerBOutput);
  }

  const layerBOutput = p.layerB.buildOutput(layerAOutput, {}, []);

  return p.layerC.generate(layerBOutput);
}

async function handleGetQuestions(text: string): Promise<QuestionDefinition[]> {
  const p = getPipeline();

  // Ensure EmbeddingEngine is ready
  const engine = EmbeddingEngine.getInstance();
  if (!engine.isReady()) {
    await engine.initialize();
  }

  const layerAOutput = await p.layerA.process(text);
  return p.layerB.selectQuestions(layerAOutput);
}
