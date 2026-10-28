// Editorial content for the storefront. No invented instructors, sales or ratings.
export const editorial = {
  web: {
    skills: ["HTML", "CSS", "Acessibilidade"],
    requirements: [
      "Um computador com navegador e editor de texto.",
      "Não precisas de experiência em programação.",
    ],
    audience: [
      "Quem quer construir a sua primeira página.",
      "Estudantes e profissionais a explorar desenvolvimento web.",
    ],
    instructorBio:
      "A Curadoria Kuvona organiza um percurso introdutório com vídeos públicos do Curso em Vídeo, de Gustavo Guanabara, e exercícios escritos para esta demonstração. A Kuvona não representa nem vende o curso original.",
    project:
      "Uma página pessoal com apresentação, competências, imagem acessível e contactos.",
  },
  business: {
    skills: ["Empreendedorismo", "Validação", "Proposta de valor"],
    requirements: [
      "Uma ideia ou um problema que gostarias de explorar.",
      "Um caderno ou documento para registar as atividades.",
    ],
    audience: [
      "Pessoas que querem testar uma ideia antes de investir.",
      "Pequenos empreendedores a clarificar a sua oferta.",
    ],
    instructorBio:
      "A Equipa Kuvona é a autoria editorial dos conteúdos de prática desta demonstração. Os exercícios usam exemplos simples para explorar conceitos de negócio; não constituem consultoria financeira.",
    project:
      "Um plano de validação de sete dias com cliente, oferta, orçamento e critério de sucesso.",
  },
  design: {
    skills: ["Hierarquia visual", "Tipografia", "Composição"],
    requirements: [
      "Um programa de apresentação, desenho ou apenas papel.",
      "Vontade de observar, experimentar e rever.",
    ],
    audience: [
      "Quem cria cartazes, apresentações ou publicações.",
      "Iniciantes que querem comunicar com mais clareza.",
    ],
    instructorBio:
      "Conteúdo escrito pela Equipa Kuvona para praticar comunicação visual através de exercícios de observação, composição e revisão.",
    project:
      "Um cartaz de uma atividade local com hierarquia clara, tipografia legível e ação principal.",
  },
  digital: {
    skills: ["Foco", "Organização", "Rotinas"],
    requirements: [
      "Uma agenda em papel ou digital.",
      "Alguns minutos para aplicar os exercícios ao teu dia.",
    ],
    audience: [
      "Estudantes a construir uma rotina de aprendizagem.",
      "Profissionais que querem organizar melhor as próximas ações.",
    ],
    instructorBio:
      "A Equipa Kuvona desenvolve material editorial de prática para esta demonstração, com propostas simples que cada estudante pode adaptar à sua realidade.",
    project:
      "Uma lista de próximas ações, duas sessões de foco e um modelo de revisão semanal.",
  },
};

function practiceCourse({
  id,
  title,
  subtitle,
  category,
  price,
  color,
  symbol,
  skills,
  description,
  outcomes,
  requirements,
  audience,
  project,
  lessons,
  quiz,
}) {
  return {
    id,
    title,
    subtitle,
    category,
    price,
    color,
    symbol,
    skills,
    description,
    outcomes,
    requirements,
    audience,
    project,
    level: "Iniciante",
    instructor: "Equipa Kuvona",
    initials: "KV",
    instructorBio:
      "Conteúdo editorial e exercícios escritos pela Equipa Kuvona para esta demonstração. Aprende os conceitos com exemplos curtos e aplica-os ao teu próprio projeto.",
    minutes: lessons.reduce((n, l) => n + l.minutes, 0),
    lessons: lessons.map((l, i) => ({
      id: `${id}-${i + 1}`,
      module: i === 0 ? "01 · Fundamentos" : "02 · Aplicar e praticar",
      ...l,
    })),
    quiz,
    resources: [
      {
        title: `Caderno de prática · ${subtitle}`,
        text: `KUVONA · ${title}\n\nObjetivo do meu projeto:\n\n${lessons.map((l, i) => `${i + 1}. ${l.title}\nExercício: ${l.task}\n\nAs minhas notas:\n\n`).join("")}Próximo passo:\n`,
      },
    ],
  };
}
export const additionalCourses = [
  practiceCourse({
    id: "sheets",
    title: "Planilhas que trabalham contigo",
    subtitle: "Folhas de cálculo essenciais",
    category: "Produtividade",
    price: 120000,
    color: "sage",
    symbol: "Σ",
    skills: ["Fórmulas", "Tabelas", "Organização de dados"],
    description:
      "Organiza informação e transforma tarefas repetidas em cálculos simples. Um percurso introdutório que podes praticar no Excel, Google Sheets ou LibreOffice.",
    outcomes: [
      "Organizar uma tabela com cabeçalhos claros",
      "Usar referências e fórmulas simples",
      "Construir um pequeno resumo de despesas",
    ],
    requirements: [
      "Acesso a uma aplicação de folhas de cálculo.",
      "Não precisas de saber fórmulas.",
    ],
    audience: [
      "Quem trabalha com listas e registos.",
      "Estudantes a dar os primeiros passos em folhas de cálculo.",
    ],
    project:
      "Uma folha de despesas com categorias, totais e revisão dos dados.",
    lessons: [
      {
        title: "Dá estrutura aos teus dados",
        minutes: 15,
        content: [
          "Uma linha deve representar um registo e uma coluna uma característica. Numa lista de despesas, usa colunas como data, descrição, categoria e valor. Evita misturar subtotais com os registos originais.",
          "Cabeçalhos claros, um formato consistente para datas e valores e a ausência de células fundidas dentro da tabela tornam os dados mais fáceis de filtrar e analisar.",
        ],
        task: "Cria uma tabela com dez despesas de exemplo e quatro colunas: data, descrição, categoria e valor.",
      },
      {
        title: "Fórmulas sem mistério",
        minutes: 20,
        content: [
          "Uma fórmula começa com o sinal de igual. Em vez de escrever números fixos, referencia as células: =B2*C2 calcula o produto dos valores dessas células. Ao copiar a fórmula, as referências relativas acompanham a nova posição.",
          "A função de soma pode ter um nome diferente conforme o idioma da aplicação: SUM ou SOMA. Experimenta o assistente da tua aplicação e confirma sempre se o intervalo inclui os dados pretendidos.",
        ],
        task: "Acrescenta quantidade e preço unitário à tua tabela. Calcula o total por linha e soma os totais.",
      },
      {
        title: "Uma revisão que evita surpresas",
        minutes: 15,
        content: [
          "Antes de apresentar um resultado, procura valores em falta, linhas repetidas e formatos inconsistentes. Compara o total com uma conta manual de algumas linhas para detetar erros simples.",
          "Um resumo precisa de responder a uma pergunta. Por exemplo: quanto foi registado em cada categoria? Começa por um filtro ou uma tabela de resumo, com rótulos e unidades visíveis.",
        ],
        task: "Revê três registos manualmente e cria um resumo das despesas por categoria.",
      },
    ],
    quiz: [
      {
        question: "Numa tabela organizada, uma linha deve representar…",
        options: ["Um registo", "Várias tabelas diferentes", "Apenas o título"],
        correct: 0,
        explanation:
          "Uma estrutura consistente facilita filtros, cálculos e revisão.",
      },
      {
        question: "Qual é uma fórmula com referências de células?",
        options: ["Total do mês", "=B2*C2", "B2 vezes preço"],
        correct: 1,
        explanation:
          "O sinal de igual inicia a fórmula e as referências apontam para os valores.",
      },
      {
        question: "Antes de partilhar um total, convém…",
        options: [
          "Esconder os dados originais",
          "Mudar apenas a cor",
          "Verificar o intervalo e alguns cálculos manualmente",
        ],
        correct: 2,
        explanation:
          "A revisão ajuda a encontrar intervalos incorretos e dados em falta.",
      },
    ],
  }),
  practiceCourse({
    id: "marketing",
    title: "Conteúdo com propósito",
    subtitle: "Marketing digital para começar",
    category: "Marketing",
    price: 180000,
    color: "clay",
    symbol: "↗",
    skills: ["Conteúdo", "Público", "Métricas"],
    description:
      "Passa de publicar por publicar a comunicar com uma intenção. Define o teu público, planeia conteúdos úteis e escolhe métricas ligadas ao teu objetivo.",
    outcomes: [
      "Definir um objetivo de comunicação",
      "Organizar um calendário editorial simples",
      "Distinguir atenção de uma ação útil",
    ],
    requirements: [
      "Uma marca, projeto ou atividade para usar como exemplo.",
      "Não é necessário comprar anúncios.",
    ],
    audience: [
      "Pequenos negócios e projetos locais.",
      "Quem quer começar a comunicar nas redes com mais intenção.",
    ],
    project:
      "Um calendário de sete conteúdos com público, mensagem e ação desejada.",
    lessons: [
      {
        title: "Antes da publicação, o objetivo",
        minutes: 15,
        content: [
          "Começa por decidir o que uma pessoa deve compreender ou fazer depois de ver o teu conteúdo. Conhecer uma oferta, reservar uma conversa e regressar à loja são objetivos diferentes.",
          "Descreve uma pessoa e uma necessidade concreta. A linguagem deve aproximar-se das perguntas dessa pessoa, em vez de tentar impressionar todos os públicos ao mesmo tempo.",
        ],
        task: "Escolhe um projeto e escreve um objetivo, um público e uma ação desejada.",
      },
      {
        title: "Sete conteúdos, uma direção",
        minutes: 20,
        content: [
          "Um calendário editorial evita recomeçar do zero todos os dias. Alterna explicações úteis, demonstrações, respostas a dúvidas e convites claros para a próxima ação.",
          "Adapta o formato à mensagem e ao tempo disponível. Um conteúdo simples que responde a uma pergunta pode ser mais útil do que uma produção elaborada sem objetivo.",
        ],
        task: "Planeia sete conteúdos. Para cada um, regista a pergunta do público, a mensagem e a próxima ação.",
      },
      {
        title: "Mede para aprender",
        minutes: 15,
        content: [
          "As visualizações mostram alcance, mas não explicam sozinhas o resultado de um negócio. Escolhe métricas próximas do teu objetivo: pedidos de informação, reservas ou outras ações que possas observar.",
          "Compara períodos semelhantes e regista o contexto. Um resultado isolado não prova que uma mudança causou um efeito. Usa os dados para formular uma próxima experiência pequena.",
        ],
        task: "Escolhe duas métricas para o teu calendário e define como vais registá-las durante uma semana.",
      },
    ],
    quiz: [
      {
        question: "Antes de criar um conteúdo, define…",
        options: [
          "Apenas a cor",
          "Público, objetivo e ação desejada",
          "O número de seguidores que gostarias de ter",
        ],
        correct: 1,
        explanation: "A intenção orienta a mensagem e a escolha do formato.",
      },
      {
        question: "Um calendário editorial ajuda a…",
        options: [
          "Organizar mensagens e reduzir improviso",
          "Garantir vendas",
          "Publicar o mesmo texto todos os dias",
        ],
        correct: 0,
        explanation: "O calendário coordena conteúdo e objetivos.",
      },
      {
        question: "Uma métrica útil depende…",
        options: [
          "Apenas de ser grande",
          "Do que está na moda",
          "Do objetivo que queres observar",
        ],
        correct: 2,
        explanation:
          "As métricas devem ajudar a perceber o resultado pretendido.",
      },
    ],
  }),
  practiceCourse({
    id: "python",
    title: "Pensa em código",
    subtitle: "Primeiros passos com Python",
    category: "Tecnologia",
    price: 220000,
    color: "sky",
    symbol: "{ }",
    skills: ["Python", "Lógica", "Programação"],
    description:
      "Entende variáveis, decisões e repetições com exemplos pequenos. Uma introdução de leitura e prática para perder o medo da primeira linha de código.",
    outcomes: [
      "Representar valores em variáveis",
      "Usar condições para tomar decisões",
      "Percorrer uma lista com uma repetição",
    ],
    requirements: [
      "Um ambiente Python disponível no teu computador ou um editor de prática.",
      "Não precisas de experiência em programação.",
    ],
    audience: [
      "Pessoas curiosas sobre programação.",
      "Estudantes a aprender lógica com exemplos simples.",
    ],
    project:
      "Um programa que percorre uma lista de tarefas e apresenta um resumo.",
    lessons: [
      {
        title: "Valores com nome",
        minutes: 20,
        content: [
          'Uma variável associa um nome a um valor. Por exemplo, nome = "Ana" guarda um texto, e aulas = 3 associa um número inteiro ao nome aulas. Usa nomes que expliquem o que o valor representa.',
          "A instrução print(nome) apresenta o valor. Experimenta alterar os valores e observar a saída. O objetivo inicial é compreender a relação entre o que escreves e o resultado.",
        ],
        task: "Cria variáveis para o teu nome, um curso e o número de aulas. Apresenta os três valores com print.",
      },
      {
        title: "Se isto, então aquilo",
        minutes: 20,
        content: [
          "Uma condição permite escolher um caminho. Em Python, if aulas > 0: pode iniciar um bloco que só executa quando a comparação é verdadeira. A indentação faz parte da estrutura do programa.",
          "Um else oferece um caminho alternativo. Testa valores de ambos os lados da condição para perceber se cada caminho produz o resultado esperado.",
        ],
        task: 'Cria uma condição que apresente "Continuar a aprender" quando há aulas por concluir e "Percurso terminado" caso contrário.',
      },
      {
        title: "Uma lista, vários passos",
        minutes: 20,
        content: [
          'Uma lista reúne valores: tarefas = ["Ler", "Praticar", "Rever"]. Uma repetição com for tarefa in tarefas: permite trabalhar cada valor por sua vez.',
          "Começa por apresentar cada tarefa. Depois experimenta acrescentar ou retirar um elemento e observa como a repetição acompanha a mudança sem copiar mais linhas de código.",
        ],
        task: "Cria uma lista de três tarefas de estudo e percorre-a com for, apresentando uma tarefa por linha.",
      },
    ],
    quiz: [
      {
        question: "Uma variável permite…",
        options: [
          "Associar um nome a um valor",
          "Executar apenas desenhos",
          "Eliminar todos os erros",
        ],
        correct: 0,
        explanation:
          "O nome torna o valor utilizável e compreensível no programa.",
      },
      {
        question: "Para escolher entre dois caminhos usa-se…",
        options: ["Apenas print", "Uma condição if/else", "O nome do ficheiro"],
        correct: 1,
        explanation:
          "A condição avalia uma expressão e escolhe o bloco apropriado.",
      },
      {
        question: "Um for sobre uma lista ajuda a…",
        options: [
          "Evitar guardar valores",
          "Mudar a cor do editor",
          "Percorrer os seus elementos",
        ],
        correct: 2,
        explanation: "A repetição executa o bloco para cada elemento da lista.",
      },
    ],
  }),
  practiceCourse({
    id: "career",
    title: "O teu próximo capítulo profissional",
    subtitle: "CV e preparação para entrevistas",
    category: "Carreira",
    price: 0,
    color: "lavender",
    symbol: "→",
    skills: ["Currículo", "Entrevistas", "Comunicação"],
    description:
      "Conta o teu percurso com clareza. Organiza o CV, escolhe exemplos concretos e prepara uma conversa profissional com intenção.",
    outcomes: [
      "Adaptar um CV a uma oportunidade",
      "Descrever experiências com exemplos concretos",
      "Preparar perguntas para uma entrevista",
    ],
    requirements: [
      "Um rascunho do teu percurso académico ou profissional.",
      "Uma oportunidade ou função que gostarias de explorar.",
    ],
    audience: [
      "Quem procura a primeira oportunidade.",
      "Profissionais a atualizar a forma de apresentar o seu percurso.",
    ],
    project:
      "Um CV revisto e três exemplos de experiências preparados para uma entrevista.",
    lessons: [
      {
        title: "Clareza antes do formato",
        minutes: 15,
        content: [
          "Um CV ajuda alguém a compreender a relação entre o teu percurso e uma oportunidade. Organiza contactos, apresentação curta, experiência, formação e competências relevantes.",
          "Seleciona informação verdadeira e específica. Se ainda não tens experiência profissional, podes descrever projetos académicos, trabalho voluntário e outras atividades relevantes sem os apresentar como empregos.",
        ],
        task: "Revê o teu CV e identifica três informações que ajudam a perceber a tua relação com a função pretendida.",
      },
      {
        title: "Mostra com exemplos",
        minutes: 15,
        content: [
          'Dizer "sou organizado" é menos informativo do que explicar uma situação em que planeaste tarefas e cumpriste um prazo. Prepara exemplos com contexto, ação e resultado observado.',
          "Usa resultados que consigas explicar. Não inventes números ou responsabilidades. Se o trabalho foi de equipa, distingue a tua contribuição do resultado coletivo.",
        ],
        task: "Escreve três exemplos curtos: uma dificuldade, o que fizeste e o resultado que observaste.",
      },
      {
        title: "Uma entrevista é uma conversa",
        minutes: 15,
        content: [
          "Lê a descrição da oportunidade e prepara perguntas sobre a função, a equipa e o modo de trabalhar. Organiza o que precisas de levar e confirma os detalhes da entrevista.",
          "Pratica uma apresentação curta em voz alta. Numa pergunta difícil, podes pedir um momento para organizar a resposta. Depois da conversa, regista o que aprendeste e o que queres melhorar.",
        ],
        task: "Pratica uma apresentação de um minuto e prepara três perguntas relevantes para a pessoa que te vai entrevistar.",
      },
    ],
    quiz: [
      {
        question: "Um CV deve apresentar…",
        options: [
          "Todas as informações sem seleção",
          "Informação verdadeira e relevante para a oportunidade",
          "Responsabilidades inventadas",
        ],
        correct: 1,
        explanation:
          "A clareza e a relevância ajudam a compreender o teu percurso.",
      },
      {
        question: "Um exemplo forte inclui…",
        options: [
          "Contexto, ação e resultado observado",
          "Apenas um adjetivo",
          "Só o nome da empresa",
        ],
        correct: 0,
        explanation:
          "Um exemplo concreto mostra como aplicaste uma competência.",
      },
      {
        question: "Antes da entrevista, convém…",
        options: [
          "Decorar respostas sem compreender",
          "Evitar perguntas",
          "Conhecer a oportunidade e preparar exemplos e perguntas",
        ],
        correct: 2,
        explanation:
          "A preparação torna a conversa mais clara e útil para ambas as partes.",
      },
    ],
  }),
];
