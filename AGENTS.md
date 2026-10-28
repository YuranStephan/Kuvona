# Academia Kuvona — regras partilhadas de Codex e Claude

## Produto ativo

A aplicação ativa é **platform/**. Continua a implementação existente. A raiz contém a demonstração antiga, preservada como referência; não substituas a plataforma por um novo scaffold.

Antes de alterar código, lê **platform/AGENTS.md**, **platform/README.md** e **platform/docs/STATUS.md**. A direção aprovada está em **docs/PRODUCT_DIRECTION_2026-10-27.md**. A lista de tarefas e a passagem de responsabilidade estão em **platform/docs/CODEX_TASKS.md**.

## Contrato do produto

- Kuvona é uma academia em português para Moçambique, com loja, estudante, instrutor e gestão. A interface usa português europeu/moçambicano.
- Os cartões públicos abrem sempre os detalhes do curso. A compra ou inscrição começa nos detalhes; mantém o checkout separado.
- Detalhes: objetivos, requisitos, público-alvo, projeto, currículo, pré-visualização, instrutor, avaliações reais e FAQ.
- Conteúdo e configuração editáveis pela gestão devem usar as definições no servidor, com fallbacks documentados. Não inventes números comerciais, políticas, descontos, avaliações ou estudantes.
- As capas fotográficas são assets sintéticos locais; o editor permite escolher a biblioteca. Preserva a API de CourseCover e o padrão alternativo para cursos sem fotografia.

## Regras de engenharia

- Next.js **16.4**, React 19 e TypeScript strict. Lê os guias instalados em **platform/node_modules/next/dist/docs/** antes de usar APIs do framework.
- Regras de negócio em **platform/src/server/** recebem db explicitamente; mutações em **platform/src/actions/**; UI em app/components. Valida inputs no servidor.
- Cada Server Action volta a verificar sessão, papel e propriedade. Esconder botões não concede nem revoga permissões.
- Dinheiro em centavos inteiros. O preço vem do catálogo no servidor e é fixado no pedido. Acesso pago só por grantEnrollment dentro da transação de confirmação.
- Pedidos pendentes, em verificação, falhados, cancelados ou expirados não dão acesso. Confirmação repetida é inofensiva; uma referência de carteira só paga um pedido.
- Reembolso revoga o acesso desta compra e o certificado; preserva progresso e outros direitos válidos. Registar reembolso não executa uma transferência financeira.
- O simulador assinado fica restrito ao desenvolvimento ou a staging explicitamente configurado. Não o atives em produção.
- Conteúdo/vídeos pagos e respostas corretas não saem nas queries públicas. Só IDs YouTube validados; não aceites HTML arbitrário de editores.
- Certificado: acesso ativo, todas as aulas atuais concluídas e, quando há avaliação, melhor nota de pelo menos 70%. Sem avaliação, a implementação atual certifica pela conclusão. A verificação pública volta a conferir estes critérios e a revogação.
- Preserva o trabalho do utilizador. Nunca apagues a base, cursos, progresso ou contas para fazer um teste passar.

## Execução e colaboração

- Porta da plataforma: **3100**. A porta 3000 é de outro projeto. Abrir: **abrir.bat**; desenvolvimento: **npm run dev** dentro de platform.
- **Nunca abras a mesma .data/pglite em dois processos.** Testes unitários usam bases em memória. Reutiliza o servidor existente e pára o servidor desta aplicação antes de compilar ou executar manutenção na base local.
- Coordena ficheiros com outro agente; não edites simultaneamente o mesmo ficheiro. Não afirmes que Claude ou uma pessoa reviu o código sem essa revisão ter ocorrido.
- Antes de terminar: **npm run typecheck**, **npm test** e build quando aplicável. Mudanças de dinheiro, acesso e certificados precisam de testes. Verifica os percursos alterados no navegador, incluindo telemóvel.
- Testes de navegador: **npm run test:e2e** e **npm run test:studio**, só contra o servidor local, com Chrome/Edge. Criam dados QA identificados e restauram textos temporários.
- Atualiza **platform/docs/STATUS.md** com alterações, verificações reais e limites. Guia de publicação: **platform/docs/DEPLOY.md**. Não publiques nem faças push por inferência.

## Demonstração antiga

**abrir-demo-antiga.bat**, porta 8000; instruções em **README-DEMO.md**, **docs/LEGACY_AGENTS.md** e restantes documentos históricos em docs/. As regras da demonstração não mudam o produto ativo em platform/.
