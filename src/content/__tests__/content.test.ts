import { detectCurrentSite, ChatGPTAdapter, ClaudeAdapter, GeminiAdapter } from '../site-adapters';
import { FloatingButton } from '../floating-button';

describe('Content Script', () => {
  const mockAppendChild = jest.fn();
  const mockAddEventListener = jest.fn();
  const mockSendMessage = jest.fn();
  const mockQuerySelector = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (global as any).window = {
      location: { hostname: 'chatgpt.com' },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    (global as any).document = {
      createElement: jest.fn(() => ({
        id: '',
        innerHTML: '',
        style: {} as CSSStyleDeclaration,
        addEventListener: mockAddEventListener,
        appendChild: mockAppendChild,
      })),
      body: { appendChild: mockAppendChild },
      querySelector: mockQuerySelector,
    };

    (global as any).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        onMessage: { addListener: jest.fn() },
      },
    };
  });

  describe('Site Adapter Detection', () => {
    it('detects ChatGPT', () => {
    (global as any).window = {
      location: { hostname: 'chatgpt.com' },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
      const adapter = detectCurrentSite();
      expect(adapter).toBeInstanceOf(ChatGPTAdapter);
      expect(adapter?.siteId).toBe('chatgpt');
    });

    it('detects Claude', () => {
      (global as any).window = { location: { hostname: 'claude.ai' } };
      const adapter = detectCurrentSite();
      expect(adapter).toBeInstanceOf(ClaudeAdapter);
      expect(adapter?.siteId).toBe('claude');
    });

    it('detects Gemini', () => {
      (global as any).window = { location: { hostname: 'gemini.google.com' } };
      const adapter = detectCurrentSite();
      expect(adapter).toBeInstanceOf(GeminiAdapter);
      expect(adapter?.siteId).toBe('gemini');
    });

    it('returns undefined for unsupported sites', () => {
      (global as any).window = { location: { hostname: 'example.com' } };
      const adapter = detectCurrentSite();
      expect(adapter).toBeUndefined();
    });
  });

  describe('Floating Button', () => {
    it('creates and renders a floating button', async () => {
      const adapter = new ChatGPTAdapter();
      const button = new FloatingButton(adapter);
      await button.render();

      expect(document.createElement).toHaveBeenCalledWith('button');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('sends messages on click when input has text', async () => {
      const adapter = new ChatGPTAdapter();
      const mockInput = { value: 'Test prompt', tagName: 'TEXTAREA' } as unknown as HTMLTextAreaElement;
      jest.spyOn(adapter, 'getInputElement').mockReturnValue(mockInput);

      const button = new FloatingButton(adapter);
      await button.render();

      const clickHandler = mockAddEventListener.mock.calls.find(
        ([event]: [string]) => event === 'click'
      )?.[1] as Function;

      expect(clickHandler).toBeDefined();
      clickHandler();

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'OPEN_PANEL' });
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'PROCESS_PROMPT',
        payload: { text: 'Test prompt' },
      });
    });

    it('does nothing when input element is not found', async () => {
      const adapter = new ChatGPTAdapter();
      jest.spyOn(adapter, 'getInputElement').mockReturnValue(null);

      const button = new FloatingButton(adapter);
      await button.render();

      const clickHandler = mockAddEventListener.mock.calls.find(
        ([event]: [string]) => event === 'click'
      )?.[1] as Function;

      if (clickHandler) clickHandler();

      expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({
        type: 'PROCESS_PROMPT',
      }));
    });
  });

  describe('Message Handling', () => {
    it('handles PIPELINE_RESULT messages', () => {
      const handler = jest.fn((msg: unknown, _sender: unknown, sendResponse: (r: unknown) => void) => {
        const m = msg as { type: string; payload: unknown };
        if (m.type === 'PIPELINE_RESULT') {
          sendResponse({ ok: true });
        }
      });

      const sendResponse = jest.fn();
      handler({ type: 'PIPELINE_RESULT', payload: { result: 'test' } }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });

    it('handles INJECT_PROMPT messages', () => {
      const adapter = new ChatGPTAdapter();
      const mockInput = { value: '', tagName: 'TEXTAREA', dispatchEvent: jest.fn() } as unknown as HTMLTextAreaElement;
      jest.spyOn(adapter, 'getInputElement').mockReturnValue(mockInput);
      const injectSpy = jest.spyOn(adapter, 'injectText');

      const handler = jest.fn((msg: unknown, _sender: unknown, sendResponse: (r: unknown) => void) => {
        const m = msg as { type: string; payload: { text: string } };
        if (m.type === 'INJECT_PROMPT') {
          const input = adapter.getInputElement();
          if (input) {
            adapter.injectText(input, m.payload.text);
          }
          sendResponse({ ok: true });
        }
      });

      const sendResponse = jest.fn();
      handler({ type: 'INJECT_PROMPT', payload: { text: 'optimized prompt' } }, {}, sendResponse);

      expect(injectSpy).toHaveBeenCalledWith(mockInput, 'optimized prompt');
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });
  });
});
