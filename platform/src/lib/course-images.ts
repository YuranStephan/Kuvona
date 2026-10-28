/** Locally hosted, AI-generated course photography. New courses retain the patterned fallback. */
export const courseImages = [
  {
    seed: 1000,
    key: "web",
    label: "HTML e CSS",
    alt: "Computador com uma página web e código HTML numa mesa de estudo",
  },
  {
    seed: 8919,
    key: "business",
    label: "Empreendedorismo",
    alt: "Planeamento de um pequeno negócio, com produtos e encomendas",
  },
  {
    seed: 16838,
    key: "design",
    label: "Design",
    alt: "Composição de um cartaz com amostras de cor e tipografia",
  },
  {
    seed: 24757,
    key: "digital",
    label: "Produtividade",
    alt: "Organização de tarefas num espaço de trabalho tranquilo",
  },
  {
    seed: 32676,
    key: "sheets",
    label: "Planilhas",
    alt: "Folha de cálculo com tabela, totais e gráfico num computador",
  },
  {
    seed: 40595,
    key: "marketing",
    label: "Marketing de conteúdo",
    alt: "Planeamento de publicações com fotografias e calendário editorial",
  },
  {
    seed: 48514,
    key: "python",
    label: "Python",
    alt: "Programa introdutório em Python num computador",
  },
  {
    seed: 56433,
    key: "career",
    label: "Carreira",
    alt: "Preparação de um currículo para uma entrevista profissional",
  },
] as const;

export function courseImage(seed: number) {
  const image = courseImages.find((item) => item.seed === seed);
  return image ? { ...image, src: `/course-images/${image.key}.webp` } : null;
}
