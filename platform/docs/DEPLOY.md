# Publicar a Academia Kuvona

Guia para a aplicação em `platform/`. Não houve publicação nem configuração de contas externas nesta entrega. Usa um ambiente de teste antes da produção.

## 1. Base de dados Supabase

Cria um projeto, escolhe a região e guarda a palavra-passe num gestor de segredos. Em **Connect**, copia a connection string do **Transaction pooler**, porta **6543**, e coloca-a em `DATABASE_URL` no servidor. Codifica caracteres especiais da palavra-passe na URL. O cliente e o migrador usam `prepare: false`, necessário neste modo de ligação. Para ferramentas que exijam ligação direta/sessão, consulta as alternativas do painel. [Ligações PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Drizzle](https://supabase.com/docs/guides/database/drizzle).

Este projeto usa autenticação e permissões próprias no servidor, não Supabase Auth. Não exponhas a connection string no navegador ou em variáveis `NEXT_PUBLIC_*`. Não exponhas as tabelas pela Data API sem configurar as políticas e permissões adequadas. A conta de base de dados usada pela aplicação deve ter apenas os privilégios necessários; as migrações exigem privilégios de DDL.

## 2. Vercel

Importa o repositório, seleciona **Next.js**, **Root Directory = `platform`**, Node.js 22 ou superior e instalação `npm ci`. Usa o comando de build:

```text
npm run db:migrate && npm run build
```

A integração Next.js é detetada pela Vercel. Não configures `npm start` como uma função nem uses PGlite no alojamento sem disco persistente. [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

Configura as variáveis no ambiente correto:

| Variável                 | Valor                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| `DATABASE_URL`           | Connection string privada do Supabase                                      |
| `APP_URL`                | URL HTTPS final, sem barra final                                           |
| `RESEND_API_KEY`         | Chave privada do serviço de email                                          |
| `EMAIL_FROM`             | Remetente de um domínio verificado no serviço de email                     |
| `PAYMENT_WEBHOOK_SECRET` | Segredo aleatório forte, privado e diferente por ambiente                  |
| `DATABASE_POOL_MAX`      | Opcional; começa com um limite pequeno por instância e ajusta à capacidade |

Mantém `KUVONA_ENABLE_SANDBOX` ausente em produção. Usa uma base separada para Preview e testes. Não deixes builds de Preview migrar a base de produção e não executes migrações concorrentes. Faz uma cópia de segurança antes de alterações de esquema.

## 3. Primeira conta de gestão

No teu terminal local, dentro de `platform/`, define temporariamente o `DATABASE_URL` do ambiente pretendido. O CLI lê a variável de ambiente do processo; não assumes que lê `.env.local` automaticamente.

```powershell
npm run create-admin -- gestao@teu-dominio.co.mz "Nome da pessoa responsável"
```

O comando gera e mostra uma palavra-passe temporária uma vez. Guarda-a com segurança e muda-a em **Conta → Segurança**. **Se o email já existir, o comando promove a conta e substitui a palavra-passe.** Usa-o apenas para o arranque ou uma recuperação autorizada. Não executes `db:reset` nem `db:seed` contra produção. As contas de teste e o catálogo demonstrativo são criados apenas no modo local.

## 4. Preparação pela gestão

Entra em `/admin/definicoes` e configura os números reais M-Pesa/e-Mola, titular da carteira, instruções e prazo de pagamento; identidade da academia, NUIT, email, telefone e WhatsApp; textos da home, FAQ, Sobre e políticas. Os parceiros só devem ser apresentados como reais depois de confirmados. Os textos legais mantêm o aviso de rascunho nesta versão e precisam de revisão.

Cria ou aprova instrutores e cursos, coloca vídeos autorizados e testa uma aula gratuita. No modo manual, confirma cada pagamento no extrato da carteira antes de abrir o acesso. Registar um reembolso não transfere dinheiro: a devolução efetiva continua a ser um procedimento da equipa. Não existe integração com um gateway comercial contratado.

## 5. Verificação antes de aceitar dinheiro real

Lista da arquitetura do projeto, adaptada à implementação atual:

- Sessões, papéis e limites de acesso testados; nenhuma decisão de acesso baseada em localStorage.
- Callbacks autenticados, duplicados, invertidos e atrasados testados, com reconciliação operacional. O webhook existente é apenas do simulador; qualquer gateway futuro precisa de integração própria.
- Reembolsos e acessos transacionais, com rastreabilidade e permissões.
- Revisão humana independente do módulo financeiro e teste de restauro de backups.
- Conteúdo autorizado, termos, política de reembolso e requisitos fiscais tratados com profissionais adequados.
- Segredos só no servidor; logs sem PINs ou números completos; monitorização e alertas.

Testa registo, email de confirmação, recuperação de palavra-passe, compra, confirmação manual, recusa, reembolso, aprendizagem, avaliação e verificação de certificado no ambiente publicado. Confirma domínio HTTPS, entrega de emails, backups e procedimentos de apoio. Os testes locais e o build não substituem estas verificações operacionais.
