export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class LoggerService {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(...args: unknown[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(...args);
    }
  }

  info(...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(...args);
    }
  }
}

export const Logger = new LoggerService();
