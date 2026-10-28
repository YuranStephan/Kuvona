"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitQuizAction, type QuizResult } from "@/actions/learning";
import { Icon } from "@/components/icon";

type Question = { id: string; prompt: string; options: string[] };

export function QuizRunner({ courseId, questions, passPercent }: { courseId: string; questions: Question[]; passPercent: number }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<Exclude<QuizResult, { error: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = answers.filter((a) => a !== null).length;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitQuizAction(courseId, answers.map((a) => a ?? -1));
      if ("error" in res) setError(res.error);
      else {
        setResult(res);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (result) {
    const { attempt, review, certificateCode } = result;
    return (
      <div className="quiz">
        <section className="quiz-score">
          <span className="eyebrow" style={{ color: "var(--saffron)" }}>
            {attempt.passed ? "Aprovado" : "Ainda não foi desta"}
          </span>
          <div className="big tabular">{attempt.scorePercent}%</div>
          <p className="muted">
            {attempt.correctCount} de {attempt.totalCount} respostas certas · mínimo para aprovar: {passPercent}%
          </p>
          {certificateCode ? (
            <Link href={`/certificado/${certificateCode}`} className="btn btn-lg btn-accent">
              <Icon name="award" size={20} /> Ver o meu certificado
            </Link>
          ) : attempt.passed ? (
            <p className="small">Conclui todas as aulas para receberes o certificado.</p>
          ) : (
            <button
              type="button"
              className="btn btn-lg"
              onClick={() => {
                setResult(null);
                setAnswers(questions.map(() => null));
              }}
            >
              <Icon name="refresh" size={18} /> Tentar novamente
            </button>
          )}
        </section>
        <h2 className="h2" style={{ color: "#fffdf8", marginTop: 12 }}>
          Revisão das respostas
        </h2>
        {review.map((q, i) => (
          <fieldset key={q.id} className="quiz-q" style={{ margin: 0 }}>
            <legend>
              {i + 1}. {q.prompt}
            </legend>
            {q.options.map((o, oi) => (
              <div key={oi} className={`quiz-option ${oi === q.correctIndex ? "correct" : oi === q.chosen ? "wrong" : ""}`}>
                <Icon name={oi === q.correctIndex ? "checkCircle" : oi === q.chosen ? "x" : "circle"} size={18} />
                <span>{o}</span>
              </div>
            ))}
            {q.explanation && <p className="small muted">{q.explanation}</p>}
          </fieldset>
        ))}
      </div>
    );
  }

  return (
    <form
      className="quiz"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {questions.map((q, i) => (
        <fieldset key={q.id} className="quiz-q" style={{ margin: 0 }}>
          <legend>
            {i + 1}. {q.prompt}
          </legend>
          {q.options.map((o, oi) => (
            <label key={oi} className="quiz-option">
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={answers[i] === oi}
                onChange={() => setAnswers(answers.map((a, ai) => (ai === i ? oi : a)))}
                required
              />
              <span>{o}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {error && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={18} /> {error}
        </div>
      )}
      <div className="spread">
        <span className="small muted">
          {answered} de {questions.length} respondidas
        </span>
        <button type="submit" className="btn btn-lg btn-accent" disabled={pending || answered < questions.length}>
          {pending ? <span className="spinner" /> : <Icon name="check" size={18} />} Entregar avaliação
        </button>
      </div>
    </form>
  );
}
