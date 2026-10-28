const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

/** Accepts a bare 11-character ID or a link on an allowed YouTube host. Anything else → null. */
export function parseYouTubeId(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.hostname.toLowerCase() === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return ID.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return v;
  const [, kind, id] = url.pathname.split("/");
  if (kind && id && ["embed", "shorts", "live", "v"].includes(kind) && ID.test(id)) return id;
  return null;
}

export function youTubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youTubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
