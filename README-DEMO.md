# Academia Kuvona

Uma academia digital em português, pensada para aprender ao teu ritmo e num telemóvel. A versão 3 oferece uma loja pública de cursos, detalhes completos e um percurso de inscrição separado da área do estudante.

**Estado:** demonstração funcional local. Não é ainda uma plataforma com contas reais, cobranças, gestão remota ou certificados acreditados.

## Abrir em dois cliques

Precisas do **Node.js 22 ou superior**, já disponível na máquina em que esta versão foi criada. Não é necessário instalar dependências.

1. Abre `abrir.bat`.
2. O navegador abre em **http://localhost:8000**. Mantém a janela do servidor aberta.

Em alternativa, na pasta do projeto:

```powershell
npm start
```

Abre http://localhost:8000. Para encerrar o servidor, usa `Ctrl+C`. Para uma porta diferente:

```powershell
$env:PORT=8001
npm start
```

**Usa sempre o mesmo endereço e porta para conservar os dados locais.** `localhost` e `127.0.0.1`, ou portas diferentes, têm armazenamentos separados. Não abras `index.html` diretamente: os módulos precisam do servidor HTTP.

## O que podes experimentar

- **Painel pessoal:** cursos inscritos, aulas concluídas, certificados, calendário e meta semanal baseada em sessões concluídas.
- **Loja pública:** página inicial, categorias, catálogo com pesquisa, filtros de área/preço/nível/duração, grelha/lista, ordenação e paginação. Cartões abrem sempre os detalhes.
- **Decisão e compra:** requisitos, público-alvo, projeto, currículo, pré-visualização gratuita, perfil do instrutor, avaliações locais e FAQ. Checkout e confirmação em páginas próprias; sem compra direta nos cartões.
- **Participação:** lista de desejos, partilha do link, página institucional e proposta de curso guardada no apoio local.
- **Detalhe do curso:** objetivos, módulos, aulas, autor e inscrição gratuita ou paga de demonstração.
- **Sala de aula:** quatro vídeos públicos do Curso em Vídeo, carregados a pedido; retoma de reprodução com a API YouTube, texto, exercícios, anterior/próxima aula e conclusão manual. Vídeos dependem de internet, disponibilidade e regras do YouTube.
- **Caderno e materiais:** anotações por aula, gravação local automática e exportação em texto; materiais descarregáveis.
- **Discussão:** mensagens locais por curso, identificadas como locais.
- **Avaliação:** perguntas específicas por curso, correção comentada, repetição e melhor pontuação. Só desbloqueia depois de todas as aulas.
- **Certificados:** emitidos com todas as aulas e ≥70% na avaliação, consulta por código **neste navegador**, exportação SVG e impressão/guardar PDF pelo navegador.
- **Agenda:** sessões, conclusão/reabertura, eliminação confirmada, calendário mensal e exportação `.ics` para o teu calendário.
- **Pagamentos demo:** M-Pesa/e-Mola simulados; pedido pendente persistente, confirmação, falha, cancelamento, expiração e reembolso no painel de gestão; registo descarregável e histórico. Não é emitida fatura fiscal.
- **Perfil e preferências:** nome, email opcional, biografia, tema claro/escuro, poupança de dados e meta semanal.
- **Cópias de segurança:** exportação JSON, importação validada com confirmação e reposição da demonstração com confirmação.
- **Apoio local:** FAQ, pedidos e resposta pelo painel de gestão.
- **Gestão demo:** criação/edição de cursos, aulas com link YouTube validado, perguntas e materiais, pagamentos, reembolsos, apoio e atividade.

O catálogo inicial tem **8 cursos e 25 aulas**: web, empreendedorismo, design, produtividade, folhas de cálculo, marketing, Python e preparação profissional. O conteúdo escrito e os exercícios são material de demonstração da Kuvona. As durações representam estimativas de estudo, não durações verificadas dos vídeos. Não se apresentam classificações ou números de estudantes inventados.

### Um percurso de demonstração

1. Na **loja**, pesquisa um curso ou abre o catálogo. Clica no cartão para abrir os **detalhes**, consulta o programa e experimenta a pré-visualização. A compra só começa nessa página; depois abre um checkout próprio.
2. No pagamento, usa por exemplo `841234567`. O número fica mascarado no registo. Nunca introduzas um PIN.
3. Experimenta fechar o pagamento ainda pendente e voltar a abri-lo em **Pagamentos**.
4. Simula a confirmação, estuda as aulas e marca-as concluídas.
5. Faz a avaliação. Nos cursos iniciais, três perguntas exigem três respostas certas para ultrapassar 70%.
6. Abre o certificado e exporta-o.
7. Em **Gestão · demo → Pagamentos**, experimenta um reembolso. O acesso é revogado, preservando o progresso para uma futura inscrição.

## Dados, migração e limites

O estado usa `localStorage` na chave `kuvona-v2`. Na primeira abertura no mesmo endereço, a aplicação importa o progresso e as inscrições de `kuvona-demo` e o tema de `kuvona-theme`. As chaves antigas não são apagadas. A versão anterior está preservada em `legacy/index-v1.html`.

Se o navegador bloquear o armazenamento ou atingir a quota, a sessão continua em memória e a aplicação informa a limitação. Exporta os dados para os conservar. Abrir duas abas e editar simultaneamente não oferece sincronização transacional; a segunda aba recebe um aviso para atualizar. As cópias exportadas podem conter o perfil e anotações: guarda-as num local adequado.

Sem backend, não há autenticação, proteção real de cursos, permissões de administrador, dados partilhados, emails, recuperação de conta, webhooks, cobranças ou verificação pública de certificados. Uma pessoa pode alterar os dados locais. O painel de gestão é intencionalmente acessível nesta demonstração. Estes limites não se resolvem escondendo botões.

Fontes externas são opcionais, com alternativas locais. Vídeos só contactam o YouTube quando carregas no botão de reprodução. A aplicação não fica totalmente disponível offline: precisas do servidor local e os vídeos/fontes precisam de rede. O modo de poupança não força uma resolução no leitor YouTube nem promete uma quantidade de dados.

## Estrutura

```text
index.html              Entrada e metadados
src/data.js             Catálogo inicial e conteúdo
src/market-data.js      Cursos adicionais e metadados públicos
src/marketplace.js      Loja, catálogo, detalhes, perfis e checkout
src/marketplace.css     Estilos da loja pública
src/domain.js           Validação, avaliação e transições financeiras
src/store.js            Estado, ações, migração e persistência
src/ui.js               Componentes, formatação e ícones
src/views.js            Ecrãs de aprendizagem e gestão
src/app.js              Navegação, formulários e interações
src/player.js           Adaptador YouTube
src/styles.css          Tokens, componentes e layouts responsivos
server.mjs              Servidor estático restrito a assets públicos
scripts/                Abertura, verificação e testes de navegador
tests/                  Regras de negócio, estado e caminhos do servidor
docs/                   Arquitetura e passagem de trabalho
AGENTS.md / CLAUDE.md    Contrato de colaboração entre assistentes
```

## Verificar alterações

```powershell
npm run check
npm test
npm run test:browser
```

Os testes de regras não precisam de rede ou dependências. O teste de navegador usa Chrome/Edge/Chromium instalado, perfil temporário separado e servidor numa porta livre. Define `CHROME_PATH` se necessário. Os screenshots ficam em `.qa/`, que não é versionada. A reprodução externa do YouTube não é coberta pelo teste offline.

O relatório da entrega está em `docs/VALIDATION.md`. O workflow `.github/workflows/checks.yml` prepara as mesmas verificações de regras e sintaxe em pull requests e pushes quando este projeto estiver num repositório GitHub. Ainda não foi executado remotamente. As ações seguem os exemplos oficiais de [checkout](https://github.com/actions/checkout) e [setup-node](https://github.com/actions/setup-node).

Os contratos específicos da loja estão em `docs/MARKETPLACE.md`. O catálogo anterior é ampliado automaticamente sem apagar os teus dados.

## Continuar com o Claude

Pede ao Claude para ler **`CLAUDE.md`**, que aponta para o contrato partilhado em **`AGENTS.md`**. O estado do trabalho e a próxima integração estão em **`docs/HANDOFF.md`**. A arquitetura de produção, limites e critérios estão em **`docs/ARCHITECTURE.md`**.

Documentação da integração de vídeo: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference). Os vídeos públicos mantêm os controlos e a atribuição do leitor; não existe DRM ou ocultação segura de links.
