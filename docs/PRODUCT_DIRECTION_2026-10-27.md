# Kuvona — briefing consolidado para o Claude

**Referência:** KV-DIR-20261027-01  
**Data:** 27 de outubro de 2026 · Africa/Johannesburg  
**Origem:** discussão do utilizador em conversa de voz, encaminhada para a ponte documental existente deste projeto.  
**Estado:** direção de produto confirmada nos pontos abaixo; requisitos e decisões restantes ainda em refinamento. Não é uma especificação técnica/comercial completa aprovada.  
**Receção/leitura pelo Claude:** não confirmada. Guardar o contexto não comprova que o Claude o recebeu, leu ou aceitou.

## 1. Objetivo e continuidade

A Kuvona é a plataforma de cursos existente em `C:\Users\Dell's\Desktop\New folder`, inspirada no percurso de descoberta e compra da Udemy. O utilizador considera a amostra atual crua e quer elevá-la a um **MVP comercial real, completo e profissional**.

**Decisão explícita: pessoas reais devem poder registar-se e comprar cursos reais. O objetivo não é apenas uma demonstração com inscrições e pagamentos simulados.** O proprietário do projeto e outras pessoas envolvidas também devem conseguir entrar e avaliar esse produto funcional.

O utilizador indicou que o Claude assume a continuidade a partir deste contexto e que voltará à conversa de voz se necessário. Este ficheiro consolida a passagem; não é preciso esperar ou continuar a consultar o Claude para encerrar o registo desta atualização.

## 2. Ponto de partida técnico

O projeto atual é uma demonstração local em HTML/CSS/JavaScript com servidor estático Node, estado no navegador, catálogo, detalhes, checkout simulado e área de aprendizagem. Os documentos existentes descrevem 8 cursos/25 aulas, notas, materiais, progresso, avaliações, certificados demonstrativos e gestão local.

Este é o estado anteriormente documentado, não uma auditoria técnica nova nesta passagem. Consultar `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `MARKETPLACE.md` e `VALIDATION.md` para a estrutura, os contratos e a evidência anterior. Os limites do protótipo e os testes já registados **não demonstram prontidão para utilização comercial real**.

A continuidade deve construir a partir do projeto existente e rever as suas lacunas. O histórico local, os preços em moeda de exemplo, o tema visual e as escolhas de serviços anteriormente sugeridas não se tornam decisões aprovadas para o novo MVP.

## 3. Requisitos expressamente pedidos

### Gestão da academia

- Uma área de gestão completa onde a equipa possa introduzir e manter o conteúdo dos cursos e das aulas.
- Introdução de links YouTube para os vídeos das aulas, em vez de carregar ficheiros de vídeo para o servidor da Kuvona.
- Gestão de cursos, estudantes e instrutores.
- Visibilidade sobre estudantes, progresso de aprendizagem, desempenho dos cursos e vendas.

### Área própria do instrutor

- Cada professor deve conseguir gerir os seus próprios cursos e conteúdos de ensino.
- Deve conseguir consultar os números de estudantes dos seus cursos, envolvimento/progresso de aprendizagem e vendas dos seus cursos.
- As permissões de publicação, revisão editorial e eventual colaboração entre instrutores ainda não foram definidas.

### Experiência coerente do estudante

- Um percurso ligado de descoberta e catálogo, detalhes e pré-visualização do curso, compra/inscrição, aulas, materiais e progresso guardado.
- A experiência deve refletir os cursos e conteúdos geridos pela equipa e pelos professores, e permitir regressar à aprendizagem sem perder o progresso.
- Preservar como ponto de partida o percurso de loja e aprendizagem já existente; os cartões públicos levam aos detalhes e a compra começa nessa página.

### Identidade, dados e compra real

- Planear identidade e contas reais, com registo de utilizadores.
- Planear dados persistentes e partilhados. O `localStorage` atual não pode sustentar contas, compras, inscrições ou progresso reais como fonte de verdade.
- Impor autenticação e permissões no servidor, com âmbitos próprios para gestão, instrutor e estudante.
- Verificar pagamentos através de uma integração confiável no servidor e cumprir a inscrição/concessão de acesso resultante. Um estado ou botão enviado pelo navegador não comprova um pagamento real.
- Ligar as vendas efetivas e o acesso concedido aos dados mostrados nas áreas correspondentes.

Estes são requisitos a planear e implementar no âmbito que for refinado com o utilizador; não são funcionalidades concluídas ou garantias de segurança de produção nesta passagem.

## 4. Redesign profundo exigido

O utilizador pede uma **mudança visual drástica**, muito além de trocar cores ou retocar a amostra. A qualidade deve ser profissional e coerente em:

- Loja pública, catálogo e apresentação/detalhes dos cursos.
- Checkout e confirmação de inscrição.
- Experiência de aprendizagem do estudante.
- Área de trabalho do instrutor.
- Área de gestão.

O aspeto atual não deve ser tratado como estilo aprovado a preservar. A direção estética concreta ainda está aberta. O objetivo é elevar apresentação, acabamento e usabilidade do produto, não apenas aumentar o número de ecrãs ou acrescentar indicadores decorativos.

## 5. Papel do YouTube

**Decisão confirmada:** o YouTube é a fonte escolhida para os vídeos. Gestão e instrutores introduzem links; não se pretende carregar ficheiros de vídeo para o servidor da academia.

O YouTube aloja o vídeo; **não substitui o backend de contas, pagamentos, inscrições ou progresso** da Kuvona.

A estratégia de acesso a vídeos de cursos pagos precisa de ser considerada e discutida. Não assumir que um link não listado, ocultar um endereço ou proteger apenas a página transforma o vídeo num recurso com controlo de acesso real. Não inventar uma solução de proteção nem afirmar que este problema ficou resolvido nesta conversa.

## 6. Sugestões discutidas — não explicitamente aprovadas

Registar como propostas a avaliar, não como âmbito já fechado:

- Organização dos cursos em módulos e aulas.
- Fluxo rascunho → revisão → publicação; operações de publicar/despublicar.
- Perguntas e respostas entre estudantes e instrutores.
- Dashboards com estudantes ativos, inscrições, progresso e conclusão.
- Tipografia forte, apresentação cuidada dos cursos, layouts para telemóvel e leitor de aulas focado.
- Estados explícitos de vazio, carregamento e erro.

Sugestões adicionais de planeamento, também não aprovadas como funcionalidades:

- Construir uma matriz de permissões e definir um percurso verificável para cada papel.
- Definir as métricas e a origem dos dados antes de desenhar dashboards; distinguir pagamentos pendentes, vendas confirmadas e reembolsos.
- Preparar acessos e dados apropriados para a avaliação do produto real. Sandbox e dados de teste podem apoiar o desenvolvimento, mas não substituem a compra real escolhida como objetivo.

Não se assume por omissão um sistema de comissões ou pagamentos aos professores, exportação de relatórios, notificações automáticas, uploads de outros materiais ou outras funcionalidades não pedidas.

## 7. GitHub e Vercel: destino futuro, sem publicação nesta passagem

O utilizador pretende colocar o projeto **na sua conta GitHub** e alojá-lo **na Vercel**, para disponibilizar o produto ao proprietário e às pessoas envolvidas.

Isso regista o destino pretendido; **não autoriza criar um repositório remoto, fazer push, ligar contas, configurar serviços ou executar um deploy nesta passagem de contexto**. A arquitetura anteriormente sugerida é contexto histórico, não confirmação automática de fornecedores ou credenciais.

## 8. Decisões por tomar e questões para refinamento

Nenhuma das escolhas seguintes foi fechada nesta discussão. Não preencher silenciosamente com valores da amostra ou preferências dos assistentes.

1. **País de lançamento, moeda e preços:** onde será lançado o MVP, qual moeda e qual modelo de preços? Os exemplos locais existentes não fixam essas decisões.
2. **Fornecedor de pagamento e credenciais:** qual fornecedor e métodos suportarão compras reais? Que contas/ambientes serão usados, e como serão disponibilizadas as credenciais quando a integração for autorizada?
3. **Política de reembolso e acesso:** que regras comerciais se aplicam e como afetam inscrições, acesso, pedidos pendentes, falhados e reembolsados?
4. **Direção visual:** qual linguagem estética e quais critérios de acabamento orientarão a reformulação profunda das áreas pública, estudante, instrutor e gestão?
5. **Papéis e publicação:** quem cria e gere contas da equipa e dos instrutores? O instrutor publica diretamente ou precisa de aprovação? Pode haver mais de um professor por curso?
6. **Progresso e analytics:** o que define atividade, envolvimento, conclusão e desempenho? Quais métricas, períodos e detalhes de estudantes pode cada papel consultar?
7. **Vídeos pagos:** como combinar os links YouTube escolhidos com o modelo de cursos pagos, e quais limites de acesso devem ser assumidos no produto?
8. **Identidade e persistência:** que solução será usada para contas, sessões, permissões e dados partilhados? A stack/serviços sugeridos no histórico ainda precisam de ser reconciliados com este alvo real.
9. **Critérios da primeira entrega:** quais percursos de registo, compra, gestão, ensino e aprendizagem são indispensáveis ao lançamento? O que fica para uma etapa posterior e quem valida a entrega?
10. **Disponibilização futura:** qual conta/repositório GitHub, configuração Vercel, ambiente de avaliação e eventual domínio serão utilizados quando houver um pedido de publicação?

Estas questões não foram respondidas implicitamente pela conversa. O requisito de contas e compras reais, por outro lado, já está confirmado e não deve voltar a ser apresentado como escolha entre produto real e simples simulação.

## 9. Limites e estado desta passagem

- Trabalho solicitado aqui: consolidar o contexto relevante da Kuvona e registá-lo na ponte documental existente para o Claude assumir a continuidade.
- Não solicitado aqui: implementação, alteração do código da aplicação, push, deploy, configuração de serviços ou contactos externos.
- Conteúdo restrito à Kuvona e à discussão de produto acima.
- Os requisitos continuam em refinamento: o briefing distingue decisões confirmadas, sugestões e escolhas pendentes, sem se apresentar como especificação completa aprovada.
- Não se afirma que o MVP real ou a segurança de produção estejam prontos.

## 10. Ponte e confirmação de leitura

Cadeia de entrada: `CLAUDE.md` → `docs/HANDOFF.md` → este briefing consolidado.

O Claude deve ler este contexto antes de transformar propostas históricas em tarefas e assumir a continuidade com o alvo comercial real e o redesign profundo confirmados. Pode registar abaixo a data e uma síntese quando efetivamente ler o briefing. Outro assistente não deve preencher esse reconhecimento em seu nome.

**Confirmação de leitura do Claude:** recebido e lido pelo Claude (Opus 5.5) em 27/10/2026. Síntese: alvo é um MVP real (contas, compras verificadas no servidor, inscrições, papéis gestão/instrutor/estudante, vídeos por link YouTube) com redesign drástico. Por pedido direto do proprietário, a construção começou do zero em `platform/`; decisões tomadas por omissão (MZN, verificação manual M-Pesa/e-Mola, simulador só local, publicação pela gestão) estão em `platform/docs/STATUS.md` e podem ser revistas.
