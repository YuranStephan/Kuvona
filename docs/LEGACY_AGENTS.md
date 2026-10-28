# Academia Kuvona — instructions for Codex and Claude

## ⚡ Active product: `platform/` (since 2026-10-27)

The real MVP is being built in `platform/` (Next.js 16, TypeScript, PostgreSQL/Drizzle, server-side auth, payments and roles). **Before any work, read `platform/docs/STATUS.md`** (stack, run commands, code map, invariants, done/next list) and `platform/AGENTS.md`. The rules below describe the legacy browser demo at the repository root, kept as reference only. Update `platform/docs/STATUS.md` when you finish a task.

## Product and scope

Kuvona is a Portuguese-language learning academy for Mozambique. This repository currently delivers a complete, browser-local product demonstration, not a production LMS. Keep that boundary visible. Payments, identities, admin permissions and certificates are demonstrations. Do not represent localStorage as secure access control or invent production integrations.

## Read first

Read `README.md`, `docs/ARCHITECTURE.md` and `docs/HANDOFF.md` before changing behavior. `CLAUDE.md` points here; maintain one shared set of rules.

## Current stack

- Standards-based HTML, CSS and JavaScript ES modules; Node.js 22+ for the local server and tests.
- No runtime dependencies, bundler, CDN JavaScript or framework installation required.
- `src/data.js`: authored catalog and learning content.
- `src/domain.js`: validation, progression, assessment, payment state machine.
- `src/store.js`: browser persistence, migration and actions.
- `src/app.js`: application rendering and interaction.
- `src/player.js`: optional YouTube IFrame API adapter.
- `src/marketplace.js`: public store, catalog, details, instructor, checkout and purchase views.
- `src/market-data.js`: additional courses and public course metadata.
- `src/marketplace.css`: public styles, separate from the learning workspace.
- `src/styles.css`: responsive design tokens and components.
- `server.mjs`: loopback-only static development server. Never expose workspace files or source notes.

## Invariants

1. Money is integer centavos. Course prices come from the catalog, never an editable checkout amount. Real prices must eventually be resolved on a trusted server.
2. Only the payment transition function grants paid demo enrollments. Confirming the same order twice must be harmless.
3. Pending, failed, cancelled and expired orders never grant enrollment. Refunding revokes enrollment if no other confirmed order supports it.
4. A certificate requires all current course lessons and an assessment score >= 70%. Recheck eligibility when rendering and downloading.
5. Escape all user-authored strings before HTML/SVG interpolation. Allow only validated YouTube IDs; never embed arbitrary URLs or HTML from course editors/imports.
6. Validate imported and persisted data; recover from corrupted/unavailable storage. No PINs, passwords, API secrets or real card details in the browser.
7. Do not obscure YouTube controls/attribution. Public demonstration videos remain publicly accessible. Source attribution belongs next to the player.
8. Admin mode is explicitly a local demo. It is not authentication or authorization.
9. Preserve existing user work. Do not reset browser state, remove courses or delete learning progress without an explicit in-app confirmation.
10. Existing enrollment is preserved during migration from the original prototype; never silently charge a migrated student.
11. The default route is the public storefront. Public cards always open `#course/:id`, including enrolled courses. Buying/free enrollment starts only on that page. A short-lived checkout intent is navigation state, not authorization.
12. Keep storefront and student workspace distinct. Do not move buy buttons onto catalog cards or replace the public entry page with the dashboard.
13. Details include objectives, full curriculum, free first-lesson preview, requirements, audience, instructor profile, project, local course reviews and FAQ.
14. Reviews come from entered local feedback. Never seed fake ratings, student counts, discounts, testimonials or urgency. Reviewers need enrollment and at least one completed lesson.
15. App version is 3; persisted schema stays 2. `catalogRevision: 3` upgrades older catalogs additively while preserving authored edits and learning records.

## Collaboration

Work in bounded tasks. Read `docs/HANDOFF.md`, record the files you change and update outstanding work. Do not have Codex and Claude edit the same file simultaneously. Review each other's diffs, especially domain, payment and restore logic. Never claim Claude has reviewed code unless it actually has.

## Validation

Run `npm test` for changes to domain/store/server behavior and `npm run check` for syntax and import checks. Use a browser for changed user flows where available; check desktop and narrow layouts, keyboard operation and console errors. Test meaningful invariants, not implementation details. Finish by documenting what was actually verified and any remaining limits.

## Production direction

The future production architecture is a modular Next.js/TypeScript application, Supabase Auth/PostgreSQL, server-owned enrollment/payments and a replaceable video provider. It is a separate integration milestone. Follow `docs/ARCHITECTURE.md`; do not graft secret keys or a pretend production gateway into this frontend.
