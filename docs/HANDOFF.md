> Produto ativo: **platform/**. Este documento mantém o histórico da demonstração. Para continuar agora, lê **../platform/docs/STATUS.md**, **../platform/README.md** e **../AGENTS.md**. O lançador abrir.bat inicia a plataforma na porta 3100; abrir-demo-antiga.bat mantém a demo na porta 8000.

# Passagem de trabalho — Codex ↔ Claude

## ⚡ Estado atual — MVP real em construção em `platform/` (Claude, 27/10/2026)

O proprietário pediu ao Claude para construir o MVP completo "do zero". O novo produto está em **`platform/`** (Next.js 16 + TypeScript + PostgreSQL/Drizzle, contas reais, pagamentos verificados no servidor, papéis estudante/instrutor/gestão e redesign completo). A demonstração antiga na raiz fica intacta como referência.

**Para continuar (Codex ou Claude): ler [`platform/docs/STATUS.md`](../platform/docs/STATUS.md)** — stack, como correr, mapa do código, invariantes, o que está feito e a lista ordenada do que falta. O Claude atualiza esse ficheiro à medida que avança.

Arranque rápido: `cd platform && npm install && npm run dev` → http://localhost:3100 (a porta 3000 está ocupada por outro projeto neste PC). Testes: `npm test`.

## Atualização prioritária — 27 de outubro de 2026

**Ler primeiro:** [Briefing consolidado de produto de 27/10/2026](PRODUCT_DIRECTION_2026-10-27.md), referência **KV-DIR-20261027-01**. Reúne o contexto relevante e as decisões da conversa para o Claude assumir a continuidade.

**Alvo confirmado: MVP real**, onde pessoas reais se registam e compram cursos, com identidade/contas, dados persistentes, permissões no servidor, verificação de pagamentos e concessão de inscrições/acesso. Inclui gestão de conteúdos por links YouTube e visibilidade de estudantes, progresso, desempenho e vendas; área própria do instrutor; experiência coerente do estudante. Foi pedida uma **reformulação visual drástica e profissional** na loja pública e nas áreas de estudante, instrutor e gestão.

**Por decidir:** fornecedor de pagamentos, moeda, modelo de preços, estilo visual e credenciais de serviços. GitHub do utilizador e Vercel são o destino futuro indicado, sem pedido de push ou deploy nesta passagem. O histórico de demonstração abaixo descreve o estado existente, não reduz o alvo novo a compras simuladas.

Também ficam abertos o país de lançamento, a política de reembolso, as permissões de publicação dos instrutores, as métricas exatas e a estratégia de acesso aos vídeos pagos. O YouTube aloja os vídeos e não substitui o backend de contas, pagamentos e progresso. O briefing separa as sugestões discutidas — incluindo revisão/publicação, Q&A, dashboards e estados de interface — dos requisitos confirmados. O utilizador indicou que o Claude fica com a continuidade e voltará à conversa de voz se precisar.

O briefing distingue pedidos expressos, sugestões e questões em aberto. Os requisitos continuam em discussão; não são uma especificação completa aprovada. Esta passagem é exclusivamente documental e não solicita implementação. As recomendações técnicas abaixo são contexto anterior a rever à luz desta atualização.

**Verificação da ponte:** `CLAUDE.md` → este handoff → briefing datado. **Receção/leitura pelo Claude: não confirmada.**

## Objetivo entregue

Entregar a Kuvona como loja de cursos e área do estudante distintas. A versão 3 abre na loja e segue catálogo → detalhes completos → checkout → confirmação → aprendizagem. A compra só começa nos detalhes. O âmbito continua local e sem backend financeiro real, preservando a direção de produto do ficheiro `int.txt`. O protótipo original está em `legacy/index-v1.html`.

## Contrato

Ler `AGENTS.md` antes de editar. `CLAUDE.md` referencia as mesmas regras. A colaboração com Claude está preparada por estes ficheiros; não houve nesta sessão uma revisão efetiva por Claude.

## Funcionalidades implementadas

Loja pública, 8 cursos/25 aulas, catálogo paginado com filtros e grelha/lista; detalhes com objetivos, currículo, pré-visualização, requisitos, público, projeto, instrutor, opiniões locais e FAQ. Inclui perfis de equipa, checkout e confirmação próprios, página institucional e proposta de curso. O editor permite alterar os metadados públicos.

Ler `docs/MARKETPLACE.md` para os contratos. Não usar o dashboard como entrada pública nem pôr compra nos cartões.

Painel, catálogo filtrável, favoritos, inscrições, sala de aula com adaptador YouTube, conteúdo e exercícios escritos, anotações, materiais, discussão local, avaliações específicas, certificados demonstrativos, agenda/exportação ICS, perfil/preferências, backup/restore e apoio local. Gestão de cursos, aulas, avaliações, materiais, pagamentos demo, reembolsos, pedidos de apoio e atividade.

## Verificações

- `npm run check`: sintaxe e resolução de imports locais.
- `npm test`: 24 testes de invariantes de domínio, pagamentos, elegibilidade, migração, importação e limites do servidor.
- `npm run test:browser`: teste real com Chromium em perfil isolado; o resultado final fica registado em `docs/VALIDATION.md`.

## Primeiro trabalho recomendado para o Claude

1. Ler a implementação e rever especialmente `domain.js`, `store.js` e normalização de backups.
2. Executar os testes e rever os fluxos em navegador, usando dados demo.
3. Propor e implementar a primeira integração de autenticação e persistência no servidor como uma tarefa isolada, sem ligar cobranças reais.
4. Preservar a experiência atual e substituir as fronteiras gradualmente. Não começar por apagar a interface ou instalar um scaffold que a substitua.

## Limitações conhecidas

- Não há contas, autorização, armazenamento partilhado, emails ou pagamentos reais.
- Administração é demonstração pública dentro do navegador.
- Importar um backup pode alterar inscrições; esse dado nunca pode ser aceite como prova de compra num futuro servidor.
- Avaliações e gabaritos são visíveis no JavaScript, adequados apenas a esta demonstração.
- Não há garantia de visualização completa ou anti-cópia para vídeos YouTube. Vídeos externos podem não permitir reprodução no ambiente do utilizador.
- O perfil temporário dos testes é separado dos dados do utilizador. Os testes não validam a rede financeira nem emails.
- A gravação de notas é local. Abas concorrentes não têm controlo transacional; há um aviso de atualização.

## Como dividir o trabalho

Reservar tarefas por módulo e evitar o mesmo ficheiro em simultâneo. Um assistente implementa; o outro revê os critérios e casos de falha. Registar aqui os ficheiros alterados, testes executados e pendências concretas depois de cada tarefa. A revisão humana continua necessária antes do módulo financeiro real.
