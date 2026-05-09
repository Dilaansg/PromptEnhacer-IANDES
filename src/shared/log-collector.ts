export interface LogEntry {
  ts: number;
  tag: string;
  msg: string;
  level: 'info' | 'warn' | 'error';
}

const logBuffer: LogEntry[] = [];
const MAX_BUFFER = 500;

export function pipelineLog(tag: string, msg: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const entry: LogEntry = { ts: Date.now(), tag, msg, level };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.splice(0, logBuffer.length - MAX_BUFFER);
  }

  // Also log to console for standard debugging
  const prefix = `[${tag}]`;
  if (level === 'error') console.error(prefix, msg);
  else if (level === 'warn') console.warn(prefix, msg);
  else console.log(prefix, msg);
}

export function getLogs(): readonly LogEntry[] {
  return logBuffer;
}

export function clearLogs(): void {
  logBuffer.length = 0;
}
