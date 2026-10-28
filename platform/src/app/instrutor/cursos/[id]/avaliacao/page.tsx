import { deleteQuestionAction, saveQuestionAction } from "@/actions/studio";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { QuizEditorFields } from "@/components/quiz-editor-fields";
import { Notice } from "@/components/ui";
import { loadEditor } from "../editor";

export default async function AssessmentEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, questions } = await loadEditor(id);
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <Notice>
        A avaliação é corrigida no servidor. Quando há perguntas, o certificado
        exige todas as aulas concluídas e uma nota de pelo menos 70%. Sem
        avaliação, a conclusão de todas as aulas é suficiente.
      </Notice>
      {questions.map((q, i) => (
        <section className="form-section" key={q.id}>
          <h2>Pergunta {i + 1}</h2>
          <ActionForm
            action={saveQuestionAction.bind(null, course.id, q.id)}
            className="stack"
          >
            <QuizEditorFields key={JSON.stringify(q)} question={q} />
            <SubmitButton>Guardar pergunta</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteQuestionAction.bind(null, course.id, q.id)}>
            <ConfirmSubmit
              label="Apagar pergunta"
              title={`Apagar a pergunta ${i + 1}?`}
              description="As tentativas já realizadas pelos estudantes ficam guardadas."
              confirmLabel="Apagar pergunta"
            />
          </ActionForm>
        </section>
      ))}
      <section className="form-section">
        <h2>Nova pergunta</h2>
        <ActionForm
          action={saveQuestionAction.bind(null, course.id, null)}
          resetOnSuccess
          className="stack"
        >
          <QuizEditorFields />
          <SubmitButton>Adicionar pergunta</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
