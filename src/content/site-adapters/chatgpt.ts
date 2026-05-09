import { SiteAdapter } from './types';

export class ChatGPTAdapter implements SiteAdapter {
  siteId = 'chatgpt';
  hostname = 'chatgpt.com';

  getInputElement(): HTMLElement | null {
    return (
      // Older ChatGPT
      document.querySelector<HTMLElement>('#prompt-textarea') ||
      // Newer ChatGPT: contenteditable div
      document.querySelector<HTMLElement>('div[contenteditable="true"]') ||
      // Textarea inside main chat form
      document.querySelector<HTMLElement>('form textarea') ||
      // Textarea or contenteditable inside the send-button parent form
      document.querySelector<HTMLElement>('[data-testid="send-button"]')
        ?.closest('form')
        ?.querySelector<HTMLElement>('textarea, [contenteditable="true"]') ||
      // Any element with role="textbox"
      document.querySelector<HTMLElement>('[role="textbox"]') ||
      // Placeholder-based fallbacks (case-insensitive)
      document.querySelector<HTMLElement>('textarea[placeholder*="Message" i], textarea[placeholder*="Mensaje" i]') ||
      document.querySelector<HTMLElement>('div[placeholder*="Message" i], div[placeholder*="Mensaje" i]') ||
      document.querySelector<HTMLElement>('input[placeholder*="Message" i], input[placeholder*="Mensaje" i]') ||
      // Generic textarea fallback
      document.querySelector<HTMLElement>('textarea') ||
      null
    );
  }

  getPromptText(element: HTMLElement): string {
    if (element.tagName === 'TEXTAREA') {
      return (element as HTMLTextAreaElement).value;
    }
    if (element.isContentEditable) {
      return element.textContent || '';
    }
    if (element.tagName === 'INPUT') {
      return (element as HTMLInputElement).value || '';
    }
    return element.textContent || '';
  }

  injectText(element: HTMLElement, text: string): void {
    if (element.tagName === 'TEXTAREA') {
      const textarea = element as HTMLTextAreaElement;
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (element.isContentEditable) {
      element.focus();
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      // Extra keyboard event to ensure React / ProseMirror frameworks register the update
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
      return;
    }

    if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }

  isReady(): boolean {
    return (
      !!this.getInputElement() ||
      !!document.querySelector('[data-testid="send-button"]') ||
      !!document.querySelector('button[aria-label*="send" i]')
    );
  }
}
