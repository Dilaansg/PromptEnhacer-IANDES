export {};

const mockChrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
  sidePanel: {
    open: jest.fn().mockResolvedValue(undefined),
  },
};

(global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;
