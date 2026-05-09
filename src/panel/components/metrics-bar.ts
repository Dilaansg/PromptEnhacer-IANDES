export class MetricsBar {
  render(stats: { type?: string; intent?: string; tokenDelta?: number; components?: readonly string[] }): HTMLElement {
    const container = document.createElement('div');
    container.className = 'metrics-bar';

    const componentsStr = stats.components?.join(', ') || 'N/A';
    const deltaClass = (stats.tokenDelta || 0) >= 0 ? '' : 'positive';
    const deltaSign = (stats.tokenDelta || 0) >= 0 ? '+' : '';

    container.innerHTML = `
      <div class="metric">
        <span class="metric-label">Tipo</span>
        <span class="metric-value">${stats.type || 'N/A'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Intención</span>
        <span class="metric-value">${stats.intent || 'N/A'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Tokens</span>
        <span class="metric-value ${deltaClass}">${deltaSign}${stats.tokenDelta || 0}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Componentes</span>
        <span class="metric-value">${componentsStr}</span>
      </div>
    `;

    return container;
  }
}
