# Tarefas para o Codex (em paralelo com o Claude)

Criado pelo Claude em 2026-10-27 a pedido do proprietário, para acelerar o MVP. **Lê primeiro `docs/STATUS.md` e `AGENTS.md`** (nesta pasta `platform/`).

## Regra de ouro: ficheiros separados

Para nunca editarmos o mesmo ficheiro ao mesmo tempo:

| Quem | Pode criar/editar |
|---|---|
| **Codex** | só os ficheiros listados nas tarefas abaixo (todos novos), mais `docs/STATUS.md` (apenas a secção "Progress" das tuas tarefas) |
| **Claude** | `src/server/**`, `src/actions/**`, `src/styles/**`, `src/components/**`, `src/app/admin/**`, `src/app/instrutor/**`, `src/app/(classroom)/**`, testes |

Se precisares de mudar um ficheiro do Claude (ex.: um estilo novo em `site.css` ou uma função no servidor), **não edites**: escreve o pedido no fim deste ficheiro em "Pedidos ao Claude". Para estilos de página, podes usar um ficheiro CSS teu (`src/styles/pages.css`) e pedir ao Claude para o importar no layout raiz.

Usa só componentes e funções que já existem (`@/components/ui`, `@/components/forms`, `@/components/icon`, `@/components/course-card`, `@/server/catalog/queries`, `@/actions/*`). Antes de terminar: `npm run typecheck` e `npm test` têm de passar, e abre as páginas em http://localhost:3100.

---

## C1 · Páginas institucionais e legais (Server Components simples)

Ficheiros novos:
- `src/app/(site)/sobre/page.tsx` — sobre a Kuvona (missão: cursos práticos em português para Moçambique; "Kuvona" = ver), secção `id="apoio"` com email/telefone/WhatsApp de `getSetting(db, "school")`.
- `src/app/(site)/termos/page.tsx`, `src/app/(site)/privacidade/page.tsx`, `src/app/(site)/reembolsos/page.tsx` — texto claro em português. **No topo de cada um:** `<div className="legal-draft">Rascunho — rever com um jurista antes de aceitar pagamentos reais.</div>`. Reembolsos deve refletir o comportamento real: reembolso registado pela gestão → acesso termina, progresso guardado, certificado revogado. Não prometer prazos que não foram decididos (escrever "[prazo a definir]").

Estilo: `container-narrow section`, `eyebrow`, `display-2`, `prose` (já existem).

## C2 · Perfil público do instrutor e página "Ensinar"

- `src/app/(site)/instrutores/[id]/page.tsx` — usar `getInstructorProfile(db, id)` de `@/server/catalog/queries` (devolve `instructor`, `courses`, `stats`; `null` → `notFound()`). Mostrar `Avatar`, nome, headline, bio, estatísticas e grelha `CourseCard`.
- `src/app/(site)/ensinar/page.tsx` — página de venda para instrutores + formulário de candidatura com `<ActionForm action={applyInstructorAction}>` (campos `expertise`, `motivation` (textarea, ≥40 caracteres), `links`). Sem sessão → botão para `/entrar?next=/ensinar`. Se já é instrutor → link para `/instrutor`. Mostrar o estado da última candidatura com `myApplication(db, user.id)` de `@/server/learning/community`.

## C3 · Conta do estudante e lista de desejos

- `src/app/(site)/conta/page.tsx` — `requireUserPage("/conta")`. Três cartões: Perfil (`updateProfileAction`: name, headline, bio), Segurança (`changePasswordAction`: current, password, confirm), Email (estado de confirmação + `resendVerificationAction` quando não confirmado). Ler valores atuais com uma query simples a `users` pelo `user.id`.
- `src/app/(site)/desejos/page.tsx` — `listWishlist(db, user.id)` → grelha de `CourseCard`; estado vazio com `EmptyState`.

## C4 · Páginas de sistema

- `src/app/not-found.tsx` (404 bonito com link para `/cursos`), `src/app/error.tsx` (`"use client"`, botão "Tentar novamente" com `reset()`), `src/app/(site)/sem-acesso/page.tsx` (403: "Não tens permissão para esta área").

## C5 · Arranque com dois cliques (`abrir.bat` na raiz)

Atualizar **`abrir.bat` na raiz do repositório** e criar `platform/scripts/launch.mjs` que:
1. Verifica Node ≥ 22.
2. Se `platform/node_modules` não existir → `npm install` (dentro de `platform/`).
3. Se `platform/.next/BUILD_ID` não existir ou for mais antigo que os ficheiros em `src/` → `npm run build`.
4. Corre `npm start` (porta 3100) e abre o navegador em http://localhost:3100 quando responder.
Manter a demo antiga acessível com um `abrir-demo-antiga.bat` que corre o fluxo anterior (`node scripts/open.mjs` na raiz).
**Atenção:** nunca abrir `.data/pglite` com dois processos ao mesmo tempo.

## C6 · Documento de publicação (Vercel + Supabase)

`docs/DEPLOY.md`: criar projeto Supabase → connection string do pooler (porta 6543) em `DATABASE_URL`; na Vercel: Root Directory = `platform`, variáveis `DATABASE_URL`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `PAYMENT_WEBHOOK_SECRET`; build command `npm run db:migrate && npm run build`; depois `npm run create-admin -- email "Nome"` localmente com o `DATABASE_URL` de produção; configurar números M-Pesa/e-Mola e WhatsApp em Gestão → Definições. Lista de verificação antes de aceitar dinheiro real (copiar de `../docs/ARCHITECTURE.md` "Critérios antes de aceitar dinheiro real").

---

## Pedidos ao Claude

(Codex: escreve aqui o que precisas que o Claude mude em ficheiros dele.)

**Claude → Codex (2026-10-27):** ok para alterares `src/components/cover.tsx` (imagens com fallback SVG). Não o estou a editar.

---

## 🔁 PASSAGEM TOTAL — Claude saiu (créditos). Codex é agora dono de TODOS os ficheiros.

Estado no momento da saída: `npm run typecheck` limpo, `npm test` 44/44, `npm run test:e2e` passa (com `npm run dev` ativo). Ver `docs/STATUS.md`.

**Princípio do proprietário: a gestão tem de ter autonomia total.** Tudo o que é conteúdo ou configuração deve ser editável em `/admin` (nada fixo no código). Já configurável em Gestão → Definições: números M-Pesa/e-Mola, prazo de pagamento, dados da academia, NUIT, WhatsApp + mensagem, parceiros (com marca “demo pitch”), categorias. Cursos/aulas/avaliações: editor do instrutor (a gestão acede a todos).

### C7 · Terminar o editor de cursos (prioridade máxima)
Já existem: `src/app/instrutor/cursos/[id]/{editor.ts,layout.tsx,page.tsx}` (Detalhes). Todas as Server Actions já existem em `src/actions/studio.ts`/`admin.ts`. Faltam as páginas (usar `loadEditor(id)` de `./editor`):
- `curriculo/page.tsx` — `outline` em `.module-card` / `.lesson-item` (CSS em `studio.css`). Por módulo: renomear (`renameModuleAction`), subir/descer (`moveModuleAction(id,"up"|"down")` em `<form action>`), apagar (`deleteModuleAction` com `ConfirmSubmit`), adicionar aula (`addLessonAction`). Por aula: link para editar, ícone vídeo/texto, badge pré-visualização, duração, subir/descer (`moveLessonAction`). No fim: adicionar módulo (`addModuleAction`).
- `aulas/[lessonId]/page.tsx` — formulário `updateLessonAction` (title, summary, youtubeUrl, videoSource, durationMinutes, isPreview, body [markdown simples: ##, -, **], task, resources via `<PairsInput name="resources" labels={["Título","https://…"]}>`). Pré-visualização da miniatura YouTube (`.yt-preview`, `youTubeThumbnail`). Botão apagar: `deleteLessonAction(lessonId, courseId)`.
- `avaliacao/page.tsx` — lista `questions`; cada uma editável com `saveQuestionAction(courseId, questionId)` (prompt, `options` via `ListInput name="options"`, `correctIndex` select, explanation) e `deleteQuestionAction`; formulário novo com `saveQuestionAction(courseId, null)`.
- `estudantes/page.tsx` — `courseStudents(db, id)` (tabela: progresso com `<Progress>`, última atividade, melhor nota, certificado) + `lessonFunnel(db, id)` em `.hbars`.
- `publicacao/page.tsx` — mostrar `problems` (checklist `.checklist`), `submitForReviewAction` / `withdrawFromReviewAction`; se admin: `publishCourseAction`, `requestChangesAction`, `reassignInstructorAction`.

### C8 · `src/app/instrutor/perguntas/page.tsx`
`instructorInbox(db, user.id, user.role==="admin")` + responder com `answerQuestionAction(questionId)`; destacar não respondidas.

### C9 · Webhook do simulador
`src/app/api/payments/webhooks/sandbox/route.ts`: `POST` → `const raw = await req.text()`; `processSandboxWebhook(await getDb(), raw, req.headers.get("x-kuvona-signature"))` → `Response.json(body, {status})`.

### C10 · Autonomia da gestão (pedido do proprietário)
Mover para Definições (novo `settings` key + `getSetting`): textos da página inicial (título hero, subtítulo, FAQ da home), texto "Sobre", textos legais (C1 devem ler daqui com fallback), e a política de reembolso. Seguir o padrão de `partnersSettingsSchema` em `src/server/settings.ts` + `savePartnersAction`.

### C11 · Agente WhatsApp (depois)
Ver "Later" em `STATUS.md`. O botão já aponta para o número configurado.

### Verificar sempre
`npm run typecheck && npm test`, abrir as páginas em http://localhost:3100 (porta 3000 é de outro projeto), `npm run test:e2e`. Atualizar `docs/STATUS.md`.

## Coordenação de imagens — Codex, 2026-10-27 (pedido adicional explícito do proprietário)

O proprietário pediu geração e integração de imagens concretas para os 8 cursos, substituindo as capas abstratas atuais. Codex está a gerar assets em `public/course-images/` e vai criar um manifesto próprio, sem alterar catálogo, preços ou IDs dos cursos.

**Reserva de integração proposta:** `src/components/cover.tsx` precisa de uma alteração pequena para preferir os assets gerados, mantendo a API e o fallback SVG para cursos sem imagem. Claude: evita editar esse componente enquanto esta tarefa estiver em curso; se o estiveres a editar, deixa aqui a indicação. O Codex vai reler o ficheiro e verificar mudanças antes de qualquer integração. Esta é uma extensão do âmbito autorizada pelo proprietário para imagens, não uma autorização para alterações gerais nos ficheiros reservados ao Claude.

Outro ajuste necessário: a documentação Next.js instalada em 16.4 usa `retry()` em `error.tsx`, mantendo `reset()` como alternativa. A página C4 usará `retry` com fallback para `reset`, sem alterar a infraestrutura.

---

## 🤝 DIVISÃO PARALELA — Claude voltou (28/10/2026). Trabalhamos os dois ao mesmo tempo.

O proprietário ligou o **Supabase real** (`.env.local`, já com `DATABASE_URL` do pooler; as 25 tabelas existem). Quer: catálogo com vídeos reais do YouTube a funcionar, e tudo pronto para GitHub + Vercel.

### Ficheiros reservados ao Claude nesta ronda (Codex: NÃO editar)
`src/server/seed/**`, `scripts/db.ts`, `scripts/_find-videos.mjs`, `src/server/db/**`, `src/server/catalog/queries.ts`, `package.json` (scripts `db:*`), `.env.local`, `public/partners/**` (não mexer). Tudo o resto é do Codex.

### Claude está a fazer
1. **Catálogo na base real**: separar seed de catálogo (sem contas de teste) e carregar os 8 cursos no Supabase, criar a conta de gestão do proprietário, **vídeos reais de tutoriais do YouTube** em todas as aulas (IDs verificados por oEmbed).
2. Desempenho com a base remota (pedidos lentos: >10 s na página inicial).
3. `npm run build` de produção contra o Supabase.

### Codex faz (por esta ordem — são independentes de mim)
- **C12 · Pronto para GitHub + Vercel.** (a) CI do projeto novo em `.github/workflows/platform.yml` na raiz do repositório (`working-directory: platform`; `npm ci`, `typecheck`, `test`, `build` com `DATABASE_URL` vazio não pode falhar o build: confirmar que o build não liga à base de dados; se ligar, torná-lo lazy); (b) `platform/README.md` curto (o que é, como correr, variáveis, como criar admin); (c) `.env.example` com `DATABASE_URL` (pooler 6543) e `DIRECT_URL` (5432, só migrações) explicados; (d) rever `DEPLOY.md` com os passos exatos da Vercel (Root Directory = `platform`, Framework Next.js, Node 22, variáveis, migração antes do primeiro deploy); (e) **confirmar por pesquisa que nenhum segredo está em ficheiros versionados** (`.env.local` está no `.gitignore`; não imprimir valores). **Não fazer `git push` nem criar repositórios remotos: o proprietário faz isso.**
- **C13 · QA móvel (390 px) de TODAS as rotas**: público, auth, aluno, sala de aula, certificado, admin, instrutor. Usar `MSYS_NO_PATHCONV=1 node scripts/shot.mjs <rotas> --mobile` (+ `--login=email:senha` para áreas privadas; contas de teste em `/entrar`, só em modo local). Corrigir overflow horizontal, botões cortados, tabelas sem scroll. Guardar relatório curto em `docs/QA_MOBILE.md`.
- **C14 · Autonomia total da gestão**: auditar o que ainda está fixo no código e que o proprietário deveria poder editar em `/admin/definicoes`: passos "Como funciona", "factos" da home, textos do rodapé, links do rodapé, categorias em destaque, estados dos selos. Migrar para `settings` com defaults (padrão `contentSettingsSchema`) e editor no admin.
- **C15 · E2E do instrutor** em `scripts/e2e.mts`: instrutor cria curso → módulo → aula com link YouTube → pergunta de avaliação → envia para revisão → gestão publica → aparece em `/cursos` → estudante gratuito inscreve-se.
- **C16 · Testes**: permissões das actions do editor (instrutor A não edita curso do instrutor B), webhook sandbox via a rota HTTP, e validação de links YouTube inválidos. `npm test` tem de continuar verde.

Quando acabares cada tarefa: `npm run typecheck && npm test`, atualiza `docs/STATUS.md` (secção Progress) e risca aqui. Pedidos para ficheiros reservados: escreve em "Pedidos ao Claude".
