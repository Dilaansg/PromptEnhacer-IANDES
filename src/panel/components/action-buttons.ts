export class ActionButtons {
  private onUse: (() => void) | null = null;
  private onDiscard: (() => void) | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'action-buttons';

    const useBtn = document.createElement('button');
    useBtn.className = 'btn btn-primary';
    useBtn.textContent = 'Usar este prompt';
    useBtn.addEventListener('click', () => this.onUse?.());

    const discardBtn = document.createElement('button');
    discardBtn.className = 'btn btn-secondary';
    discardBtn.textContent = 'Descartar';
    discardBtn.addEventListener('click', () => this.onDiscard?.());

    container.appendChild(useBtn);
    container.appendChild(discardBtn);

    return container;
  }

  onUsePrompt(callback: () => void): void {
    this.onUse = callback;
  }

  onDiscardPrompt(callback: () => void): void {
    this.onDiscard = callback;
  }
}
