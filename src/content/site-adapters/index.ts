import { SiteAdapter } from './types';
import { ChatGPTAdapter } from './chatgpt';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';

const adapters: readonly SiteAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
];

export function detectCurrentSite(): SiteAdapter | undefined {
  const host = window.location.hostname.replace(/^www\./, '');
  return adapters.find((a) => a.hostname === host);
}

export * from './types';
export { ChatGPTAdapter, ClaudeAdapter, GeminiAdapter };
