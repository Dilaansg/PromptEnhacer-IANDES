export interface SiteAdapter {
  readonly siteId: string;
  readonly hostname: string;
  getInputElement(): HTMLElement | null;
  injectText(element: HTMLElement, text: string): void;
  getPromptText?(element: HTMLElement): string;
  isReady(): boolean;
}
