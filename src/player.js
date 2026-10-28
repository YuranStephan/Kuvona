// The public video remains accessible outside Kuvona. This adapter is not DRM.
let apiPromise;
let player;
let timer;
let generation = 0;
function api() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        apiPromise = null;
        reject(Error("O YouTube não respondeu. Usa o link direto."));
      }, 15000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        resolve(window.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        clearTimeout(timeout);
        apiPromise = null;
        reject(Error("Não foi possível ligar ao YouTube."));
      };
      document.head.append(tag);
    });
  return apiPromise;
}
export function destroyPlayer() {
  generation++;
  clearInterval(timer);
  try {
    player?.destroy();
  } catch {
    /* Page may already have changed. */
  }
  player = null;
}
export async function mountPlayer({
  element,
  video,
  seconds = 0,
  onPosition,
  onEnd,
  onError,
}) {
  destroyPlayer();
  const expected = generation;
  try {
    const YT = await api();
    if (generation !== expected || !element.isConnected) return;
    player = new YT.Player(element, {
      host: "https://www.youtube-nocookie.com",
      videoId: video,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        origin: location.origin,
        start: Math.floor(seconds),
        rel: 0,
      },
      events: {
        onReady: () => {
          timer = setInterval(() => {
            if (player?.getPlayerState?.() === 1)
              onPosition(player.getCurrentTime());
          }, 10000);
        },
        onStateChange: (event) => {
          if (event.data === 2) onPosition(event.target.getCurrentTime());
          if (event.data === 0) {
            onPosition(0);
            onEnd();
          }
        },
        onError: () =>
          onError(
            "Este vídeo não está disponível no leitor. Experimenta abrir no YouTube.",
          ),
      },
    });
  } catch (error) {
    if (generation === expected) onError(error.message);
  }
}
