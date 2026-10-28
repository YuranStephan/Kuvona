"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { progressAction } from "@/actions/learning";
import { Icon } from "@/components/icon";

type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2 };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube indisponível"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const HEARTBEAT_MS = 15_000;

/**
 * YouTube player that loads only on demand (saves mobile data), keeps YouTube's own controls and
 * attribution, and reports the student's position to the server for resume + completion.
 */
export function LessonPlayer({ lessonId, videoId, startAt, track = true }: { lessonId: string; videoId: string; startAt: number; track?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const completed = useRef(false);

  const report = (ended = false) => {
    const p = player.current;
    if (!p || !track) return;
    const position = ended ? p.getDuration() : p.getCurrentTime();
    void progressAction({ lessonId, position, duration: p.getDuration(), ended }).then((r) => {
      if (r.completed && !completed.current) {
        completed.current = true;
        router.refresh();
      }
    });
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      report();
      player.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function start() {
    setState("loading");
    try {
      const YT = await loadApi();
      if (!mount.current) return;
      player.current = new YT.Player(mount.current, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { autoplay: 1, start: Math.max(0, Math.floor(startAt)), rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => setState("ready"),
          onError: () => setState("error"),
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (!timer.current) timer.current = setInterval(() => report(), HEARTBEAT_MS);
            } else {
              if (timer.current) clearInterval(timer.current);
              timer.current = null;
              if (e.data === YT.PlayerState.PAUSED) report();
              if (e.data === YT.PlayerState.ENDED) report(true);
            }
          },
        },
      });
    } catch {
      setState("error");
    }
  }

  return (
    <div className="player">
      <div ref={mount} />
      {state !== "ready" && (
        <button type="button" className="player-poster" onClick={start} disabled={state === "loading"} aria-label="Reproduzir o vídeo da aula">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" />
          <span className="inner">
            {state === "error" ? (
              <>
                <Icon name="alert" size={36} />
                <strong>Não foi possível carregar o vídeo.</strong>
                <span className="small">Verifica a ligação à internet ou abre diretamente no YouTube.</span>
              </>
            ) : (
              <>
                <span className="play-dot">{state === "loading" ? <span className="spinner" style={{ width: 28, height: 28 }} /> : <Icon name="play" size={34} fill="currentColor" />}</span>
                <strong>{startAt > 5 ? "Continuar a ver" : "Ver a aula"}</strong>
                <span className="small" style={{ opacity: 0.75 }}>
                  O vídeo só carrega quando carregas — poupa os teus dados.
                </span>
              </>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
