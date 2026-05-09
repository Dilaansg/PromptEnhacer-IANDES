import { SiteAdapter } from './types';

export class GeminiAdapter implements SiteAdapter {
  siteId = 'gemini';
  hostname = 'gemini.google.com';

  getInputElement(): HTMLElement | null {
    return (
      document.querySelector('textarea') ||
      document.querySelector('[contenteditable="true"]') ||
      document.querySelector('input[placeholder*="Ask"]') ||
      document.querySelector('input[placeholder*="Pregunta"]') ||
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
    return (element as HTMLInputElement).value || element.textContent || '';
  }

  injectText(element: HTMLElement, text: string): void {
    if (element.tagName === 'TEXTAREA') {
      const textarea = element as HTMLTextAreaElement;
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.isContentEditable) {
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  isReady(): boolean {
    return !!document.querySelector('textarea') ||
           !!document.querySelector('[contenteditable="true"]') ||
           !!document.querySelector('input');
  }
}
