/**
 * @jest-environment jsdom
 */

import '../test-utils/setup-chrome';

describe('IAndes Panel', () => {
  const mockChrome = (global as unknown as {
    chrome: {
      runtime: {
        sendMessage: jest.Mock;
        onMessage: { addListener: jest.Mock };
      };
    };
  }).chrome;

  function loadPanelModule(): { onMessageHandler: ((msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void) | undefined } {
    let onMessageHandler: ((msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void) | undefined;

    jest.isolateModules(() => {
      // Ensure fresh DOM state before module executes
      if (!document.getElementById('app')) {
        const app = document.createElement('div');
        app.id = 'app';
        document.body.appendChild(app);
      }

      // Clear any previously registered listener mock calls
      mockChrome.runtime.onMessage.addListener.mockClear();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../index');

      onMessageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0]?.[0] as
        | ((msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void)
        | undefined;
    });

    return { onMessageHandler };
  }

  beforeEach(() => {
    mockChrome.runtime.sendMessage.mockClear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('initializes with empty state', () => {
    loadPanelModule();
    const app = document.getElementById('app')!;
    expect(app.innerHTML).toContain('Bienvenido a IAndes');
    expect(app.innerHTML).toContain('🤖');
  });

  it('display result renders comparison view', () => {
    const { onMessageHandler } = loadPanelModule();
    const app = document.getElementById('app')!;
    const sendResponse = jest.fn();

    onMessageHandler!(
      {
        type: 'DISPLAY_RESULT',
        payload: {
          superPrompt: 'Optimized prompt text',
          originalPrompt: 'Original prompt text',
          templateUsed: 'code/debug',
          estimatedTokenDelta: -10,
          componentsUsed: ['component1', 'component2']
        }
      },
      {},
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(app.innerHTML).toContain('Prompt Original');
    expect(app.innerHTML).toContain('Super-Prompt');
    expect(app.innerHTML).toContain('Original prompt text');
    expect(app.innerHTML).toContain('Optimized prompt text');
  });

  it('use prompt sends INJECT_PROMPT message', () => {
    const { onMessageHandler } = loadPanelModule();
    const sendResponse = jest.fn();

    onMessageHandler!(
      {
        type: 'DISPLAY_RESULT',
        payload: {
          superPrompt: 'Optimized prompt text',
          originalPrompt: 'Original prompt text',
          templateUsed: 'code/debug',
          estimatedTokenDelta: -10,
          componentsUsed: []
        }
      },
      {},
      sendResponse
    );

    // Find and click the use button
    const useBtn = document.querySelector('.btn-primary') as HTMLButtonElement | null;
    expect(useBtn).not.toBeNull();
    useBtn!.click();

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INJECT_PROMPT',
        payload: expect.objectContaining({ text: 'Optimized prompt text' })
      })
    );
  });

  it('discard clears the view back to empty state', () => {
    const { onMessageHandler } = loadPanelModule();
    const sendResponse = jest.fn();

    onMessageHandler!(
      {
        type: 'DISPLAY_RESULT',
        payload: {
          superPrompt: 'Optimized prompt text',
          originalPrompt: 'Original prompt text',
          templateUsed: 'code/debug',
          estimatedTokenDelta: -10,
          componentsUsed: []
        }
      },
      {},
      sendResponse
    );

    const discardBtn = document.querySelector('.btn-secondary') as HTMLButtonElement | null;
    expect(discardBtn).not.toBeNull();
    discardBtn!.click();

    const app = document.getElementById('app')!;
    expect(app.innerHTML).toContain('Bienvenido a IAndes');
  });
});
