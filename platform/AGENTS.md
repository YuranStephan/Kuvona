<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Kuvona platform rules

Read `docs/STATUS.md` first: it is the live handoff between Claude and Codex (stack, how to run, code map, invariants, progress and next steps).

- Business rules live in `src/server/` (functions take `db` explicitly). Mutations go through Server Actions in `src/actions/`. UI lives in `src/app/` and `src/components/`.
- Every Server Action re-checks the session and role on the server. Hidden buttons are not security.
- Money is integer centavos; access is granted only by `grantEnrollment()` inside the payment transaction.
- Run `npm run typecheck` and `npm test` before finishing. Changes to payments, enrollment, certificates or access need tests in `tests/`.
- UI copy is European/Mozambican Portuguese. Update `docs/STATUS.md` when you finish a task.

## Regra permanente: capacidade de resposta (pedido do proprietário)

A experiência do aluno vem primeiro e tem de ser **muito boa em qualquer ecrã** (telemóvel de 360–390 px primeiro, depois tablet e computador). Aplica-se a TUDO o que se cria ou altera:

- Desenhar para telemóvel primeiro; sem scroll horizontal; alvos de toque ≥ 44 px; texto legível sem zoom.
- Tabelas largas têm de ter scroll próprio ou virar cartões; formulários em coluna única no telemóvel.
- Sala de aula, checkout, pedidos, catálogo e painel do aluno são prioridade máxima.
- Antes de dar uma tarefa por concluída, abrir as páginas alteradas a 390 px (`MSYS_NO_PATHCONV=1 node scripts/shot.mjs <rota> --mobile`) e a 1440 px.
- Páginas rápidas: não fazer consultas em série quando podem ser paralelas; a base de dados remota tem ~0,3 s por consulta.

## Base de dados remota (Supabase) — lições aprendidas

- O pooler em modo transação (porta 6543) exige `prepare: false` **e** `max_pipeline: 1` no postgres.js (já em `src/server/db/client.ts`). Sem `max_pipeline: 1`, rajadas de consultas ficam presas até ao "statement timeout".
- Migrações usam a ligação direta/sessão (porta 5432); a app usa a 6543.
- `npm run dev` usa o `DATABASE_URL` de `.env.local` (Supabase). `npm run dev:local` usa a base embutida (PGlite), rápida e com contas de teste.
- Na Vercel, pôr as funções em `arn1` (Estocolmo), a mesma região do Supabase: já está em `vercel.json`.
