import { courseImage } from "@/lib/course-images";

// Hosted course photography, with deterministic capulana patterns for courses without a photo.

const palettes = [
  { bg: "#0E5E57", a: "#F2A83B", b: "#F6F1E7", c: "#E0512B" },
  { bg: "#E0512B", a: "#16130E", b: "#F6F1E7", c: "#F2A83B" },
  { bg: "#2A3278", a: "#F2A83B", b: "#F6F1E7", c: "#E0512B" },
  { bg: "#16130E", a: "#E0512B", b: "#F2A83B", c: "#F6F1E7" },
  { bg: "#F2A83B", a: "#16130E", b: "#0E5E57", c: "#F6F1E7" },
  { bg: "#4F7F2F", a: "#F6F1E7", b: "#F2A83B", c: "#16130E" },
  { bg: "#8A2E1A", a: "#F2A83B", b: "#F6F1E7", c: "#0E5E57" },
  { bg: "#F6F1E7", a: "#E0512B", b: "#0E5E57", c: "#16130E" },
] as const;

type Palette = (typeof palettes)[number];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Motif({ kind, p, id }: { kind: number; p: Palette; id: string }) {
  switch (kind) {
    case 0: // sóis — concentric suns on an offset grid
      return (
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <circle cx="28" cy="28" r="22" fill={p.a} />
          <circle cx="28" cy="28" r="15" fill={p.bg} />
          <circle cx="28" cy="28" r="8" fill={p.b} />
          <circle cx="0" cy="0" r="6" fill={p.c} />
          <circle cx="56" cy="0" r="6" fill={p.c} />
          <circle cx="0" cy="56" r="6" fill={p.c} />
          <circle cx="56" cy="56" r="6" fill={p.c} />
        </pattern>
      );
    case 1: // losangos — diamond lattice
      return (
        <pattern id={id} width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M22 2 42 22 22 42 2 22Z" fill={p.a} />
          <path d="M22 11 33 22 22 33 11 22Z" fill={p.bg} />
          <path d="M22 17 27 22 22 27 17 22Z" fill={p.b} />
          <circle cx="0" cy="0" r="3.5" fill={p.c} />
          <circle cx="44" cy="44" r="3.5" fill={p.c} />
          <circle cx="44" cy="0" r="3.5" fill={p.c} />
          <circle cx="0" cy="44" r="3.5" fill={p.c} />
        </pattern>
      );
    case 2: // ondas — wave bands with dots
      return (
        <pattern id={id} width="60" height="34" patternUnits="userSpaceOnUse">
          <path
            d="M0 17c10-12 20-12 30 0s20 12 30 0"
            stroke={p.a}
            strokeWidth="7"
            fill="none"
          />
          <path
            d="M0 17c10-12 20-12 30 0s20 12 30 0"
            stroke={p.b}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="15" cy="30" r="2.5" fill={p.c} />
          <circle cx="45" cy="4" r="2.5" fill={p.c} />
        </pattern>
      );
    case 3: // folhas — quarter-circle petals
      return (
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M0 0a24 24 0 0 1 24 24A24 24 0 0 1 0 0Z" fill={p.a} />
          <path d="M48 0a24 24 0 0 0-24 24A24 24 0 0 0 48 0Z" fill={p.b} />
          <path d="M0 48a24 24 0 0 0 24-24A24 24 0 0 0 0 48Z" fill={p.b} />
          <path d="M48 48a24 24 0 0 1-24-24 24 24 0 0 1 24 24Z" fill={p.a} />
          <circle cx="24" cy="24" r="5" fill={p.c} />
        </pattern>
      );
    case 4: // tabuleiro — checks with rings
      return (
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={p.a} />
          <rect x="20" y="20" width="20" height="20" fill={p.a} />
          <circle
            cx="30"
            cy="10"
            r="6"
            fill="none"
            stroke={p.b}
            strokeWidth="3"
          />
          <circle
            cx="10"
            cy="30"
            r="6"
            fill="none"
            stroke={p.c}
            strokeWidth="3"
          />
        </pattern>
      );
    case 5: // chevrons
      return (
        <pattern id={id} width="36" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 4 18 18 36 4" stroke={p.a} strokeWidth="6" fill="none" />
          <path
            d="M0 18 18 32 36 18"
            stroke={p.b}
            strokeWidth="3"
            fill="none"
          />
          <circle cx="18" cy="6" r="2.5" fill={p.c} />
        </pattern>
      );
    default: // escamas — scallops
      return (
        <pattern id={id} width="40" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 24a20 20 0 0 1 40 0" fill={p.a} />
          <path d="M8 24a12 12 0 0 1 24 0" fill={p.bg} />
          <path d="M14 24a6 6 0 0 1 12 0" fill={p.b} />
          <path
            d="M-20 12a20 20 0 0 1 40 0M20 12a20 20 0 0 1 40 0"
            fill="none"
            stroke={p.c}
            strokeWidth="2"
          />
        </pattern>
      );
  }
}

/** Decorative artwork. Pass `label` to render the course title on the cover (featured layouts). */
export function CourseCover({
  seed,
  title,
  label,
  className,
  rounded = true,
}: {
  seed: number;
  title: string;
  label?: string;
  className?: string;
  rounded?: boolean;
}) {
  const photo = courseImage(seed);
  if (photo)
    return (
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className={className}
        role="img"
        aria-label={`${title}: ${photo.alt}`}
        style={{ borderRadius: rounded ? "inherit" : 0, background: "#e9e4d8" }}
      >
        <image
          href={photo.src}
          width="400"
          height="250"
          preserveAspectRatio="xMidYMid slice"
        />
        {label && (
          <>
            <rect
              y="155"
              width="400"
              height="95"
              fill="#16130e"
              opacity="0.8"
            />
            <foreignObject x="22" y="168" width="356" height="72">
              <div
                style={{
                  color: "#fffdf8",
                  fontFamily: "var(--font-display)",
                  fontSize: 25,
                  lineHeight: 1.12,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            </foreignObject>
          </>
        )}
      </svg>
    );
  const r = rng(seed);
  const p = palettes[Math.floor(r() * palettes.length)]!;
  const kind = Math.floor(r() * 7);
  const rot = [0, 15, 30, 45, -20][Math.floor(r() * 5)]!;
  const scale = 0.8 + r() * 0.6;
  const id = `cv-${seed}-${kind}`;
  const sunX = 60 + r() * 280;
  const sunY = 40 + r() * 170;
  const band = r() > 0.5;
  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`Capa do curso ${title}`}
      style={{ borderRadius: rounded ? "inherit" : 0, background: p.bg }}
    >
      <defs>
        <Motif kind={kind} p={p} id={id} />
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={label ? 0.55 : 0.18} />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill={p.bg} />
      <g transform={`rotate(${rot} 200 125) scale(${scale})`} opacity="0.95">
        <rect
          x="-400"
          y="-400"
          width="1600"
          height="1100"
          fill={`url(#${id})`}
        />
      </g>
      {band ? (
        <rect
          x="0"
          y="168"
          width="400"
          height="26"
          fill={p.bg}
          opacity="0.92"
        />
      ) : (
        <circle cx={sunX} cy={sunY} r="58" fill={p.bg} opacity="0.9" />
      )}
      {!band && <circle cx={sunX} cy={sunY} r="40" fill={p.c} opacity="0.95" />}
      <rect width="400" height="250" fill={`url(#${id}-shade)`} />
      {label && (
        <foreignObject x="22" y="120" width="356" height="116">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              height: "100%",
              fontFamily: "var(--font-display)",
              fontSize: 27,
              lineHeight: 1.05,
              fontWeight: 560,
              color: "#fffdf8",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 12px rgba(0,0,0,.35)",
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

export function Logo({
  size = 30,
  withWord = true,
  tone = "ink",
}: {
  size?: number;
  withWord?: boolean;
  tone?: "ink" | "paper";
}) {
  const fg = tone === "ink" ? "#16130E" : "#F6F1E7";
  return (
    <span
      className="logo"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: fg,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M2 20C7 10 13 6 20 6s13 4 18 14c-5 10-11 14-18 14S7 30 2 20Z"
          fill="#E0512B"
        />
        <circle cx="20" cy="20" r="9" fill="#F2A83B" />
        <circle
          cx="20"
          cy="20"
          r="4.2"
          fill={tone === "ink" ? "#16130E" : "#16130E"}
        />
        <path
          d="M2 20C7 10 13 6 20 6s13 4 18 14"
          fill="none"
          stroke={fg}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      {withWord && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size * 0.82,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Kuvona
        </span>
      )}
    </span>
  );
}
