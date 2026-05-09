export class ComparisonView {
  render(original: string, superPrompt: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'comparison-view';

    container.innerHTML = `
      <div class="prompt-section">
        <h3>Prompt Original</h3>
        <div class="prompt-text">${this.escapeHtml(original)}</div>
      </div>
      <div class="super-prompt-section">
        <h3>Super-Prompt <span class="super-badge">✨</span></h3>
        <textarea class="prompt-editor" id="super-prompt-editor">${this.escapeHtml(superPrompt)}</textarea>
      </div>
    `;

    return container;
  }

  getEditedPrompt(): string {
    const editor = document.getElementById('super-prompt-editor') as HTMLTextAreaElement | null;
    return editor?.value || '';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
