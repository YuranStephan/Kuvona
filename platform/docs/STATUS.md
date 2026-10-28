# Kuvona platform — live build status (Claude ↔ Codex handoff)

**Read this first if you are continuing the build.** Claude updates this file as work progresses so another
assistant (Codex) can pick up at any point. Last update: 2026-10-27, Claude (Opus 5.5).

## What this is

`platform/` is the new **real MVP** requested in `docs/PRODUCT_DIRECTION_2026-10-27.md` (KV-DIR-20261027-01):
real accounts, server-side data, server-enforced roles, payment verification + enrollment fulfilment, and a full
visual redesign. The owner explicitly asked to build it "do zero" (from scratch). The old browser-only demo at the
repository root (`src/`, `index.html`, `server.mjs`) is **untouched** and stays as legacy reference.

## Stack (decided in this build)

| Concern | Choice |
|---|---|
| App | Next.js **16.4** App Router + React 19 + TypeScript strict (read `node_modules/next/dist/docs/` — APIs differ from older Next) |
| DB | PostgreSQL via **Drizzle ORM**. Locally: **PGlite** (embedded Postgres, files in `.data/pglite`). Production: any Postgres (Supabase) via `DATABASE_URL` |
| Auth | Own session auth: scrypt hashes, HttpOnly cookie `kv_session`, only SHA-256 of token stored, login rate limit, one-time reset/verify tokens |
| Email | Outbox table always; Resend API when `RESEND_API_KEY` is set |
| Payments | `manual_mpesa` / `manual_emola` (student pays academy wallet → submits transaction ID → admin confirms against statement) + `sandbox` (local only, signed webhook path). No fake gateway. |
| Video | YouTube IDs only (owner accepted ToS risk, see memory/int.txt). Paid video IDs never sent to non-enrolled users. |
| Tests | Vitest against in-memory PGlite (real Postgres constraints) — `npm test` |

## How to run

```powershell
cd platform
npm install          # first time only
npm run dev          # http://localhost:3100  (port 3000 is used by another project on this PC)
npm test             # 44 tests: payments, access, auth
npm run typecheck
node scripts/shot.mjs /cursos --mobile   # screenshots into .qa/ (set MSYS_NO_PATHCONV=1 in Git Bash)
```

First start creates the local DB and seeds 8 courses / 25 lessons (from the old demo content) and test accounts
(shown on `/entrar` in local mode only):

| Role | Email | Password |
|---|---|---|
| Gestão (admin) | gestao@kuvona.local | Kuvona-gestao-2026 |
| Instrutor | equipa@kuvona.local | Kuvona-instrutor-2026 |
| Instrutor | curadoria@kuvona.local | Kuvona-curadoria-2026 |
| Estudante | estudante@kuvona.local | Kuvona-estudante-2026 |

Reset local data: stop the server, then `npm run db:reset -- --yes`. **Never open the same `.data/pglite` from two
processes** (dev server + script) at once.

## Code map

```
platform/
  drizzle/                     SQL migrations (0000 schema, 0001 append-only triggers on payment_events/audit_events)
  scripts/db.ts                migrate | seed | reset | create-admin
  scripts/shot.mjs             visual QA screenshots with local Chrome
  src/server/                  ALL business rules (no React). Every function takes `db` explicitly → testable.
    db/schema.ts               25 tables + constraints (unique open order per course, unique provider_reference, CHECKs)
    db/client.ts               getDb(): PGlite locally (auto-migrate + seed) or postgres-js with DATABASE_URL
    auth/{service,session,password,tokens}.ts
    payments/{state,orders,providers,sandbox,notifications}.ts   ← money. Review carefully.
    enrollment/service.ts      grantEnrollment() is the ONLY way to give access
    catalog/{queries,editor}.ts  public catalog + instructor/admin editor with ownership checks
    learning/{progress,quiz,community}.ts  progress heartbeat, server-graded quiz, Q&A, reviews, instructor applications
    certificates/service.ts    eligibility rechecked every time; public verification by code
    analytics/service.ts       admin + instructor metrics (sandbox excluded from revenue)
    admin/users.ts             roles, disable, manual grant/revoke
    settings.ts                payment wallets, school info (admin-editable)
  src/actions/*.ts             Server Actions ("use server"): auth, commerce, learning, studio, admin
  src/components/              icon, cover (generated capulana covers), ui, forms (client), markdown, course-card, site-chrome
  src/styles/                  base.css (tokens), site.css, studio.css, classroom.css
  src/app/                     routes (see progress below)
  tests/                       payments.test.ts, access.test.ts, auth.test.ts
```

## Invariants (do not break)

1. Money = integer centavos. Order amount is snapshotted from `courses.price_cents` on the server.
2. Access is granted only by `grantEnrollment()`, inside the same transaction that marks an order `paid`.
3. `pending / awaiting_verification / failed / cancelled / expired` never grant access. `awaiting_verification` never auto-expires.
4. A wallet transaction ID can back only one order (DB unique). Confirm twice = no-op.
5. Refund revokes purchase access (unless another paid order or staff grant) + revokes certificate; progress is kept.
6. `payment_events` and `audit_events` are append-only (DB trigger).
7. Every Server Action re-checks the session/role (`requireUser`/`requireRole`) — never trust hidden UI.
8. Paid lesson video IDs and lesson bodies are never returned by public queries (`publicOutline`).
9. Quiz answer keys never leave the server before an attempt. Certificate needs all lessons + best score ≥ 70%.
10. No fake ratings/student counts. Reviews need active enrollment + ≥1 completed lesson.
11. Sandbox payments only in local mode (no `DATABASE_URL`) or with `KUVONA_ENABLE_SANDBOX=1`.


### 🌐 Estado da infraestrutura (28/10/2026)
- **Supabase** (eu-north-1) ligado via `.env.local` (não versionado): 25 tabelas, 8 cursos, 25 aulas (24 com vídeo real), 1 conta de gestão do proprietário.
- **Git**: repositório local em `main` com o primeiro commit. Falta criar o repositório remoto no GitHub (conta YuranStephan) e fazer `git remote add origin <url> && git push -u origin main`.
- **Vercel**: Root Directory `platform`, região `arn1` (em `vercel.json`), variáveis em `docs/DEPLOY.md`.
- **Regra permanente**: capacidade de resposta máxima em tudo (ver `AGENTS.md`).

## Progress

### Done ✅
- Server layer complete (all modules above), typecheck clean, **44/44 tests passing**.
- Design system (base.css/site.css/classroom.css/studio.css), generated covers, logo, icons, form components.
- Public: `/` home, `/cursos` catalog, `/cursos/[slug]` details, `/cursos/[slug]/previa/[lessonId]` free preview.
- Auth: `/entrar` (shows test accounts locally), `/registar`, `/recuperar`, `/redefinir/[token]`, `/verificar-email/[token]`.
- Commerce: `/checkout/[slug]`, `/pedidos/[reference]` (manual M-Pesa/e-Mola + sandbox simulator, auto-refresh), `/pedidos`.
- Student: `/aprender` dashboard. Classroom (`src/app/(classroom)/aprender/[slug]/…`): resume redirect, lesson player (YouTube on click + progress heartbeat), notes autosave, lesson Q&A, materials, complete/next; `/avaliacao` (server-graded quiz + certificate), `/perguntas`.
- Certificates: `/certificado/[code]` (printable A4), `/verificar`, `/verificar/[code]`.
- Admin: layout with badges, `/admin` overview (KPIs, 30-day revenue chart, sales, course performance), `/admin/pagamentos` queue, `/admin/pagamentos/[id]` (confirm/reject/refund + immutable ledger).
- Floating WhatsApp button (`components/whatsapp-button.tsx`), number in settings `school.whatsapp` (shown in local mode even if empty).
- **E2E passes** (`npm run test:e2e` with dev server running): register → free course → classroom → M-Pesa order → submit ID → admin confirms → access → lessons → quiz.

### Delegated to Codex 🤝 — see `docs/CODEX_TASKS.md`
C1 legal/about pages · C2 instructor public profile + `/ensinar` · C3 `/conta` + `/desejos` · C4 404/error/sem-acesso · C5 `abrir.bat` launcher · C6 `docs/DEPLOY.md`.

### ⚠️ HANDOFF: Claude paused (credits). Codex owns everything now → follow C7–C11 in `docs/CODEX_TASKS.md`.
Also done since the list below was written: all admin pages (cursos, utilizadores + detalhe, candidaturas, avaliações, emails, auditoria, definições incl. WhatsApp + parceiros), discreet WhatsApp button, partner strip (demo-flagged), instructor layout + dashboard + course list + editor "Detalhes" tab.

### Claude next (superseded by CODEX_TASKS C7–C11) ⏳
1. Admin: cursos (review queue, publish/request changes, feature, archive), utilizadores (+ detail: role, disable, grant/revoke), candidaturas, avaliações (hide/show), emails outbox, auditoria, definições (wallets, school + WhatsApp, categories).
2. Instructor studio `/instrutor`: dashboard, courses list + create, editor (details, curriculum, lesson edit with YouTube preview, quiz, students + funnel, publication), Q&A inbox.
3. Route handler `src/app/api/payments/webhooks/sandbox/route.ts` → `processSandboxWebhook`.
4. Mobile QA pass, then production build check (`npm run build`).

### Later (owner request)
- WhatsApp support agent: an AI agent answering customers on the academy WhatsApp number (WhatsApp Business API webhook → agent backend with access to catalog/order status). The floating button already points to the configured number, so no UI change is needed when the agent goes live.

### Open business decisions (owner)
Payment gateway contract (PaySuite etc.), real wallet numbers (Gestão → Definições), refund policy text, NUIT/invoicing,
legal pages review, instructor revenue share (not built), publication policy (currently: instructor submits → admin publishes).

## Conventions
- UI copy in European/Mozambican Portuguese ("telemóvel", "registo"). Code/comments in English.
- Pages are Server Components; use `getDb()` + server modules directly. Mutations only through `src/actions/*`.
- Action pattern: `(boundArgs…, prevState: ActionState, form: FormData) => Promise<ActionState>`, wrap with `<ActionForm>`.
- After mutations: `revalidatePath("/", "layout")`. Redirects go **outside** try/catch.
- Raw SQL results: always wrap with `rowsOf()` (PGlite returns `{rows}`, postgres-js returns an array).

### Partner logos and motion — Codex, 2026-10-27
- Replaced demo text marks with locally hosted real brand assets for all eight seeded brands; asset provenance in public/partners/SOURCES.md. Removed failed HTML-as-SVG downloads.
- Continuous CSS marquee with pause/resume, hover pause, accessible duplicate handling and reduced-motion static layout. Unknown admin-entered names retain a text fallback. Demo disclaimer and empty production defaults retained; WhatsApp remains configured in Gestão → Definições.
- Follow-up: removed logo card backgrounds at owner request; multiply blending removes white raster backdrops, and light logo variants use a dark filter for legibility. Typecheck and 44 tests passed before this styling follow-up.
