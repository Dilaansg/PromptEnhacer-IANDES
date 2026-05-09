const mockChrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    sendMessage: jest.fn().mockResolvedValue(undefined),
    getURL: jest.fn((path: string) => `chrome-extension://test-id${path}`),
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    query: jest.fn((_, callback) => callback([{ id: 456 }])),
  },
  sidePanel: {
    open: jest.fn().mockResolvedValue(undefined),
  },
};

(global as any).chrome = mockChrome;
