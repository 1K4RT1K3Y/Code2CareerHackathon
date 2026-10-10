'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, Loader2, X } from 'lucide-react';
import type { Quiz } from '@/lib/schemas';

type ModuleForQuiz = {
  title: string;
  objective: string;
  keyTopics: string[];
};

export default function QuizModal({
  targetRole,
  module,
  onClose,
}: {
  targetRole: string;
  module: ModuleForQuiz;
  onClose: () => void;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadQuiz() {
      try {
        const response = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole, moduleTitle: module.title, objective: module.objective, keyTopics: module.keyTopics }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error([data.error || 'Could not create the quiz.', data.detail].filter(Boolean).join(': '));
        if (!cancelled) setQuiz(data as Quiz);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not create the quiz.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void loadQuiz();
    return () => { cancelled = true; };
  }, [targetRole, module.title, module.objective, module.keyTopics]);

  const score = quiz ? quiz.questions.reduce((total, question, index) => total + (answers[index] === question.correctAnswer ? 1 : 0), 0) : 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="quiz-modal modal-card" role="dialog" aria-modal="true" aria-label="Module knowledge check">
        <div className="modal-topline"><span className="modal-kicker"><CircleHelp size={15} /> KNOWLEDGE CHECK</span><button className="icon-button" onClick={onClose} aria-label="Close quiz"><X size={18} /></button></div>
        <h2>{module.title}</h2>
        <p className="muted">Five quick questions for your path to {targetRole}.</p>
        {busy && <div className="loading-panel"><Loader2 size={24} className="spin" /><span>Preparing questions tailored to this module…</span></div>}
        {error && !busy && <div className="form-alert error-alert">{error}<p className="small-note">Check that your Vercel AI Gateway key and model are configured.</p></div>}
        {quiz && !busy && <>
          <div className="quiz-progress-row"><span>{Object.keys(answers).length} of {quiz.questions.length} answered</span><span>{quiz.title}</span></div>
          <div className="quiz-question-list">
            {quiz.questions.map((question, index) => (
              <article className="quiz-question" key={`${index}-${question.question}`}>
                <div className="quiz-question-heading"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><h3>{question.question}</h3></div>
                <div className="quiz-options">
                  {question.options.map((option, optionIndex) => {
                    const isCorrect = submitted && optionIndex === question.correctAnswer;
                    const isWrong = submitted && answers[index] === optionIndex && optionIndex !== question.correctAnswer;
                    return <button key={option} type="button" disabled={submitted} className={`quiz-option ${answers[index] === optionIndex ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{isCorrect && <CheckCircle2 size={16} />}</button>;
                  })}
                </div>
                {submitted && <div className="quiz-explanation"><strong>{answers[index] === question.correctAnswer ? 'That’s right.' : 'Let’s learn from this.'}</strong> {question.explanation}</div>}
              </article>
            ))}
          </div>
          {!submitted ? <button className="button button-primary full-button" disabled={Object.keys(answers).length !== quiz.questions.length} onClick={() => setSubmitted(true)}>Check my answers <CheckCircle2 size={17} /></button> : <div className="quiz-results"><div className="quiz-result-score"><strong>{score}/5</strong><span>correct</span></div><div><h3>{score >= 4 ? 'Strong understanding!' : score >= 3 ? 'Good progress. Keep going.' : 'A useful place to practise.'}</h3><p className="muted">Review the explanations, then return to your learning path.</p></div><button className="button button-primary" onClick={onClose}>Back to path</button></div>}
        </>}
      </section>
    </div>
  );
}
