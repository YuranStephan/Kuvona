# Percurso público da Kuvona

A versão 3 separa a loja de cursos da área do estudante.

```text
Início → Catálogo → Detalhes do curso → Checkout → Confirmação → Aprendizagem
                                  ↘ Pré-visualização gratuita
                                  ↘ Perfil do instrutor
```

Um cartão no catálogo, na lista de desejos ou nas recomendações abre sempre os detalhes. Os cartões não iniciam compras. Um curso já inscrito também tem detalhes acessíveis; nessa página o botão leva à aprendizagem.

## Páginas

| Página                     | Comportamento                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `#home`                    | Áreas, pesquisa, seleção editorial e cursos gratuitos                                   |
| `#catalog`                 | Pesquisa, área/preço/nível/duração, ordenação, grelha/lista e paginação                 |
| `#course/:id`              | Objetivos, conteúdo, requisitos, público, projeto, instrutor, opiniões, FAQ e inscrição |
| Pré-visualização           | Primeira aula e vídeo, quando existe, sem inscrição ou progresso                        |
| `#instructor/:slug`        | Apresentação da equipa e os seus cursos/aulas efetivamente presentes                    |
| `#favorites`               | Cursos guardados, sempre com ligação aos detalhes                                       |
| `#checkout/:id`            | Curso, dados do estudante e método de pagamento demonstrativo                           |
| `#purchase/:orderId`       | Pedido pendente, simulação do resultado e entrada na aprendizagem                       |
| `#purchase/free/:courseId` | Confirmação de inscrição gratuita efetivamente criada                                   |
| `#teach`                   | Proposta de curso guardada no apoio local                                               |
| `#about`                   | Proposta e funcionamento da academia                                                    |

## Regras do percurso

O checkout só começa pelos detalhes. Um link direto sem intenção criada nessa página mostra um caminho de regresso ao curso. A intenção dura 30 minutos, vive na `sessionStorage` da aba e é removida quando o pedido é criado. Um curso com pedido pendente recupera esse pedido, sem duplicação. Esta é uma regra de navegação, não uma barreira de segurança: a futura API deve validar tudo independentemente do browser.

A pré-visualização não altera inscrição ou progresso. Fechar o diálogo destrói a reprodução YouTube, incluindo com Escape.

## Dados e edição

O catálogo inicial tem 8 cursos, 25 aulas e 6 áreas. Os novos cursos têm conteúdo escrito, exercícios, avaliação e material de apoio. O editor inclui requisitos, público, competências, projeto e apresentação da equipa.

As opiniões começam vazias. Depois de uma aula concluída, o estudante pode escrever/atualizar uma avaliação por curso. Médias e distribuição usam esses dados locais. As contagens no perfil do instrutor derivam do catálogo; não há estatísticas comerciais inventadas.

O catálogo anterior recebe os novos percursos e metadados em falta sem apagar cursos editados, inscrições, notas ou progresso. A chave continua `kuvona-v2`; a revisão do catálogo é independente da versão da aplicação.

## Referências e continuidade

Foram consultadas a [página inicial da Udemy](https://www.udemy.com/) e uma [página pública de curso](https://www.udemy.com/course/the-complete-web-development-bootcamp/) para a sequência de descoberta, objetivos, currículo, instrutor e pré-visualização. A identidade, o texto e o conteúdo da Kuvona são próprios. Não se importaram avaliações, estatísticas ou materiais do curso de referência.

O Claude deve preservar este percurso e substituir gradualmente as fronteiras locais por identidade, publicação, autorização, pedidos, gateway e armazenamento partilhado reais. Os testes atuais verificam a demonstração, não a segurança de produção.
