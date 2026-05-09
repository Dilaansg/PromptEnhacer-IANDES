import { detectCurrentSite } from './site-adapters';
import { FloatingButton } from './floating-button';

class IAndesContentScript {
  private adapter = detectCurrentSite();
  private button: FloatingButton | null = null;
  private inputListenerAttached = false;

  async init(): Promise<void> {
    if (!this.adapter) {
      console.log('[IAndes] Site not supported');
      return;
    }

    console.log('[IAndes] Adapter detected:', this.adapter.siteId);

    // Try to render immediately (input may already exist)
    this.tryRenderButton();

    // Watch for dynamic DOM changes (React apps like ChatGPT mount input late)
    this.observeDomChanges();

    // Also wait up to 10s for isReady() as a safety net
    this.waitForReady().then(() => {
      if (!this.button) {
        this.tryRenderButton();
      }
    });

    // Listen for messages from SW / panel
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'PIPELINE_RESULT') {
        this.handlePipelineResult(msg.payload);
        sendResponse({ ok: true });
      }
      if (msg.type === 'INJECT_PROMPT') {
        this.injectPrompt(msg.payload.text);
        sendResponse({ ok: true });
      }
      if (msg.type === 'SHOW_BUTTON') {
        this.tryRenderButton();
        sendResponse({ ok: true });
      }
    });
  }

  /** Render the button if input exists. If already hidden, show it again. */
  private tryRenderButton(): void {
    if (!this.adapter) return;

    // If button exists but is hidden, just show it again
    if (this.button) {
      if (this.button.isHidden()) {
        this.button.show();
        console.log('[IAndes] Floating button reshown');
      }
      return;
    }

    const input = this.adapter.getInputElement();
    if (!input) {
      console.log('[IAndes] Input not found yet, will retry on DOM change');
      return;
    }

    if (!this.inputListenerAttached) {
      input.addEventListener('paste', this.handlePaste.bind(this));
      this.inputListenerAttached = true;
    }

    this.button = new FloatingButton(this.adapter);
    this.button.render();
    console.log('[IAndes] Floating button rendered for', this.adapter.siteId);
  }

  /** Watch DOM mutations to detect when the chat input appears. */
  private observeDomChanges(): void {
    if (!this.adapter) return;

    const observer = new MutationObserver(() => {
      const inputExists = !!this.adapter!.getInputElement();
      if (inputExists) {
        if (!this.button) {
          this.tryRenderButton();
        } else if (this.button.isHidden()) {
          this.button.show();
        }
        // Don't disconnect — user may navigate between chats
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private async waitForReady(): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        console.warn('[IAndes] Timeout waiting for site readiness, proceeding anyway');
        resolve();
      }, 10000);

      const check = () => {
        if (this.adapter?.isReady()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  private handlePipelineResult(result: unknown): void {
    console.log('[IAndes] Pipeline result received:', result);
  }

  private handlePaste(e: ClipboardEvent): void {
    const pastedText = e.clipboardData?.getData('text/plain');
    if (!pastedText || pastedText.length < 50) return; // Only care about substantial pastes

    if (!this.adapter) return;
    const input = this.adapter.getInputElement();
    if (!input) return;

    // setTimeout to allow the paste to resolve in the DOM if needed, 
    // but we can get current length right now and add pasted length
    const currentText = input.textContent || input.innerText || (input as HTMLInputElement).value || '';
    const totalLength = currentText.length + pastedText.length;

    console.log('[IAndes] Paste detected:', { pastedLength: pastedText.length, totalLength });

    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return;
    }

    chrome.runtime.sendMessage({
      type: 'PASTE_DETECTED',
      payload: {
        pastedText,
        pastedLength: pastedText.length,
        totalLength,
      }
    }).catch(err => {
      // Ignore context invalidated errors as they are expected after extension reload
      if (!err.message?.includes('Extension context invalidated')) {
        console.warn('[IAndes] Failed to send PASTE_DETECTED msg:', err);
      }
    });
  }

  private injectPrompt(text: string): void {
    if (!this.adapter) return;
    const input = this.adapter.getInputElement();
    if (input) {
      this.adapter.injectText(input, text);
    }
  }
}

const script = new IAndesContentScript();
script.init().catch(err => console.error('[IAndes] Error:', err));
