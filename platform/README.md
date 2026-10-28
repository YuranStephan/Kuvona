# Academia Kuvona — plataforma

Academia em português para Moçambique: loja de cursos, contas, pagamentos verificados pela equipa, sala de aula, estúdio do instrutor e gestão. Next.js 16.4, React 19, TypeScript, Drizzle e PostgreSQL; em desenvolvimento, PGlite guarda os dados no disco local.

## Abrir

Na pasta principal, abre `abrir.bat`. O lançador verifica Node 22+, instala dependências em falta, compila quando necessário e abre **http://localhost:3100**. Mantém a janela aberta. O primeiro build precisa de internet para instalar dependências e obter as fontes.

Para desenvolver nesta pasta:

```powershell
npm ci
npm run dev
```

O primeiro acesso cria 8 cursos e contas locais de teste. As credenciais aparecem em `/entrar` apenas no modo local e estão em [docs/STATUS.md](docs/STATUS.md). Nunca uses estas contas numa instalação pública. Não abras `.data/pglite` com dois processos; para publicar usa PostgreSQL alojado.

## Percursos disponíveis

- **Loja:** pesquisa, filtros, categorias, grelha/lista, ordenação e paginação; os cartões abrem os detalhes do curso.
- **Detalhes:** objetivos, programa, requisitos, público-alvo, projeto, instrutor, avaliações, FAQ e aula gratuita. A inscrição ou compra começa aqui.
- **Compra:** checkout, M-Pesa/e-Mola manuais, ID da transação, histórico e verificação pela gestão. Há simulador assinado apenas em desenvolvimento.
- **Estudante:** cursos, leitor YouTube a pedido, retoma, notas, recursos, perguntas, progresso, avaliação corrigida no servidor, certificado verificável e lista de desejos.
- **Instrutor:** candidatura, perfil público, painel, criação de cursos, detalhes, seleção de capa, módulos/aulas, recursos, avaliação, estudantes e publicação sob revisão.
- **Gestão:** utilizadores e papéis, cursos, candidaturas, pagamentos, reembolsos, avaliações públicas, emails, auditoria, configurações e conteúdos editáveis.
- **Conta:** edição do perfil, palavra-passe, confirmação do email e recuperação de acesso.

## Verificar

```powershell
npm run typecheck
npm test
npm run build
```

Com um único servidor ativo na porta 3100 e Chrome/Edge instalado:

```powershell
npm run test:e2e
```

Os testes E2E usam apenas o ambiente local: criam contas/pedidos de teste e deixam evidências em `.qa/`. Não os executes contra produção. Os testes Vitest usam bases em memória. O teste do estúdio é `npm run test:studio`.

## Para continuar com Claude ou Codex

Lê [AGENTS.md](AGENTS.md), [docs/STATUS.md](docs/STATUS.md) e [docs/CODEX_TASKS.md](docs/CODEX_TASKS.md). As regras de negócio estão em `src/server/`; as mutações passam por `src/actions/`. Não edites em simultâneo os mesmos ficheiros nem abras a base local por outro processo.

[Publicação e configuração](docs/DEPLOY.md) · [Capas e prompts](docs/COURSE_IMAGES.md) · [Direção do produto](../docs/PRODUCT_DIRECTION_2026-10-27.md).

## Limites atuais

Não houve publicação. Os números de carteira locais são exemplos. Não há gateway comercial contratado nem agente WhatsApp a responder automaticamente; o botão abre o contacto configurado. Sem credenciais de email, as mensagens ficam na caixa de saída da gestão. Termos e política de reembolso são rascunhos. O certificado é de conclusão da academia, sem alegação de acreditação. Vídeos YouTube dependem de internet, disponibilidade e autorização do titular.
