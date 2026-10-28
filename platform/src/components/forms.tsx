"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/actions/result";
import { Icon } from "./icon";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const StateContext = createContext<ActionState>({});

export function useActionFeedback() {
  return useContext(StateContext);
}

/** A form bound to a server action, with inline success/error feedback and field errors. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  showSuccess = true,
  id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state.at, state.ok, resetOnSuccess]);
  return (
    <StateContext.Provider value={state}>
      <form
        ref={ref}
        action={formAction}
        className={className}
        id={id}
        noValidate={false}
        data-action-ready={ready ? "true" : "false"}
      >
        {children}
        <FormFeedback showSuccess={showSuccess} />
      </form>
    </StateContext.Provider>
  );
}

function FormFeedback({ showSuccess }: { showSuccess: boolean }) {
  const state = useContext(StateContext);
  if (state.error) {
    return (
      <div
        className="alert alert-error form-feedback"
        role="alert"
        key={state.at}
      >
        <Icon name="alert" size={18} />
        <div>{state.error}</div>
      </div>
    );
  }
  if (state.ok && state.message && showSuccess) {
    return (
      <div
        className="alert alert-success form-feedback"
        role="status"
        key={state.at}
      >
        <Icon name="checkCircle" size={18} />
        <div>{state.message}</div>
      </div>
    );
  }
  return null;
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(StateContext);
  const message = state.fieldErrors?.[name];
  return message ? <span className="field-error">{message}</span> : null;
}

export function useFieldInvalid(name: string) {
  return Boolean(useContext(StateContext).fieldErrors?.[name]);
}

export function SubmitButton({
  children,
  className = "btn",
  pendingLabel,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
  formAction?: (form: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      name={name}
      value={value}
      formAction={formAction}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel ?? "A guardar…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * A button that asks for confirmation in a modal before submitting its parent form.
 * The real submit button lives inside the dialog, which is inside the form.
 */
export function ConfirmSubmit({
  label,
  title,
  description,
  confirmLabel = "Confirmar",
  className = "btn btn-danger-outline btn-sm",
  tone = "danger",
  children,
}: {
  label: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  className?: string;
  tone?: "danger" | "primary";
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => ref.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={ref}
        className="modal"
        aria-labelledby={undefined}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="modal-body">
          <h3 className="h3">{title}</h3>
          {description && <div className="muted">{description}</div>}
          {children}
          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => ref.current?.close()}
            >
              Voltar
            </button>
            <SubmitButton
              className={tone === "danger" ? "btn btn-danger" : "btn"}
              pendingLabel="A processar…"
            >
              {confirmLabel}
            </SubmitButton>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function CopyButton({
  value,
  label = "Copiar",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-soft btn-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      aria-live="polite"
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Copiado" : label}
    </button>
  );
}

/** Lines editor for string lists (outcomes, requirements…). Submits one hidden input per non-empty line. */
export function ListInput({
  name,
  initial,
  placeholder,
  max = 12,
}: {
  name: string;
  initial: string[];
  placeholder?: string;
  max?: number;
}) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);
  return (
    <div className="list-input">
      {items.map((item, i) => (
        <div key={i} className="list-input-row">
          <span className="list-input-n">{i + 1}</span>
          <input
            className="input"
            value={item}
            placeholder={placeholder}
            onChange={(e) =>
              setItems(items.map((v, j) => (j === i ? e.target.value : v)))
            }
            aria-label={`${placeholder ?? "Item"} ${i + 1}`}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label="Remover"
            onClick={() =>
              setItems(
                items.length > 1 ? items.filter((_, j) => j !== i) : [""],
              )
            }
          >
            <Icon name="x" size={16} />
          </button>
          {item.trim() && (
            <input type="hidden" name={name} value={item.trim()} />
          )}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          className="btn btn-soft btn-xs"
          onClick={() => setItems([...items, ""])}
          style={{ justifySelf: "start" }}
        >
          <Icon name="plus" size={14} /> Adicionar
        </button>
      )}
    </div>
  );
}

/** Pairs editor (FAQ, resources). Emits `${name}.a` / `${name}.b` hidden inputs in order. */
export function PairsInput({
  name,
  initial,
  labels,
  max = 12,
  bMultiline,
}: {
  name: string;
  initial: [string, string][];
  labels: [string, string];
  max?: number;
  bMultiline?: boolean;
}) {
  const [items, setItems] = useState<[string, string][]>(initial);
  const update = (i: number, k: 0 | 1, v: string) =>
    setItems(
      items.map((p, j) =>
        j === i ? ((k === 0 ? [v, p[1]] : [p[0], v]) as [string, string]) : p,
      ),
    );
  return (
    <div className="pairs-input">
      {items.map((pair, i) => (
        <div key={i} className="pairs-row panel">
          <div
            className="grid"
            style={{ ["--gap" as string]: "10px", flex: 1 }}
          >
            <input
              className="input"
              placeholder={labels[0]}
              aria-label={labels[0]}
              value={pair[0]}
              onChange={(e) => update(i, 0, e.target.value)}
            />
            {bMultiline ? (
              <textarea
                className="textarea"
                style={{ minHeight: 80 }}
                placeholder={labels[1]}
                aria-label={labels[1]}
                value={pair[1]}
                onChange={(e) => update(i, 1, e.target.value)}
              />
            ) : (
              <input
                className="input"
                placeholder={labels[1]}
                aria-label={labels[1]}
                value={pair[1]}
                onChange={(e) => update(i, 1, e.target.value)}
              />
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label="Remover"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            <Icon name="trash" size={16} />
          </button>
          {pair[0].trim() && pair[1].trim() && (
            <>
              <input type="hidden" name={`${name}.a`} value={pair[0].trim()} />
              <input type="hidden" name={`${name}.b`} value={pair[1].trim()} />
            </>
          )}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          className="btn btn-soft btn-xs"
          onClick={() => setItems([...items, ["", ""]])}
          style={{ justifySelf: "start" }}
        >
          <Icon name="plus" size={14} /> Adicionar
        </button>
      )}
    </div>
  );
}
