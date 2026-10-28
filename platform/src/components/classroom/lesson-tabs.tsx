"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { saveNoteAction } from "@/actions/learning";
import { Icon, type IconName } from "@/components/icon";

type Tab = { id: string; label: string; icon: IconName; count?: number; content: ReactNode };

export function LessonTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="stack" style={{ ["--gap" as string]: "22px" }}>
      <div className="cl-tabs" role="tablist" aria-label="Conteúdo da aula">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={active === t.id} aria-controls={`panel-${t.id}`} onClick={() => setActive(t.id)}>
            <Icon name={t.icon} size={17} /> {t.label}
            {t.count ? <span className="count">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

/** Personal notes, saved automatically to the student's account. */
export function NoteEditor({ lessonId, initial, updatedAt }: { lessonId: string; initial: string; updatedAt: string | null }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string>(updatedAt ? `Guardado ${new Date(updatedAt).toLocaleString("pt-PT")}` : "As notas são privadas e ficam na tua conta.");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onChange(next: string) {
    setValue(next);
    latest.current = next;
    setStatus("A escrever…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("A guardar…");
      const result = await saveNoteAction(lessonId, latest.current);
      setStatus(result.ok ? `Guardado às ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : "Não foi possível guardar. Verifica a ligação.");
    }, 900);
  }

  return (
    <div className="stack" style={{ ["--gap" as string]: "8px" }}>
      <label className="label" htmlFor={`note-${lessonId}`}>
        As minhas notas desta aula
      </label>
      <textarea
        id={`note-${lessonId}`}
        className="textarea"
        style={{ minHeight: 220 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreve ideias, dúvidas e o que queres rever…"
        maxLength={20000}
      />
      <div className="spread">
        <span className="note-status" aria-live="polite">
          {status}
        </span>
        <button
          type="button"
          className="btn btn-soft btn-xs"
          onClick={() => {
            const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "notas-kuvona.txt";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          disabled={!value.trim()}
        >
          <Icon name="download" size={14} /> Exportar
        </button>
      </div>
    </div>
  );
}
