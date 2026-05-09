import { QuestionDefinition } from '@shared/types';

export class QuestionsView {
  private answers: Record<string, string> = {};
  private onAnswer: ((answers: Record<string, string>) => void) | null = null;

  render(questions: readonly QuestionDefinition[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'questions-view';

    if (questions.length === 0) {
      container.style.display = 'none';
      return container;
    }

    const heading = document.createElement('h3');
    heading.textContent = 'Preguntas para mejorar el resultado';
    container.appendChild(heading);

    questions.forEach(q => {
      const questionEl = document.createElement('div');
      questionEl.className = 'question-item';
      questionEl.innerHTML = `
        <div class="question-text">${q.question}</div>
        <div class="question-options" data-question="${q.id}"></div>
      `;

      const optionsContainer = questionEl.querySelector('.question-options')!;
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'question-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => this.selectOption(q.id, opt, optionsContainer));
        optionsContainer.appendChild(btn);
      });

      container.appendChild(questionEl);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary';
    submitBtn.style.marginTop = '12px';
    submitBtn.style.width = '100%';
    submitBtn.textContent = 'Continuar';
    submitBtn.addEventListener('click', () => {
      if (Object.keys(this.answers).length > 0) {
        this.onAnswer?.(this.answers);
      } else {
        alert('Por favor, selecciona al menos una respuesta para continuar.');
      }
    });
    container.appendChild(submitBtn);

    return container;
  }

  private selectOption(questionId: string, option: string, container: Element): void {
    this.answers[questionId] = option;

    // Update UI
    container.querySelectorAll('.question-option').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === option);
    });
  }

  onAnswersChange(callback: (answers: Record<string, string>) => void): void {
    this.onAnswer = callback;
  }

  getAnswers(): Record<string, string> {
    return { ...this.answers };
  }
}
