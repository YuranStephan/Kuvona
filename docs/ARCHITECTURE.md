# Arquitetura e evolução

## O que existe hoje

Aplicação cliente em módulos ES, servida por Node em `127.0.0.1`. O servidor só fornece `index.html`, favicon e extensões públicas em `src/`; não publica `int.txt`, instruções, testes ou `.env`. Inclui cabeçalhos CSP e validação de caminhos. Isto reduz exposição acidental do workspace, mas não fornece uma API autenticada.

`data/market-data → domain → store → views/ui/marketplace → app` define as responsabilidades. O domínio não depende do DOM e pode ser testado com Node. `player.js` isola a integração externa. O store aplica ações a uma cópia do estado e publica uma atualização local. HTML, SVG e mensagens provenientes de dados são escapados; o editor não aceita HTML arbitrário. Links de vídeo são convertidos para IDs YouTube de 11 caracteres a partir de hosts permitidos.

## Invariantes financeiros demonstrados

Os montantes são centavos inteiros e o preço do pedido é uma fotografia do catálogo no momento da criação. Cada curso pode ter um pedido pendente reutilizável. O pedido guarda o método, número mascarado, estado e histórico. Não existe rede financeira.

Transições permitidas:

```text
pending → confirmed | failed | cancelled | expired
confirmed → refunded
```

Aplicar o mesmo estado outra vez é idempotente. Confirmar concede uma única inscrição. Estados não confirmados não concedem acesso. Reembolsar remove o acesso pago se não houver outro pedido confirmado que o sustente; o progresso fica guardado. A elegibilidade do certificado é consultada novamente ao abrir ou exportar.

Tudo isto é manipulável pelo utilizador no browser. Os testes demonstram consistência de comportamento, não segurança financeira em produção.

## Progressão e avaliações

Progresso guarda IDs de aulas por curso, sem duplicados. A marcação manual é uma declaração do estudante. O evento de fim do YouTube também pode marcar a aula; posições de reprodução são guardadas a cada dez segundos enquanto toca e ao pausar. Não se faz alegação de verificação de tempo assistido ou aprendizagem.

A avaliação exige todas as aulas do curso. O resultado é recalculado a partir das respostas; uma importação não pode simplesmente declarar uma pontuação. A melhor pontuação mantém-se. A emissão exige inscrição ativa, todas as aulas atuais e pontuação ≥70%. O nome e data são fotografados na emissão. Alterações nas perguntas ou no conjunto de aulas invalidam resultados e certificados do curso; edições só de título/preço preservam-nos.

## Persistência

O estado tem versão explícita, projeção para um schema conhecido, limites de tamanho e validação de cursos, avaliações e transações. IDs especiais que poderiam alterar protótipos são rejeitados. A importação substitui o estado apenas depois de validação e confirmação. A normalização não torna um backup “confiável” para fins financeiros: o próprio dono pode editá-lo.

As abas usam last-write-wins no localStorage. O evento `storage` avisa sobre alterações noutra aba; não há bloqueio, transação entre abas ou resolução automática de conflitos. Não usar este modelo para dados reais partilhados.

## Próxima arquitetura de produção

Direção acordada no contexto original: monólito modular Next.js + TypeScript, PostgreSQL/Supabase, Supabase Auth, notificações por email e um adaptador de gateway M-Pesa/e-Mola. É um plano; nenhum desses serviços foi configurado nesta entrega.

Módulos propostos:

| Módulo       | Responsabilidade / fronteira                            |
| ------------ | ------------------------------------------------------- |
| auth         | Sessão, perfil e roles validados no servidor            |
| catalog      | Cursos, versões de conteúdo e publicação                |
| enrollment   | Único ponto para conceder/revogar acesso                |
| payments     | Preço confiável, pedidos, eventos, adaptador de gateway |
| learning     | Progresso e avaliações com regras no servidor           |
| video        | Metadados e provedores, sem prometer DRM no YouTube     |
| certificates | Emissão com registo e verificação pública               |
| support      | Pedidos, respostas e notificações reais                 |

Tabelas essenciais: `profiles`, `roles`, `courses`, `modules`, `lessons`, `course_versions`, `enrollments`, `payment_orders`, `payment_events`, `lesson_progress`, `assessment_attempts`, `certificates`, `study_sessions`, `notes`, `support_tickets`, `audit_events`.

Restrições: valores inteiros positivos, UNIQUE na referência do fornecedor, UNIQUE `(user_id,course_id)`, chaves estrangeiras e migrações versionadas. `payment_events` é append-only. Confirmação e concessão de acesso devem acontecer na mesma transação, após confirmação confiável do gateway. Uma confirmação enviada pelo navegador não é evidência.

## Contratos previstos de API

| Operação                              | Regra de servidor                                                        |
| ------------------------------------- | ------------------------------------------------------------------------ |
| POST /api/payments/orders             | Sessão, courseId e método; preço consultado no servidor; idempotency key |
| POST /api/payments/webhooks/:provider | Assinatura/autenticidade, deduplicação, transação e evento imutável      |
| GET /api/payments/orders/:id          | Só dono ou operador autorizado                                           |
| POST /api/enrollments/free            | Apenas curso efetivamente gratuito e publicado                           |
| PUT /api/lessons/:id/progress         | Sessão e inscrição ativa; validar conteúdo/versão                        |
| POST /api/courses/:id/assessment      | Correção no servidor; nunca expor gabarito antes da tentativa            |
| GET /api/certificates/:code           | Registo público mínimo, revogação e proteção de dados                    |
| POST /api/admin/courses               | Role verificada, validação e registo de auditoria                        |

O primeiro fornecedor será um `FakeProvider` no servidor, com o mesmo contrato do futuro gateway. A integração real só começa quando houver documentação, credenciais de sandbox e contrato comercial do fornecedor escolhido. Não assumir suporte de cobrança em ambas as carteiras apenas a partir de listas de marketing.

## Critérios antes de aceitar dinheiro real

- Sessões/roles/RLS testados; nenhuma decisão de acesso baseada em localStorage.
- Webhooks autenticados, duplicados/invertidos/atrasados testados, timeouts e reconciliação operacional.
- Reembolsos e acessos com transação, rastreabilidade e permissões.
- Revisão humana independente do módulo financeiro e testes de restauro de backups.
- Conteúdo autorizado, termos, política de reembolso e requisitos fiscais tratados com profissionais adequados.
- Segredos só no servidor; logs sem PINs ou números completos; monitorização e alertas.

Esta lista define uma integração futura e não uma garantia de conformidade ou segurança da demonstração.

## Loja pública da versão 3

`marketplace.js` e `marketplace.css` implementam a loja, os detalhes e o checkout; `views.js` mantém o espaço do estudante. A rota inicial é `#home`. Os contratos de navegação estão em `MARKETPLACE.md`. A versão de dados continua 2; `catalogRevision: 3` permite acrescentar os novos cursos sem substituir alterações existentes. As opiniões locais são validadas, limitadas a uma por curso e requerem inscrição e uma aula concluída.
