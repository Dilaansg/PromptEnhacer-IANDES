import './styles/main.css';

import { ComparisonView } from './components/comparison-view';
import { QuestionsView } from './components/questions-view';
import { ActionButtons } from './components/action-buttons';
import { LayerCOutput, QuestionDefinition } from '@shared/types';

export class IAndesPanel {
  private app: HTMLElement;
  private comparisonView: ComparisonView | null = null;
  private questionsView: QuestionsView | null = null;
  private currentResult: LayerCOutput | null = null;
  private debugVisible = true;

  constructor() {
    const el = document.getElementById('app');
    if (!el) {
      throw new Error('IAndesPanel: #app element not found');
    }
    this.app = el;
    this.setupMessageListener();
    this.renderEmptyState();
    // Notify SW that panel is ready to receive results
    chrome.runtime.sendMessage({ type: 'PANEL_READY' }).catch(() => {});
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      switch (msg.type) {
        case 'DISPLAY_RESULT':
          this.displayResult(msg.payload as LayerCOutput);
          sendResponse({ ok: true });
          break;
        case 'SHOW_QUESTIONS':
          this.displayQuestions(
            msg.payload.questions as QuestionDefinition[],
            msg.payload.originalPrompt as string
          );
          sendResponse({ ok: true });
          break;
        case 'SHOW_LOADING':
          this.renderLoading();
          sendResponse({ ok: true });
          break;
        case 'DISPLAY_ERROR':
          this.renderError(msg.payload.message);
          sendResponse({ ok: true });
          break;
        case 'DEBUG_MODE':
          this.updateDebugButtons(msg.payload?.enabled ?? false);
          sendResponse({ ok: true });
          break;
        default:
          return false;
      }
      return false;
    });

    // Check initial debug mode
    chrome.runtime.sendMessage({ type: 'GET_DEBUG_MODE' }, (response) => {
      if (response) {
        this.updateDebugButtons(response.enabled ?? false);
      }
    });
  }

  private updateDebugButtons(visible: boolean): void {
    this.debugVisible = visible;
    const icons = document.querySelector('.toolbar-icons') as HTMLElement | null;
    if (icons) {
      icons.style.display = visible ? 'flex' : 'none';
    }
  }

  private renderHeader(title: string, subtitle: string, showToolbar = false): HTMLElement {
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <div class="brand">
        <div class="brand-logo-wrap"></div>
        <div class="brand-text">
          <h1>${title}</h1>
          <div class="subtitle">${subtitle}</div>
        </div>
      </div>
      <div class="toolbar-icons" style="display: ${showToolbar && this.debugVisible ? 'flex' : 'none'}">
        <button class="icon-btn" id="btn-debug" title="Copiar debug info">📋</button>
        <button class="icon-btn" id="btn-tuto" title="Ver guía de ingeniería de prompts">❓</button>
      </div>
    `;

    // Logo loaded via code to avoid CSP inline onerror
    const logoWrap = header.querySelector('.brand-logo-wrap');
    if (logoWrap) {
      const logo = document.createElement('img');
      logo.className = 'brand-logo';
      logo.src = './assets/logo.png';
      logo.alt = 'IAndes';
      logo.addEventListener('error', () => { logo.style.display = 'none'; });
      logoWrap.appendChild(logo);
    }

    return header;
  }

  private renderEmptyState(): void {
    this.app.innerHTML = `
      <div class="state-card">
        <div class="state-icon">🤖</div>
        <h2>Bienvenido a IAndes</h2>
        <p>Escribe un prompt en ChatGPT, Claude o Gemini y haz clic en el botón IA para mejorarlo.</p>
      </div>
    `;
  }

  private renderLoading(): void {
    this.app.innerHTML = `
      <div class="state-card">
        <div class="loading-spinner"></div>
        <h2>Analizando tu prompt…</h2>
        <p>Optimizando la estructura y el contenido para mejores resultados.</p>
      </div>
    `;
  }

  private renderError(message: string): void {
    this.app.innerHTML = `
      <div class="state-card error">
        <div class="state-icon">⚠️</div>
        <h2>Ocurrió un error</h2>
        <p>${message}</p>
        <button class="btn btn-primary" id="btn-retry">Reintentar</button>
      </div>
    `;
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  private displayResult(result: LayerCOutput): void {
    this.currentResult = result;
    this.app.innerHTML = '';

    const header = this.renderHeader('IAndes', 'Prompt optimizado', true);
    this.app.appendChild(header);

    // Attach icon button handlers
    document.getElementById('btn-debug')?.addEventListener('click', () => this.copyDebugInfo());
    document.getElementById('btn-tuto')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_TUTO' });
    });

    const content = document.createElement('div');
    content.className = 'panel-content';

    // Comparison
    this.comparisonView = new ComparisonView();
    content.appendChild(this.comparisonView.render(result.originalPrompt, result.superPrompt));

    // Actions
    const actions = new ActionButtons();
    actions.onUsePrompt(() => this.usePrompt());
    actions.onDiscardPrompt(() => this.discardPrompt());
    content.appendChild(actions.render());

    this.app.appendChild(content);
  }

  private async copyDebugInfo(): Promise<void> {
    if (!this.currentResult) return;

    try {
      const debugData = JSON.stringify(this.currentResult, null, 2);
      await navigator.clipboard.writeText(debugData);

      const debugBtn = document.querySelector('.btn-debug');
      if (debugBtn) {
        const originalHtml = debugBtn.innerHTML;
        debugBtn.innerHTML = '✅';
        setTimeout(() => { debugBtn.innerHTML = originalHtml; }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy debug info:', err);
    }
  }

  private displayQuestions(questions: readonly QuestionDefinition[], originalPrompt: string): void {
    this.app.innerHTML = '';

    const header = this.renderHeader('IAndes', 'Ayúdanos a entender mejor tu necesidad', true);
    this.app.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    this.questionsView = new QuestionsView();
    content.appendChild(this.questionsView.render(questions));

    // Show original prompt for context
    const context = document.createElement('div');
    context.className = 'prompt-section';
    context.innerHTML = `<h3>Prompt Original</h3><div class="prompt-text">${originalPrompt}</div>`;
    content.appendChild(context);

    this.questionsView.onAnswersChange((answers) => {
      // Send answers back to service worker
      chrome.runtime.sendMessage({
        type: 'QUESTIONS_ANSWERED',
        payload: { answers, originalPrompt }
      });
    });

    this.app.appendChild(content);
  }

  private usePrompt(): void {
    const prompt = this.comparisonView?.getEditedPrompt() || this.currentResult?.superPrompt;
    if (prompt) {
      chrome.runtime.sendMessage({
        type: 'INJECT_PROMPT',
        payload: { text: prompt }
      });
    }
  }

  private discardPrompt(): void {
    this.currentResult = null;
    this.renderEmptyState();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new IAndesPanel());
} else {
  new IAndesPanel();
}
