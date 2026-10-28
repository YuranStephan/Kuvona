# Capas dos cursos — geração e integração

Criadas com a ferramenta integrada image_gen. Cada imagem foi gerada individualmente, inspecionada e convertida para WebP de 1200 × 750 px. As fotografias são imagens sintéticas ilustrativas, não retratos de estudantes reais. Os originais PNG permanecem na pasta generated_images do Codex.

A seleção usa coverSeed no editor de detalhes. O componente CourseCover mantém os padrões para cursos sem uma imagem da biblioteca. Não foram alterados preços ou IDs de cursos.

| Capa      |  Seed | Asset                                                    | Tamanho |
| --------- | ----: | -------------------------------------------------------- | ------: |
| web       |  1000 | [web.webp](../public/course-images/web.webp)             |   82 KB |
| business  |  8919 | [business.webp](../public/course-images/business.webp)   |   88 KB |
| design    | 16838 | [design.webp](../public/course-images/design.webp)       |  117 KB |
| digital   | 24757 | [digital.webp](../public/course-images/digital.webp)     |   75 KB |
| sheets    | 32676 | [sheets.webp](../public/course-images/sheets.webp)       |  107 KB |
| marketing | 40595 | [marketing.webp](../public/course-images/marketing.webp) |  143 KB |
| python    | 48514 | [python.webp](../public/course-images/python.webp)       |   99 KB |
| career    | 56433 | [career.webp](../public/course-images/career.webp)       |   87 KB |

## Conjunto de prompts

Direção comum aos oito assets:

Use case: photorealistic-natural. Asset type: professional online-course thumbnail, landscape 16:10 edge-to-edge. Premium, concrete education editorial photography for Kuvona. Warm ivory workspace, tactile real materials, natural soft window light, sophisticated camera composition, restrained deep teal and burnt-orange details. A consistent photographic family, not illustrations or abstract patterns. Central subject survives 16:10 and 16:9 crops. No superimposed titles, captions, logos or watermarks. Realistic hands/anatomy and objects. Only understated natural text on actual documents/screens when needed, no fake brands or personal information.

### web

Brief: beginner HTML/CSS course, African learner using a laptop with a real-looking code editor and a personal web page, warm daylight, ivory workspace, deep teal and terracotta details; concrete editorial photography, landscape 16:10, no overlaid titles or branding.

### business

Course: 'O teu negócio começa aqui' — from idea to first customer. Photograph a young adult African small-business founder's hands working at a practical desk: a few neatly wrapped product parcels, a notebook with simple business planning boxes, a calculator and laptop showing a tidy small online shop product layout. Convey turning a modest product idea into a real offering and understanding customers. Three-quarter close view, crisp parcels and planning foreground. No money, currency or sales claims.

### design

Course: 'Design que faz sentido' — visual communication fundamentals. Overhead editorial photograph of a graphic designer's hands arranging a professionally composed poster on ivory paper with colored paper swatches, a typographic specimen 'Aa', a metal ruler and a laptop corner showing the same clean poster grid. Concrete hierarchy, typography and composition tools; terracotta, warm ivory, charcoal and teal palette. The printed composition should look polished and purposeful, not random decorative shapes.

### digital

Course: 'Mais foco, menos ruído' — practical digital productivity. Editorial close photograph of a calm, focused work setup: African adult hand completing a single task in an open planner, a simple analog desk timer, a laptop with a minimal task list and a smartphone set face down to avoid distractions. Warm natural light and clear breathing room; one purposeful activity, not an overloaded desk. Notebook lines and a small check mark, no readable private names or long text.

### sheets

Course: 'Planilhas que trabalham contigo' — spreadsheet essentials. Three-quarter close editorial photograph of a real laptop displaying a beautifully legible spreadsheet structure: clean rows and columns, a highlighted totals row, restrained teal cells and a small ordinary bar chart. An African adult hand on the trackpad, a calculator and a few neatly aligned paper records on the desk. Make the spreadsheet the unmistakable focal point, with realistic screen and keyboard, not generic coding.

### marketing

Course: 'Conteúdo com propósito' — introductory digital content marketing. Overhead editorial photograph of a content creator planning a small campaign: smartphone displaying a clean social post layout with a product photograph, a weekly editorial planning notebook, a small camera and a few printed photo/storyboard cards being arranged by African adult hands. Clear concept of planning useful content for an audience. Teal notebook, subtle burnt-orange objects, warm ivory paper; no platform logos, follower counts, brand claims or ads promises.

### python

Course: 'Pensa em código' — first steps in Python. Three-quarter editorial photograph with a laptop as clear central subject, showing a short realistic Python beginner program with variables, an if statement and a for loop, plus a small clean terminal output pane. African adult learner's hands near the keyboard and a notebook with simple logical steps/checks. The source code should feel like an actual beginner lesson, not matrix graphics, a cyber scene, random charts or a snake mascot. Soft natural light, deep teal notebook and terracotta pencil detail.

### career

Course: 'O teu próximo capítulo profissional' — CV and interview preparation. Editorial photograph of an African adult candidate's hands reviewing a neatly laid-out printed CV beside a slim portfolio and a laptop with a simple document editor. Opposite side of the desk shows a second person's hand with a pen and a clean interview notes sheet, suggesting a supportive professional conversation. No faces required, natural relaxed posture, tidy bright contemporary setting, typography represented by modest tidy document lines rather than readable personal details. Deep teal folder, subtle terracotta detail, warm ivory paper.

## Originais preservados

- web: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-bf50f460-49f4-48aa-a7a8-7b4ecdae8f3c.png`
- business: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-ade73922-8a72-44fa-b750-225512aa5947.png`
- design: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-e6709033-a049-46d8-9e24-1bff4eb26bf1.png`
- digital: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-41cddbbf-105b-4070-b661-8e8b72740d09.png`
- sheets: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-b164f226-fc8a-4b58-9df9-35a67208eed4.png`
- marketing: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-09cad32d-78e0-4c3e-b710-896f9fd5c122.png`
- python: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-328e3183-e7d0-4d26-9cf9-eb5506ccd2fa.png`
- career: `C:\Users\Dell's\.codex\generated_images\01a15e67-ad51-7382-9586-be679a201d96\exec-143b69ce-1b23-4d5b-83b3-ef4ee1dbf7b3.png`
