import { SiteAdapter } from './site-adapters/types';

/**
 * FloatingButton — renders a fixed "Optimizar" button at the bottom-right.
 * Includes a small "×" to dismiss.  Dismiss state is persisted per host.
 */
export class FloatingButton {
  private container: HTMLElement | null = null;

  constructor(private adapter: SiteAdapter) {}

  async render(): Promise<void> {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'iandes-floating-button';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Main button
    const btn = document.createElement('button');
    btn.title = 'Optimizar prompt con IAndes';
    btn.style.cssText = `
      background: #ffffff;
      color: #2c3e50;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      line-height: 1;
    `;

    // Logo inside button
    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('assets/logo.png');
    logo.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 4px;
      object-fit: contain;
    `;
    
    const label = document.createElement('span');
    label.textContent = 'Optimizar';
    
    btn.appendChild(logo);
    btn.appendChild(label);

    btn.addEventListener('mouseenter', () => { 
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
      btn.style.borderColor = '#4db8b8';
    });
    btn.addEventListener('mouseleave', () => { 
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      btn.style.borderColor = '#e5e7eb';
    });
    btn.addEventListener('click', () => this._handleClick());

    // Close / hide button
    const close = document.createElement('button');
    close.textContent = '\u2715'; // ✕ (nicer cross)
    close.title = 'Ocultar';
    close.style.cssText = `
      background: #ffffff;
      color: #9ca3af;
      border: 1px solid #e5e7eb;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
      padding: 0;
    `;
    close.addEventListener('mouseenter', () => { 
      close.style.color = '#ef4444';
      close.style.borderColor = '#fee2e2';
      close.style.background = '#fef2f2';
    });
    close.addEventListener('mouseleave', () => { 
      close.style.color = '#9ca3af';
      close.style.borderColor = '#e5e7eb';
      close.style.background = '#ffffff';
    });
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      this._hide();
    });

    this.container.appendChild(btn);
    this.container.appendChild(close);
    document.body.appendChild(this.container);
  }

  /** Hide the button visually (can be reshown with show()). */
  private _hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /** Show the button again after it was hidden. */
  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /** Check whether the button is currently hidden. */
  isHidden(): boolean {
    return this.container?.style.display === 'none';
  }

  private async _handleClick(): Promise<void> {
    const input = this.adapter.getInputElement();
    if (!input) return;

    const promptText =
      this.adapter.getPromptText?.(input) ||
      (input as HTMLTextAreaElement).value ||
      input.textContent ||
      '';

    if (!promptText.trim()) {
      alert('Escribe un prompt primero');
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      alert('La extensión se ha actualizado. Por favor, refresca la página.');
      return;
    }

    try {
      // Open panel first, then process
      await chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });

      // Processing starts
      await chrome.runtime.sendMessage({
        type: 'PROCESS_PROMPT',
        payload: { text: promptText },
      });
    } catch (err: any) {
      if (err.message?.includes('Extension context invalidated')) {
        alert('La conexión con la extensión se perdió. Por favor, refresca la página.');
      } else {
        console.error('[IAndes] Error sending message:', err);
      }
    }
  }
}
