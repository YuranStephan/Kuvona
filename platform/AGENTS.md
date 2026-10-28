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
