import { LayerAOutput, LayerBOutput, QuestionDefinition } from '@shared/types';
import { QuestionSelector } from './question-selector';
import { normalizeAnswer } from './answer-normalizer';

/** Generate a simple UUID-like session identifier. */
function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class LayerB {
  private readonly selector = new QuestionSelector();

  selectQuestions(layerAOutput: LayerAOutput): QuestionDefinition[] {
    return this.selector.selectQuestions(layerAOutput);
  }

  /**
   * Tarea 5.4: Every call generates a unique sessionId.
   * Both SHOW_QUESTIONS (sent to panel) and the QUESTIONS_ANSWERED handler
   * validate sessionId AND originalPrompt to prevent cross-talk.
   */
  async promptUser(
    questions: QuestionDefinition[],
    originalPrompt: string,
  ): Promise<Record<string, string>> {
    const sessionId = generateSessionId();

    return new Promise((resolve) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        const fallback: Record<string, string> = {};
        for (const q of questions) {
          fallback[q.id] = q.options[0] ?? '';
        }
        console.warn('[LayerB] promptUser timeout after 60s, using fallback');
        cleanup();
        resolve(fallback);
      }, 60000);

      const messageHandler = (msg: unknown) => {
        if (
          typeof msg !== 'object' ||
          msg === null ||
          (msg as Record<string, unknown>).type !== 'QUESTIONS_ANSWERED'
        ) {
          // Resend questions when panel reopens
          if (
            typeof msg === 'object' &&
            msg !== null &&
            (msg as Record<string, unknown>).type === 'PANEL_READY'
          ) {
            console.log('[LayerB] Panel ready, resending questions');
            sendQuestions();
          }
          return false;
        }

        const payload = (msg as Record<string, unknown>).payload as
          | Record<string, unknown>
          | undefined;

        // Validate both sessionId AND originalPrompt to prevent cross-talk (Tarea 5.4)
        const sessionMatch =
          !payload?.sessionId || payload.sessionId === sessionId;
        const promptMatch = payload?.originalPrompt === originalPrompt;

        if (sessionMatch && promptMatch) {
          if (resolved) return false;
          resolved = true;
          cleanup();
          resolve((payload?.answers as Record<string, string>) ?? {});
        }
        return false;
      };

      const sendQuestions = () => {
        chrome.runtime
          .sendMessage({
            type: 'SHOW_QUESTIONS',
            payload: { questions, originalPrompt, sessionId },
          })
          .catch(() => {
            console.warn(
              '[LayerB] Failed to send questions, panel might not be ready yet',
            );
          });
      };

      const cleanup = () => {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(messageHandler);
      };

      chrome.runtime.onMessage.addListener(messageHandler);

      // Try sending immediately
      sendQuestions();

      // Ensure panel is open
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.sidePanel.open({ tabId }).catch(() => {
            console.error('[LayerB] Failed to open side panel');
          });
        }
      });
    });
  }

  private _mapAnswers(
    questions: QuestionDefinition[],
    rawAnswers: Record<string, string>,
  ): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const q of questions) {
      const raw = rawAnswers[q.id];
      if (raw !== undefined && raw !== '') {
        mapped[q.mapsTo] = normalizeAnswer(raw, q.normalize);
      }
    }
    return mapped;
  }

  buildOutput(
    layerAOutput: LayerAOutput,
    rawAnswers: Record<string, string>,
    questions: QuestionDefinition[],
  ): LayerBOutput {
    const mappedAnswers = this._mapAnswers(questions, rawAnswers);

    // Merge with explicit priority: user answers > detected attributes > entities (never overwritten)
    const enrichedAttributes: Record<string, unknown> = {
      ...(layerAOutput.attributes ?? {}),
      ...mappedAnswers,
    } as unknown as Record<string, unknown>;

    return {
      questionsAsked: Object.keys(rawAnswers).length,
      skipped: Object.keys(rawAnswers).length === 0,
      answers: rawAnswers,
      enrichedAttributes,
      entities: layerAOutput.entities as unknown as Record<string, unknown>,
      resolvedType: layerAOutput.primary.typeId ?? 'general',
      resolvedIntent: layerAOutput.primary.intent ?? '',
      originalPrompt: layerAOutput.original ?? '',
    };
  }
}
