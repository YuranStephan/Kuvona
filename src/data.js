import { additionalCourses, editorial } from "./market-data.js";
// Authored practice material; external videos are public and attributed in the classroom.
export const youtubeSource = "Curso em Vídeo · Gustavo Guanabara";
export const seedCourses = [
  {
    id: "web",
    title: "Da ideia à tua primeira página",
    subtitle: "HTML & CSS do zero",
    category: "Tecnologia",
    level: "Iniciante",
    price: 0,
    color: "sage",
    symbol: "</>",
    instructor: "Curadoria Kuvona",
    initials: "KV",
    minutes: 78,
    featured: true,
    description:
      "Entende a linguagem da web e dá forma à tua primeira página. Uma introdução acessível, com vídeos públicos do Curso em Vídeo e exercícios práticos da Kuvona.",
    outcomes: [
      "Estruturar uma página com HTML semântico",
      "Preparar o teu ambiente de desenvolvimento",
      "Inserir imagens com descrições acessíveis",
      "Publicar o teu primeiro pequeno projeto",
    ],
    lessons: [
      {
        id: "web-1",
        title: "Um primeiro olhar para a web",
        module: "01 · O ponto de partida",
        minutes: 15,
        video: "Ejkb_YpuHWs",
        source: youtubeSource,
        content: [
          "Uma página web combina estrutura, apresentação e comportamento. O HTML organiza o conteúdo; o CSS define como ele aparece; o JavaScript responde às interações.",
          "Enquanto vês a introdução, identifica três páginas que usas todos os dias. Que conteúdo é essencial em cada uma? O que mudarias para ajudar quem as visita?",
        ],
        task: "Desenha no papel a estrutura de uma página pessoal: um título, uma apresentação, três competências e uma forma de contacto.",
      },
      {
        id: "web-2",
        title: "O teu mapa de aprendizagem",
        module: "01 · O ponto de partida",
        minutes: 18,
        video: "jgQjeqGRdgA",
        source: youtubeSource,
        content: [
          "Começa por pequenos objetivos. Primeiro cria um documento HTML, depois acrescenta estilos e só então explora interações.",
          "Uma rotina de 25 minutos com um objetivo concreto costuma ser mais fácil de manter do que sessões longas e pouco definidas. Usa a agenda para reservar a tua próxima sessão.",
        ],
        task: "Escreve três coisas que queres conseguir construir no final deste percurso.",
      },
      {
        id: "web-3",
        title: "Prepara as tuas ferramentas",
        module: "02 · Mãos à obra",
        minutes: 25,
        video: "UForX7ehChM",
        source: youtubeSource,
        content: [
          "Precisas de um editor de texto e de um navegador. Cria uma pasta para o projeto e guarda nela um ficheiro chamado index.html.",
          "Um bom projeto começa organizado: usa nomes simples, guarda imagens numa pasta própria e verifica as alterações no navegador.",
        ],
        task: "Cria o ficheiro index.html com um título e um parágrafo. Abre-o no navegador e altera o texto.",
      },
      {
        id: "web-4",
        title: "Imagens que contam uma história",
        module: "02 · Mãos à obra",
        minutes: 20,
        video: "CwOmEetWMnU",
        source: youtubeSource,
        content: [
          "Uma imagem precisa de contexto. Usa o atributo alt para explicar o conteúdo relevante a quem não consegue vê-la.",
          "Escolhe imagens adequadas ao tamanho de apresentação. Ficheiros pequenos ajudam quem aprende com dados móveis. Confirma sempre que tens autorização para usar uma imagem.",
        ],
        task: "Acrescenta uma imagem ao teu projeto, com texto alternativo útil. Compara o tamanho do ficheiro original com uma versão otimizada.",
      },
    ],
    quiz: [
      {
        question: "Qual é o papel principal do HTML?",
        options: [
          "Estruturar o conteúdo de uma página",
          "Processar pagamentos",
          "Definir apenas as cores",
        ],
        correct: 0,
        explanation: "HTML descreve a estrutura e o significado do conteúdo.",
      },
      {
        question: "O que deve comunicar o atributo alt?",
        options: [
          "O preço da imagem",
          "Uma descrição relevante da imagem",
          "O nome do navegador",
        ],
        correct: 1,
        explanation:
          "O texto alternativo torna a informação da imagem acessível.",
      },
      {
        question: "Qual é uma boa prática para dados móveis?",
        options: [
          "Usar sempre a imagem maior",
          "Carregar vídeos automaticamente",
          "Otimizar o tamanho das imagens",
        ],
        correct: 2,
        explanation:
          "Imagens otimizadas reduzem o consumo de dados e o tempo de carregamento.",
      },
    ],
    resources: [
      {
        title: "Checklist da primeira página",
        text: "CHECKLIST KUVONA — PRIMEIRA PÁGINA\n\n[ ] Documento index.html\n[ ] Título descritivo\n[ ] Cabeçalho e conteúdo principal\n[ ] Imagens com alt\n[ ] Links com texto claro\n[ ] Verificação no telemóvel\n[ ] Imagens otimizadas\n",
      },
    ],
  },
  {
    id: "business",
    title: "O teu negócio começa aqui",
    subtitle: "Da ideia ao primeiro cliente",
    category: "Negócios",
    level: "Iniciante",
    price: 150000,
    color: "clay",
    symbol: "↗",
    instructor: "Equipa Kuvona",
    initials: "KV",
    minutes: 45,
    description:
      "Transforma uma ideia num plano simples e testável. Trabalha o problema do cliente, a tua proposta de valor e a primeira experiência de venda com exemplos práticos.",
    outcomes: [
      "Definir um cliente e um problema concreto",
      "Construir uma proposta de valor clara",
      "Planear uma experiência de validação",
      "Separar receita, custo e margem",
    ],
    lessons: [
      {
        id: "biz-1",
        title: "Começa pelo problema",
        module: "01 · Descobrir",
        minutes: 15,
        content: [
          "Uma boa ideia de negócio começa com um problema observável. Em vez de “quero abrir uma loja”, experimenta “quero ajudar estudantes a encontrar refeições acessíveis perto da faculdade”.",
          "Conversa com potenciais clientes antes de investir. Pergunta o que fazem hoje, quanto tempo perdem e o que já tentaram. Evita perguntar apenas se gostam da tua ideia: elogios não são vendas.",
        ],
        task: "Escreve o problema em uma frase e prepara cinco perguntas abertas para três potenciais clientes.",
      },
      {
        id: "biz-2",
        title: "Uma proposta de valor clara",
        module: "01 · Descobrir",
        minutes: 15,
        content: [
          "Uma proposta de valor liga um cliente, um resultado e uma diferença. Exemplo: “Entregamos almoços caseiros a estudantes do bairro, com menu do dia e recolha num ponto próximo”.",
          "Escolhe uma promessa que possas cumprir. Explica o que ofereces, para quem e como resolve uma necessidade. Não precisas de servir todas as pessoas desde o primeiro dia.",
        ],
        task: "Completa: Ajudamos [cliente] a conseguir [resultado] através de [solução]. Pede a alguém que explique a proposta por palavras próprias.",
      },
      {
        id: "biz-3",
        title: "Testa pequeno, aprende cedo",
        module: "02 · Validar",
        minutes: 15,
        content: [
          "Uma experiência pequena pode ser uma pré-reserva, uma amostra ou uma conversa com proposta concreta. Define o que queres aprender, o limite de investimento e um critério de sucesso.",
          "Regista preço, custo direto e quantidade. A margem de contribuição é a receita menos os custos variáveis; ainda terá de cobrir custos fixos. Estes exemplos são exercícios educativos.",
        ],
        task: "Planeia uma experiência de sete dias: público, oferta, canal, orçamento e sinal que te fará continuar ou mudar.",
      },
    ],
    quiz: [
      {
        question: "Qual é a melhor primeira evidência de um problema?",
        options: [
          "Um logótipo bonito",
          "Entrevistas sobre dificuldades reais do cliente",
          "O número de seguidores de um concorrente",
        ],
        correct: 1,
        explanation:
          "As experiências reais dos clientes ajudam a testar a necessidade.",
      },
      {
        question: "Uma proposta de valor deve explicar…",
        options: [
          "Cliente, resultado e solução",
          "Apenas o nome do negócio",
          "Todas as ideias futuras",
        ],
        correct: 0,
        explanation: "A clareza liga a oferta a uma necessidade concreta.",
      },
      {
        question: "O objetivo de um teste pequeno é…",
        options: [
          "Garantir lucro para sempre",
          "Evitar falar com clientes",
          "Aprender com um investimento limitado",
        ],
        correct: 2,
        explanation:
          "Uma experiência reduz incerteza antes de um investimento maior.",
      },
    ],
    resources: [
      {
        title: "Plano de validação em uma página",
        text: "PLANO DE VALIDAÇÃO — KUVONA\n\nCliente:\nProblema observado:\nSolução proposta:\nPerguntas de entrevista:\nExperiência de 7 dias:\nLimite de investimento:\nCritério de sucesso:\nO que aprendemos:\nPróximo passo:\n",
      },
    ],
  },
  {
    id: "design",
    title: "Design que faz sentido",
    subtitle: "Comunicação visual essencial",
    category: "Criatividade",
    level: "Iniciante",
    price: 95000,
    color: "lavender",
    symbol: "Aa",
    instructor: "Equipa Kuvona",
    initials: "KV",
    minutes: 40,
    description:
      "Organiza informação, escolhe tipografia e cria composições claras. Um percurso prático para melhorar os teus cartazes, apresentações e publicações.",
    outcomes: [
      "Criar hierarquia visual",
      "Escolher pares tipográficos legíveis",
      "Usar contraste e espaço em branco",
      "Rever uma composição com critérios claros",
    ],
    lessons: [
      {
        id: "des-1",
        title: "Decide o que vem primeiro",
        module: "01 · Ver com intenção",
        minutes: 12,
        content: [
          "Uma composição tem uma ordem de leitura. O título chama a atenção, o subtítulo explica e os detalhes ajudam a agir. Quando tudo tem o mesmo tamanho, o leitor precisa de adivinhar o que importa.",
          "Define uma única mensagem principal e usa escala, peso e espaço para a destacar. Alinha elementos relacionados para que a estrutura seja fácil de perceber.",
        ],
        task: "Escolhe um cartaz e identifica a primeira, segunda e terceira informação que lês. Reorganiza-o num esboço simples.",
      },
      {
        id: "des-2",
        title: "Tipografia e espaço",
        module: "01 · Ver com intenção",
        minutes: 14,
        content: [
          "Escolhe uma fonte para títulos e outra, se precisares, para o texto. Menos estilos tornam o sistema mais consistente. Dá ao texto um tamanho confortável e um comprimento de linha moderado.",
          "O espaço vazio separa grupos e cria ritmo. Aproxima informação relacionada e afasta secções com funções diferentes. Não precisas de preencher cada centímetro.",
        ],
        task: "Cria duas versões do mesmo anúncio: uma com pouco espaço e outra com margens generosas. Compara a leitura.",
      },
      {
        id: "des-3",
        title: "Cor com propósito",
        module: "02 · Criar e rever",
        minutes: 14,
        content: [
          "Escolhe uma cor dominante, uma cor de destaque e tons neutros. Usa o destaque para a ação principal. Evita depender apenas da cor para transmitir um estado: combina texto ou símbolos.",
          "Revê a composição num ecrã pequeno. O texto mantém-se legível? A ação está clara? Há contraste suficiente? Pede a uma pessoa para resumir a mensagem em cinco segundos.",
        ],
        task: "Finaliza um cartaz para uma atividade local com título, data, local e ação principal. Testa a leitura num telemóvel.",
      },
    ],
    quiz: [
      {
        question: "Para que serve a hierarquia visual?",
        options: [
          "Usar mais cores",
          "Orientar a ordem de leitura",
          "Preencher todo o espaço",
        ],
        correct: 1,
        explanation:
          "A hierarquia ajuda a perceber o que é principal e o que é secundário.",
      },
      {
        question: "O espaço em branco ajuda a…",
        options: [
          "Agrupar informação e melhorar a leitura",
          "Eliminar a necessidade de texto",
          "Garantir que o cartaz vende",
        ],
        correct: 0,
        explanation: "O espaço organiza a composição e dá ritmo à leitura.",
      },
      {
        question: "Um estado de erro deve ser comunicado…",
        options: [
          "Apenas pela cor vermelha",
          "Sem qualquer indicação",
          "Com texto e um sinal visual",
        ],
        correct: 2,
        explanation:
          "Texto e sinal visual tornam a mensagem compreensível para mais pessoas.",
      },
    ],
    resources: [
      {
        title: "Guia de revisão visual",
        text: "REVISÃO VISUAL — KUVONA\n\n[ ] Uma mensagem principal\n[ ] Ordem de leitura clara\n[ ] Texto legível no telemóvel\n[ ] Alinhamentos consistentes\n[ ] Espaço entre grupos\n[ ] Cor com função\n[ ] Ação principal identificável\n",
      },
    ],
  },
  {
    id: "digital",
    title: "Mais foco, menos ruído",
    subtitle: "Produtividade digital",
    category: "Carreira",
    level: "Todos os níveis",
    price: 0,
    color: "sky",
    symbol: "◎",
    instructor: "Equipa Kuvona",
    initials: "KV",
    minutes: 30,
    description:
      "Cria um sistema simples para organizar tarefas, proteger o teu tempo e aprender de forma consistente. Três aulas curtas para pôr em prática hoje.",
    outcomes: [
      "Transformar objetivos em próximas ações",
      "Reservar tempo para trabalho concentrado",
      "Rever prioridades todas as semanas",
    ],
    lessons: [
      {
        id: "dig-1",
        title: "Liberta a tua cabeça",
        module: "01 · Um sistema simples",
        minutes: 10,
        content: [
          "Captura tarefas num único lugar. Uma lista não precisa de ser perfeita; precisa de te ajudar a lembrar o que fazer. Separa projetos grandes das próximas ações concretas.",
          "“Aprender programação” é um objetivo. “Fazer a primeira aula durante 25 minutos” é uma próxima ação. Quanto mais clara for a ação, mais fácil será começar.",
        ],
        task: "Escreve cinco tarefas pendentes e transforma cada uma numa ação com verbo, objeto e resultado visível.",
      },
      {
        id: "dig-2",
        title: "Dá lugar ao que importa",
        module: "01 · Um sistema simples",
        minutes: 10,
        content: [
          "Reserva blocos curtos na agenda para uma única atividade. Desliga notificações que não são necessárias durante esse bloco e prepara os materiais antes de começar.",
          "Inclui pausas e margem para imprevistos. Um plano realista respeita o tempo e a energia disponíveis. Usa a agenda da Kuvona para marcar uma sessão de estudo.",
        ],
        task: "Agenda dois blocos de 25 minutos esta semana e define o resultado esperado para cada um.",
      },
      {
        id: "dig-3",
        title: "A revisão que muda a semana",
        module: "02 · Manter o ritmo",
        minutes: 10,
        content: [
          "Uma revisão semanal fecha ciclos. Olha para o que concluíste, o que ficou bloqueado e o que deixou de ser importante. Ajusta o plano em vez de acumular culpa.",
          "Escolhe poucas prioridades para a semana seguinte. Um sistema útil pode mudar contigo: se está pesado, simplifica-o. O objetivo é apoiar o trabalho, não criar mais trabalho.",
        ],
        task: "Reserva dez minutos no fim da semana: revê a lista, elimina uma tarefa sem valor e escolhe três prioridades.",
      },
    ],
    quiz: [
      {
        question: "Qual é uma próxima ação concreta?",
        options: [
          "Ser mais produtivo",
          "Melhorar a carreira",
          "Ler a primeira aula durante 20 minutos",
        ],
        correct: 2,
        explanation:
          "Uma ação concreta permite começar e reconhecer quando está concluída.",
      },
      {
        question: "Um bloco de foco deve ter…",
        options: [
          "Uma atividade definida",
          "Todas as tarefas ao mesmo tempo",
          "Notificações sempre abertas",
        ],
        correct: 0,
        explanation:
          "Uma atividade definida reduz a troca constante de contexto.",
      },
      {
        question: "A revisão semanal serve para…",
        options: [
          "Repetir o plano sem mudanças",
          "Ajustar prioridades e resolver pendências",
          "Acrescentar tarefas sem limite",
        ],
        correct: 1,
        explanation: "A revisão mantém o sistema alinhado com a realidade.",
      },
    ],
    resources: [
      {
        title: "Modelo de revisão semanal",
        text: "REVISÃO SEMANAL — KUVONA\n\nO que concluí:\nO que aprendi:\nO que ficou bloqueado:\nO que vou deixar de fazer:\nTrês prioridades da próxima semana:\n1.\n2.\n3.\nPróxima sessão de estudo:\n",
      },
    ],
  },
];

seedCourses.push(...additionalCourses);
for (const course of seedCourses)
  Object.assign(course, editorial[course.id] || {});
