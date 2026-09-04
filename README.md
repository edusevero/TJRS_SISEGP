# SISEGP — Sistema do Escritório de Gestão de Projetos

Protótipo funcional e navegável para centralizar o acompanhamento das iniciativas institucionais pelo EGP/PMO do Tribunal de Justiça do Rio Grande do Sul.

O projeto é uma prova de conceito front-end. Não contém autenticação, backend ou banco de dados e utiliza somente dados fictícios, identificados na interface como demonstrativos.

## Objetivo

Demonstrar uma futura solução única para substituir controles fragmentados em planilhas, consolidando portfólio, cronogramas, marcos, riscos, impedimentos, equipe, reuniões, documentos, status reports e relatórios de governança.

## Tecnologia escolhida

- HTML5 semântico;
- CSS3 responsivo, com componentes e modo de impressão;
- JavaScript ES2020 sem framework;
- SVG inline para ícones e gráficos;
- `localStorage` para persistência demonstrativa.

A solução não possui etapa de build nem dependências externas. Essa escolha deixa o protótipo simples de executar e publicar, elimina dependência de CDN e mantém bom desempenho com as 200 iniciativas simuladas.

## Estrutura

```text
sisegp/
├── index.html                shell da aplicação e elementos globais
├── .htaccess                 proteção e cabeçalhos para hospedagem Apache
├── README.md                 documentação do protótipo
└── assets/
    ├── css/styles.css        design system, componentes, responsividade e impressão
    ├── images/               favicon e marca institucional
    └── js/
        ├── data.js           gerador determinístico de dados e persistência
        ├── charts.js         gráficos SVG/CSS sem dependências
        └── app.js            rotas, páginas, componentes e interações
```

## Execução local

Não há dependências para instalar. É possível abrir `index.html` diretamente no navegador.

Para reproduzir o comportamento de hospedagem, execute um servidor estático na raiz `esevero.com.br` e abra `/tjrs/sisegp/`. Exemplos:

```bash
python -m http.server 8080
```

ou, caso PHP esteja disponível:

```bash
php -S 127.0.0.1:8080 -t .
```

Depois acesse `http://127.0.0.1:8080/tjrs/sisegp/`.

## Funcionalidades implementadas

- dashboard executivo com dez indicadores calculados e visualizações interativas;
- 200 iniciativas fictícias geradas dinamicamente e distribuídas entre os GPs cadastrados;
- filtros combináveis, pesquisa, ordenação, paginação, visão em cards e tabela;
- cadastro, edição, duplicação e arquivamento de iniciativa;
- persistência das alterações no navegador e restauração do conjunto original;
- detalhes com visão geral, saúde e ações rápidas;
- classificação, risco e matriz probabilidade × impacto;
- equipe e Matriz RACI;
- marcos em tabela e timeline;
- cronograma detalhado e Gantt simplificado;
- repositório da iniciativa e upload local simulado;
- timeline de evolução com inclusão de registros;
- reuniões passadas e futuras, atas e síntese simulada;
- status reports com sinaleiras e geração automática simulada;
- construtor de relatório para reunião, pré-visualização e impressão/salvamento em PDF;
- modelos de artefatos e central de geração de documentos;
- repositório geral em pastas, com grade, favoritos e compartilhamentos;
- relatórios gerais, iniciativas críticas, impedimentos e carteira por GP;
- cadastro demonstrativo dos gerentes de projetos;
- configurações e restauração dos dados;
- relatório executivo de governança;
- pesquisa global (`Ctrl+K`), notificações, toasts, modais e tour contextual;
- exportação CSV e modo otimizado para impressão;
- navegação por teclado, link de salto, labels e atributos ARIA essenciais;
- adaptação para desktop, tablet e celular.

## Dados simulados

`assets/js/data.js` gera exatamente 200 iniciativas usando uma função determinística, sem manter blocos HTML repetidos. O conjunto contempla diferentes situações, ciclos, áreas, responsáveis, riscos, criticidades, prazos, percentuais, marcos e impedimentos.

Na primeira abertura, o conjunto é criado em memória. Alterações são gravadas sob a chave `sisegp-data-v2` no `localStorage`. A opção **Administração → Configurações → Restaurar dados originais** remove as alterações locais e recria os registros originais.

## Bibliotecas

Não são utilizadas bibliotecas de terceiros nem recursos carregados por CDN. Os gráficos e ícones são produzidos pelo próprio código com CSS e SVG. As fontes são as fontes de interface já disponíveis no sistema operacional.

## Geração de PDF

A experiência foi inspirada no projeto `tjrs/geradorPDFreunioes`: azul institucional, síntese de governança, progresso, sinaleiras, cronograma e blocos executivos. Como este protótipo não possui backend, a geração utiliza a caixa de impressão do navegador. Escolha **Salvar como PDF** para produzir o arquivo. A versão de produção deverá gerar o documento no servidor, com template versionado e assinatura institucional quando necessária.

## Publicação

Por ser estático, publique todo o conteúdo desta pasta em `/tjrs/sisegp/`. Não é necessário executar build. A configuração Apache em `.htaccess` evita listagem do diretório e adiciona cabeçalhos defensivos básicos.

Endereço do protótipo:

<https://esevero.com.br/tjrs/sisegp/>

## Validação realizada

- carregamento direto por `file://`, sem servidor;
- abertura de todas as rotas do menu;
- geração das 200 iniciativas;
- filtros, paginação e alternância cards/tabela;
- páginas de cadastro, edição e dez áreas de detalhe;
- persistência local, duplicação, evolução, upload e restauração;
- gráficos e indicadores calculados;
- prévia para reunião e modo de impressão;
- verificação do console no navegador;
- inspeção visual em viewport desktop e móvel;
- verificação dos arquivos estáticos após publicação.

## Limitações do protótipo

- os dados existem somente no navegador em uso e não são compartilhados entre usuários;
- uploads guardam apenas metadados e não preservam o conteúdo do arquivo;
- permissões, perfis, notificações, IA, integrações, Excel e documentos editáveis são simulações de UX;
- salvar em PDF depende da caixa de impressão do navegador;
- não há colaboração simultânea, auditoria confiável, assinatura ou versionamento real;
- datas e indicadores demonstram cenários, não representam iniciativas reais do TJRS.

## Recomendações para produção

### Arquitetura e dados

- aplicação web em camadas, com API versionada, front-end componentizado e serviços assíncronos para documentos e notificações;
- PostgreSQL ou banco institucional homologado, com constraints, índices, histórico temporal e estratégia de migração;
- armazenamento institucional de documentos com antivírus, versionamento, retenção, metadados e URLs temporárias;
- cache e filas para relatórios extensos, integrações e geração de PDFs;
- ambientes separados de desenvolvimento, homologação e produção, com CI/CD e infraestrutura como código.

### Identidade, acesso e auditoria

- autenticação federada no provedor institucional, MFA conforme política do TJRS e sessão segura;
- autorização por papéis e escopo: GP, chefia, governança, consulta e administração;
- trilha de auditoria imutável para toda leitura sensível, alteração, exportação e decisão;
- segregação de funções, revisão periódica de acessos e princípio do menor privilégio.

### Integrações

- integração oficial com o GIE para evitar duplicidade e definir fonte de verdade por campo;
- Microsoft 365/Graph para agenda, Teams, SharePoint, arquivos e notificações;
- Power BI por modelo semântico governado ou API de dados, sem acesso direto às tabelas transacionais;
- serviço de PDF no backend, com templates versionados, testes de regressão visual e armazenamento do documento final.

### Segurança, LGPD e operação

- classificação dos dados, minimização, base legal, transparência, prazos de retenção e atendimento aos direitos dos titulares;
- TLS, CSP restritiva, proteção CSRF/XSS, validação no servidor, rate limiting e gestão de segredos;
- logs estruturados sem dados sensíveis, monitoramento, alertas, métricas de negócio e rastreamento distribuído;
- backups cifrados, política de retenção, restauração testada e plano de continuidade;
- análise de ameaças, testes automatizados, SAST/DAST, gestão de vulnerabilidades e revisão de dependências;
- critérios de acessibilidade WCAG 2.2 AA e testes com leitores de tela antes da entrada em produção.

## Evoluções sugeridas

1. validar o modelo de dados e os fluxos com GPs, chefia e governança;
2. priorizar um MVP com cadastro, portfólio, evolução, riscos, marcos e status report;
3. definir integrações e responsabilidade pela fonte de cada informação;
4. criar protótipo de alta fidelidade testado com usuários reais;
5. desenvolver backend, autenticação, auditoria e armazenamento institucional;
6. realizar piloto controlado com um ciclo de iniciativas antes da expansão.
