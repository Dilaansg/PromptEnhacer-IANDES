/**
 * IAndes Chrome Extension — Typed Message Discriminated Union
 *
 * Every message passed via chrome.runtime.sendMessage / onMessage must use
 * one of the types below.  Add new messages here; never use ad-hoc objects.
 */
import type { LayerCOutput, QuestionDefinition } from './types';

// ─── Outbound: Content Script → Service Worker ───────────────────────────────

export interface ProcessPromptMessage {
  type: 'PROCESS_PROMPT';
  payload: { text: string; site?: string };
}

export interface OpenPanelMessage {
  type: 'OPEN_PANEL';
}

export interface PasteDetectedMessage {
  type: 'PASTE_DETECTED';
  payload: {
    pastedText: string;
    pastedLength: number;
    totalLength: number;
  };
}

// ─── Outbound: Panel → Service Worker ────────────────────────────────────────

export interface PanelReadyMessage {
  type: 'PANEL_READY';
}

export interface PanelClosedMessage {
  type: 'PANEL_CLOSED';
}

export interface QuestionsAnsweredMessage {
  type: 'QUESTIONS_ANSWERED';
  payload: {
    answers: Record<string, string>;
    originalPrompt: string;
    sessionId?: string;
  };
}

export interface GetQuestionsMessage {
  type: 'GET_QUESTIONS';
  payload: { text: string };
}

export interface InjectPromptMessage {
  type: 'INJECT_PROMPT';
  payload: { text: string };
}

// ─── Inbound: Service Worker → Panel ─────────────────────────────────────────

export interface ShowQuestionsMessage {
  type: 'SHOW_QUESTIONS';
  payload: {
    questions: QuestionDefinition[];
    originalPrompt: string;
    sessionId?: string;
  };
}

export interface DisplayResultMessage {
  type: 'DISPLAY_RESULT';
  payload: LayerCOutput;
}

export interface ShowLoadingMessage {
  type: 'SHOW_LOADING';
}

export interface DisplayErrorMessage {
  type: 'DISPLAY_ERROR';
  payload: { message: string };
}

// ─── Inbound: Service Worker → Content Script ────────────────────────────────

export interface PipelineResultMessage {
  type: 'PIPELINE_RESULT';
  payload: LayerCOutput;
}

// ─── Union types ─────────────────────────────────────────────────────────────

/** All messages that can travel over chrome.runtime */
export type IAndesMessage =
  | ProcessPromptMessage
  | OpenPanelMessage
  | PasteDetectedMessage
  | PanelReadyMessage
  | PanelClosedMessage
  | QuestionsAnsweredMessage
  | GetQuestionsMessage
  | InjectPromptMessage
  | ShowQuestionsMessage
  | DisplayResultMessage
  | ShowLoadingMessage
  | DisplayErrorMessage
  | PipelineResultMessage;

/** Narrow a message to a specific type at runtime */
export function isMessage<T extends IAndesMessage['type']>(
  msg: unknown,
  type: T,
): msg is Extract<IAndesMessage, { type: T }> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: string }).type === type
  );
}
