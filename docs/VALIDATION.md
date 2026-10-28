# Verificação da versão 3

Executada em **22 de outubro de 2026**, no ambiente Windows do projeto, com Node.js 22.22.2.

## Verificações concluídas

| Comando                | Resultado                                                                     |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run check`        | Sintaxe e imports relativos válidos em 13 ficheiros JS/MJS                    |
| `npm test`             | 24 testes aprovados, sem falhas                                               |
| `npm run test:browser` | Fluxos completos aprovados num Chrome headless com perfil temporário separado |

O teste de navegador verificou a loja pública, cartões que abrem detalhes, ausência de compra nos cartões, paginação, bloqueio de entrada direta em checkout, pré-visualização sem inscrição, detalhes completos, inscrição gratuita, avaliações locais, perfis de equipa, propostas de curso, pesquisa, favoritos, inscrição com pagamento simulado, confirmação, conclusão de aulas, avaliação, certificado, notas preservadas após recarregar, reembolso e revogação de acesso. Também criou um curso, acrescentou uma aula, uma pergunta e um material, marcou uma sessão de estudo, criou e respondeu a um pedido de apoio, editou o perfil e importou uma cópia de segurança pela interface.

Foi verificada a ausência de overflow horizontal a 390 px nas páginas públicas, detalhes, perfis, checkout e páginas do estudante, além de screenshots a 1440 px e 390 px e tema escuro. Não foram detetadas exceções JavaScript ou erros da política CSP nos percursos verificados. Foram corrigidos um conflito de CSP que afetava estilos de progresso e o regresso ao catálogo depois da criação de um curso.

O navegador integrado da ferramenta não iniciou. O teste headless precisou de executar fora do ambiente restrito para os processos de renderização responderem. Isto não altera os requisitos de utilização normal: `abrir.bat` ou `npm start`.

## Artefactos locais

- `.qa/desktop.png`: loja pública em ecrã largo.
- `.qa/catalog.png`: catálogo e filtros.
- `.qa/course-details.png`: página completa do curso.
- `.qa/checkout.png`: checkout em ecrã largo.
- `.qa/marketplace-mobile.png`: loja pública no telemóvel, com dados iniciais.
- `.qa/course-mobile.png`: detalhes no telemóvel.
- `.qa/checkout-mobile.png`: checkout no telemóvel.
- `.qa/preview-mobile.png`: pré-visualização no telemóvel.
- `.qa/mobile.png`: painel em telemóvel.
- `.qa/mobile-dark.png`: variante escura em telemóvel.
- `.qa/certificate.png`: certificado no diálogo de apresentação.

São ficheiros gerados e ignorados pelo Git. O perfil usado para testar não contém os dados do utilizador e não altera o perfil normal do navegador.

## Limites desta verificação

Não foram executados pagamentos externos, envio de emails ou autenticação, porque esses serviços não existem nesta demonstração. A reprodução efetiva e a disponibilidade dos vídeos YouTube não foram testadas pelo teste offline. O código usa a API oficial e mantém um link direto para cada vídeo.

O workflow GitHub Actions está preparado em `.github/workflows/checks.yml`, mas não foi executado num repositório remoto nesta sessão. Os testes locais são evidência de comportamento da demonstração, não uma auditoria de segurança de uma plataforma de produção.
