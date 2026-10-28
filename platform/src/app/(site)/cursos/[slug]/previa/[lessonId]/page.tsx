import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/classroom/player";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { getDb } from "@/server/db/client";
import { getPreviewLesson } from "@/server/catalog/queries";
import { youTubeWatchUrl } from "@/lib/youtube";

export const metadata: Metadata = { title: "Aula gratuita" };

export default async function PreviewPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const preview = await getPreviewLesson(await getDb(), slug, lessonId);
  if (!preview) notFound();
  const { lesson } = preview;
  return (
    <div className="classroom" style={{ minHeight: "auto", paddingBlock: "clamp(24px, 4vw, 48px)" }}>
      <div className="container-narrow stack" style={{ ["--gap" as string]: "22px", maxWidth: 960 }}>
        <Link href={`/cursos/${slug}`} className="row small" style={{ ["--gap" as string]: "6px", color: "var(--saffron)", textDecoration: "none" }}>
          <Icon name="arrowLeft" size={16} /> {preview.courseTitle}
        </Link>
        <span className="badge badge-teal" style={{ justifySelf: "start" }}>
          Aula de pré-visualização gratuita
        </span>
        <h1 className="h1" style={{ color: "#fffdf8" }}>
          {lesson.title}
        </h1>
        {lesson.youtubeVideoId && (
          <div className="stack" style={{ ["--gap" as string]: "8px" }}>
            <LessonPlayer lessonId={lesson.id} videoId={lesson.youtubeVideoId} startAt={0} track={false} />
            <div className="player-meta">
              <span>Vídeo{lesson.videoSource ? `: ${lesson.videoSource}` : ""} · alojado no YouTube</span>
              <a href={youTubeWatchUrl(lesson.youtubeVideoId)} target="_blank" rel="noopener noreferrer">
                Abrir no YouTube
              </a>
            </div>
          </div>
        )}
        {lesson.body && <Markdown text={lesson.body} />}
        <div className="cl-task">
          <strong style={{ color: "var(--saffron)" }}>Gostaste?</strong>
          <p>O curso completo inclui todas as aulas, exercícios, perguntas ao instrutor e certificado.</p>
          <div>
            <Link href={`/cursos/${slug}`} className="btn btn-accent">
              Ver o curso completo <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
