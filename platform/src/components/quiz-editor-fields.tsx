"use client";

import { useEffect, useId, useState } from "react";
import { FieldError, useActionFeedback } from "./forms";
import { Icon } from "./icon";

export function QuizEditorFields({
  question,
}: {
  question?: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}) {
  const id = useId();
  const [options, setOptions] = useState(question?.options ?? ["", "", ""]);
  const [correct, setCorrect] = useState(question?.correctIndex ?? 0);
  const feedback = useActionFeedback();
  useEffect(() => {
    if (feedback.ok && !question) {
      setOptions(["", "", ""]);
      setCorrect(0);
    }
  }, [feedback.at, feedback.ok, question]);
  function remove(index: number) {
    setOptions((all) => all.filter((_, i) => i !== index));
    setCorrect((previous) =>
      previous === index ? 0 : previous > index ? previous - 1 : previous,
    );
  }
  return (
    <>
      <div className="field">
        <label className="label" htmlFor={`${id}-prompt`}>
          Pergunta
        </label>
        <textarea
          className="textarea"
          name="prompt"
          id={`${id}-prompt`}
          defaultValue={question?.prompt ?? ""}
          minLength={5}
          maxLength={500}
          required
        />
        <FieldError name="prompt" />
      </div>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">Respostas possíveis</legend>
        <p className="hint">
          Assinala a resposta correta. Esta informação só é apresentada no
          editor.
        </p>
        {options.map((option, i) => (
          <div className="row" key={i}>
            <label
              className="check"
              title={`Marcar resposta ${i + 1} como correta`}
            >
              <input
                type="radio"
                name="correctIndex"
                value={i}
                checked={correct === i}
                onChange={() => setCorrect(i)}
                required
              />
              <span className="sr-only">Resposta {i + 1} correta</span>
            </label>
            <label className="sr-only" htmlFor={`${id}-option-${i}`}>
              Resposta {i + 1}
            </label>
            <input
              className="input"
              style={{ flex: 1, minWidth: 100 }}
              id={`${id}-option-${i}`}
              name="options"
              value={option}
              onChange={(e) =>
                setOptions((all) =>
                  all.map((v, n) => (n === i ? e.target.value : v)),
                )
              }
              required
              maxLength={200}
              placeholder={`Resposta ${i + 1}`}
            />
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              aria-label={`Remover resposta ${i + 1}`}
              disabled={options.length <= 2}
              onClick={() => remove(i)}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
        <FieldError name="options" />
        <FieldError name="correctIndex" />
        {options.length < 6 && (
          <button
            className="btn btn-soft btn-sm"
            type="button"
            onClick={() => setOptions((all) => [...all, ""])}
          >
            <Icon name="plus" size={16} /> Adicionar resposta
          </button>
        )}
      </fieldset>
      <div className="field">
        <label className="label" htmlFor={`${id}-explanation`}>
          Explicação após a avaliação
        </label>
        <textarea
          className="textarea"
          name="explanation"
          id={`${id}-explanation`}
          defaultValue={question?.explanation ?? ""}
          maxLength={600}
        />
      </div>
    </>
  );
}
