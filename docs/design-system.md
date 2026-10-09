# Design System — Gerenciador de Arquivos (estilo Google Drive)

Este documento define a linguagem visual do MVP web: cores, tipografia, layout, elevação, formas, estados e componentes. Ele também define o fluxo de trabalho com o Figma, e vale tanto para desenhar quanto para implementar a interface. Os componentes, o layout e a responsividade foram reescritos para um aplicativo de arquivos.

## Visão geral

A interface é **uma moldura quase invisível em volta dos arquivos do usuário**. Quem abre o produto quer achar, enviar ou compartilhar um arquivo, e nada na tela disputa atenção com isso. A tipografia é confiante e discreta; a cor é branco, um off-white ou, no tema escuro, um quase preto; todo elemento interativo usa um único azul.

Não há ornamento: sem gradientes, sem molduras decorativas, sem sombra em cartões, botões ou texto. A separação entre áreas vem da troca de superfície (`{colors.canvas}` ↔ `{colors.surface}`) e de linhas finas de 1px. A sombra aparece só no que flutua sobre o conteúdo, como menus e diálogos.

O produto tem quatro contextos de tela, todos com o mesmo sistema tipográfico, o mesmo ritmo de espaçamento e o mesmo acento:

- **Drive** (`(drive)`): pastas, lixeira, busca e planos. É a tela densa, com barra superior, barra lateral e a lista de arquivos.
- **Autenticação** (`(auth)`): login, cadastro e redefinição de senha. Um cartão centrado, com muito espaço em volta.
- **Link público** (`s/[token]`): a página que o visitante de um link compartilhado vê. Sem navegação do app.
- **Planos:** a comparação dos quatro planos e a entrada para o checkout.

**Características principais:**

- O conteúdo do usuário vem primeiro; a interface recua.
- Um único acento azul (`{colors.primary}`) carrega todo elemento interativo. Não existe segunda cor de marca.
- Cores semânticas (perigo, alerta, sucesso) existem só para comunicar estado, nunca para decorar.
- Duas gramáticas de botão: pill para ações principais (`{rounded.pill}`) e retângulo compacto para ações utilitárias (`{rounded.sm}`).
- Geist em toda a interface, com tracking negativo só nos títulos. Geist Mono para tamanhos de arquivo e datas.
- Exatamente uma sombra no sistema, reservada às camadas flutuantes.
- Dois temas, claro e escuro, definidos pelos mesmos tokens semânticos e escolhidos pela preferência do sistema.
- Densidade alta onde há lista (Drive) e baixa onde há decisão (autenticação, planos, link público).

## Cores

Todo token de cor tem um valor para o tema claro e um para o tema escuro. O tema segue `prefers-color-scheme`; não há seletor manual no MVP. Os componentes referenciam sempre o token, nunca o hex.

### Marca e acento

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `{colors.primary}` | #0066cc | #2997ff | A cor de ação em texto, ícone e borda: links, botão secundário, item selecionado, barra de progresso. O valor escuro é mais claro porque o azul do tema claro some sobre fundo escuro. |
| `{colors.primary-fill}` | #0066cc | #0071e3 | Preenchimento do botão primário e do checkbox marcado. |
| `{colors.primary-focus}` | #0071e3 | #2997ff | Anel de foco do teclado (`outline: 2px solid`). |
| `{colors.primary-soft}` | #e6f0fa | #1f354c | Fundo de linha ou cartão selecionado e de destino de arrastar e soltar. |
| `{colors.on-fill}` | #ffffff | #ffffff | Texto e ícone sobre `{colors.primary-fill}` e `{colors.danger-fill}`. |

### Superfícies

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `{colors.canvas}` | #ffffff | #1d1d1f | A superfície dominante: área de conteúdo, lista de arquivos, cartões. |
| `{colors.surface}` | #f5f5f7 | #272729 | Superfície de apoio: barra lateral, fundo das páginas de autenticação e do link público, cabeçalho de tabela, miniatura sem imagem. Diferente o bastante do canvas para criar ritmo. |
| `{colors.surface-raised}` | #ffffff | #2a2a2c | Camadas flutuantes: menu, diálogo, toast, painel de uploads. |
| `{colors.surface-hover}` | rgba(0, 0, 0, 0.04) | rgba(255, 255, 255, 0.06) | Sobreposição translúcida do estado hover. Funciona sobre qualquer superfície. |
| `{colors.surface-black}` | #000000 | #000000 | Preto puro, reservado ao fundo do visualizador de arquivos (imagem, vídeo, PDF). |
| `{colors.scrim}` | rgba(0, 0, 0, 0.4) | rgba(0, 0, 0, 0.6) | Véu atrás de diálogos e da gaveta da barra lateral. |

### Texto

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `{colors.ink}` | #1d1d1f | #f5f5f7 | Títulos, nomes de arquivo e texto corrido. Quase preto em vez de preto puro, para a página não parecer impressa. |
| `{colors.ink-muted}` | #6e6e73 | #a1a1a6 | Texto secundário: tamanho, data, legendas, placeholders, ícones em repouso. |
| `{colors.ink-disabled}` | #a1a1a6 | #6e6e73 | Texto e ícone de controles desabilitados. |

### Linhas e bordas

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `{colors.hairline}` | #e0e0e0 | #38383a | Linha de 1px entre linhas da lista, borda de cartões, de menus e da barra superior. |
| `{colors.hairline-strong}` | #86868b | #86868b | Borda de campos de texto e de checkbox, que precisam ser reconhecíveis como controles. |

### Cores semânticas

Estas cores comunicam estado e nada mais. Um elemento só usa uma delas quando a informação é de perigo, alerta ou sucesso.

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `{colors.danger}` | #d70015 | #ff453a | Texto, ícone e borda de erro: validação de campo, upload que falhou, cota cheia, ação destrutiva no menu. |
| `{colors.danger-fill}` | #d70015 | #d70015 | Preenchimento do botão de ação destrutiva e da barra de cota cheia. |
| `{colors.danger-soft}` | #fdecee | #3b1f1f | Fundo de banner e de toast de erro. |
| `{colors.warning}` | #b25000 | #ff9f0a | Cota perto do limite, pagamento em período de tolerância, link expirando. |
| `{colors.warning-soft}` | #fff4e5 | #3a2a12 | Fundo de banner de alerta. |
| `{colors.success}` | #1d7a34 | #30d158 | Upload concluído, plano ativo, link copiado. |
| `{colors.success-soft}` | #e8f5ec | #1c3323 | Fundo de toast e de banner de sucesso. |

### Gradientes

**Não há gradientes decorativos.** Nenhum token de gradiente é definido. A única exceção é funcional: o brilho animado do skeleton de carregamento.

## Tipografia

### Família

- **Interface:** `Geist`, carregada pelo `next/font` e exposta em `--font-geist-sans`. É a voz de todo título, texto, botão e rótulo.
- **Numérica:** `Geist Mono`, exposta em `--font-geist-mono`. Usada em tamanhos de arquivo, datas em listas, uso de cota e trechos de link, onde colunas alinhadas ajudam a leitura.
- **Recursos OpenType:** `font-variant-numeric: tabular-nums` em qualquer número que apareça em coluna ou que mude ao vivo (progresso de upload, cota).

As duas fontes são auto-hospedadas pelo `next/font`. O navegador não faz requisições a servidores de fontes de terceiros, o que combina com a promessa de privacidade do produto.

### Hierarquia

| Token | Tamanho | Peso | Altura de linha | Espaçamento entre letras | Uso |
| --- | --- | --- | --- | --- | --- |
| `{typography.display}` | 32px | 600 | 1.15 | -0.64px | Título das telas de autenticação, de planos e do link público |
| `{typography.title}` | 20px | 600 | 1.3 | -0.2px | Título de diálogo, nome do plano, título de estado vazio |
| `{typography.body}` | 16px | 400 | 1.5 | 0 | Texto corrido, campos de formulário, descrições |
| `{typography.body-strong}` | 16px | 600 | 1.5 | 0 | Ênfase em texto corrido, preço do plano |
| `{typography.ui}` | 14px | 400 | 1.43 | 0 | Nome de arquivo, itens de menu, navegação, breadcrumb |
| `{typography.ui-strong}` | 14px | 600 | 1.43 | 0 | Rótulo de botão, cabeçalho de tabela, item de navegação ativo |
| `{typography.caption}` | 12px | 400 | 1.33 | 0 | Texto de ajuda e de erro de campo, legendas, letras miúdas |
| `{typography.mono}` | 13px | 400 | 1.4 | 0 | Tamanho, data e cota, em Geist Mono |

### Princípios

- **Tracking negativo só em títulos.** `{typography.display}` e `{typography.title}` apertam o espaçamento entre letras; de 16px para baixo ele fica em 0.
- **Dois tamanhos de leitura.** 16px onde o usuário lê e decide (formulários, planos, diálogos) e 14px onde ele varre uma lista (arquivos, menus, navegação).
- **Só os pesos 400 e 600.** Não há 300, 500 nem 700. Ênfase é sempre 600.
- **Altura de linha por contexto.** Títulos usam 1.15 a 1.3; texto corrido usa 1.5; a lista de arquivos usa 1.43 dentro de uma linha de altura fixa.
- **Número em coluna usa `{typography.mono}`.** Tamanhos e datas alinhados à direita ficam comparáveis de relance.

## Layout

### Sistema de espaçamento

- **Unidade base:** 4px, a mesma da escala padrão do Tailwind. O layout estrutural se encaixa em 8, 12, 16, 24 e 32.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px.
- **Padding da área de conteúdo:** `{spacing.lg}` (24px) a partir de `lg`; `{spacing.md}` (16px) abaixo disso.
- **Padding de cartão e de diálogo:** `{spacing.lg}` (24px).
- **Padding de botão:** 8 a 11px na vertical e 14 a 22px na horizontal.
- **Espaço vertical das telas de decisão:** `{spacing.section}` (64px) acima do título em autenticação, planos e link público.

### Casca e contêineres

- **Drive:** barra superior fixa de 56px, barra lateral de 240px e área de conteúdo fluida, que ocupa o resto da largura.
- **Autenticação:** coluna única centrada, largura máxima de 400px.
- **Link público:** coluna única centrada, largura máxima de 720px.
- **Planos:** largura máxima de 1120px, com os quatro cartões em grade.
- **Diálogos:** largura máxima de 480px; o diálogo de compartilhamento chega a 560px.
- **Espaço entre cartões:** `{spacing.md}` (16px) na grade de arquivos e `{spacing.lg}` (24px) na grade de planos.

### Filosofia do espaço em branco

O Drive é denso de propósito: a lista de arquivos precisa mostrar muitos itens sem rolar, com linhas de 48px e nenhuma moldura em volta. As telas de decisão são o oposto: um título, um bloco de conteúdo e muito ar, para que o usuário leia uma coisa de cada vez. Estados vazios herdam o respiro das telas de decisão, mesmo dentro do Drive.

## Elevação e profundidade

| Nível | Tratamento | Uso |
| --- | --- | --- |
| Plano | Sem sombra e sem borda | Área de conteúdo, barra lateral, linhas da lista, botões |
| Linha fina | Borda de 1px em `{colors.hairline}` | Cartões, separador da barra superior, divisão entre linhas, campos |
| Desfoque de fundo | `backdrop-filter: blur(20px)` sobre `{colors.canvas}` a 80% | Só a barra superior fixa, quando há conteúdo rolando atrás dela |
| Sombra de camada | `{shadow.overlay}`: `0 5px 30px 0 rgba(0, 0, 0, 0.22)` | Menu, popover, diálogo, toast e painel de uploads |

**Filosofia da sombra.** O sistema tem **exatamente uma** sombra, e ela vale só para o que flutua sobre o conteúdo. Cartões, botões, linhas e texto nunca têm sombra. A hierarquia vem da troca de superfície e das linhas finas.

No tema escuro a sombra quase não aparece. Por isso toda camada flutuante usa também `{colors.surface-raised}` e uma borda de 1px em `{colors.hairline}`, nos dois temas.

## Formas

### Escala de raios

| Token | Valor | Uso |
| --- | --- | --- |
| `{rounded.none}` | 0px | Linhas da lista, barra superior, barra lateral |
| `{rounded.sm}` | 8px | Campos de texto, botões utilitários, miniaturas, itens de menu e de navegação |
| `{rounded.lg}` | 16px | Cartões, diálogos, menus, toasts, painel de uploads, zona de soltar |
| `{rounded.pill}` | 9999px | Botões primário e secundário, campo de busca, chips, barra de cota |
| `{rounded.full}` | 50% | Botão de ícone circular, avatar da conta |

O pill é o sinal de ação da marca. Só recebe `{rounded.pill}` o que o usuário aciona como passo principal ou o que tem a função de busca e filtro.

## Ícones e miniaturas

- **Biblioteca:** Lucide (`lucide-react`), em traço, com 1,5px de espessura. É o único conjunto de ícones do produto.
- **Tamanhos:** 16px em linhas, menus e campos; 20px na barra superior, na barra lateral e nas barras de ferramentas; 48px em estados vazios.
- **Cor:** sempre `currentColor`. Em repouso, `{colors.ink-muted}`; ativo ou em hover, `{colors.ink}`; `{colors.primary}` só quando o item está selecionado.
- **Tipos de arquivo:** distinguem-se pela forma do ícone (pasta, imagem, PDF, vídeo, áudio, texto, genérico), nunca por cor. Assim o acento único e as cores semânticas mantêm o significado.
- **Miniaturas de imagem:** geradas pelo worker, exibidas em 1:1 na grade e em 32 × 32px na lista, com `object-fit: cover` e `{rounded.sm}`.
- **Demais tipos:** sem miniatura. A grade mostra o ícone do tipo centrado sobre `{colors.surface}`.
- **Carregamento:** miniaturas usam `loading="lazy"`; enquanto carregam, o espaço mostra `{colors.surface}`, sem mudar de tamanho.

## Estados de interação

Os estados são definidos uma vez aqui e valem para todo componente. A seção de componentes só cita exceções.

| Estado | Tratamento |
| --- | --- |
| Padrão | Como descrito no componente. |
| Hover | Sobreposição de `{colors.surface-hover}`. Sem sombra e sem movimento. |
| Pressionado | `transform: scale(0.95)` em botões; em linhas e itens de menu, o mesmo fundo do hover. |
| Foco | `outline: 2px solid {colors.primary-focus}` com 2px de afastamento, visível só na navegação por teclado (`:focus-visible`). Obrigatório em todo elemento interativo. |
| Selecionado | Fundo `{colors.primary-soft}`; ícone e checkbox em `{colors.primary}`. |
| Desabilitado | Texto e ícone em `{colors.ink-disabled}`, cursor padrão, sem hover nem pressionado. Controles preenchidos (`{component.button-primary}`, `{component.text-field}`) trocam o fundo por `{colors.surface}`, e a borda do campo passa a `{colors.hairline}`. |
| Carregando | Skeleton em `{colors.surface}` no lugar de listas e cartões; spinner de 16px dentro de botões, que mantêm a largura. |
| Arrastando sobre | Borda de 2px tracejada em `{colors.primary}` e fundo `{colors.primary-soft}`, na zona de soltar e na pasta de destino. |

**Movimento.** Transições de cor e de transformação duram 150ms. Menus, diálogos e toasts entram com opacidade e um deslocamento de 4px, em 200ms. Com `prefers-reduced-motion: reduce`, só a opacidade anima e o `scale(0.95)` é desligado.

## Componentes

### Navegação

**`app-bar`**: barra superior fixa do Drive. Fundo `{colors.canvas}` a 80% com desfoque, borda inferior de 1px em `{colors.hairline}`, altura de 56px, padding horizontal `{spacing.md}`. À esquerda, o botão de menu (só abaixo de `lg`) e a marca do produto. No centro, o `{component.search-input}`, com largura máxima de 560px. À direita, o `{component.button-primary}` "Enviar" e o `{component.account-menu}`.

**`sidebar`**: navegação principal do Drive. Fundo `{colors.surface}`, largura de 240px, padding `{spacing.sm}`. De cima para baixo: os itens "Meus arquivos" e "Lixeira", e, ancorados ao pé, o `{component.quota-meter}` e o link "Planos". Abaixo de `lg`, vira uma gaveta que desliza da esquerda sobre `{colors.scrim}`.

**`nav-item`**: item da barra lateral. Altura de 40px, ícone de 20px e rótulo em `{typography.ui}`, `{rounded.sm}`, padding 8px × 12px. Ativo: fundo `{colors.primary-soft}`, texto e ícone em `{colors.primary}`, rótulo em `{typography.ui-strong}`.

**`breadcrumb`**: caminho da pasta atual, no topo da área de conteúdo. Segmentos em `{typography.ui}` e `{colors.ink-muted}`, separados por um ícone de seta de 16px; o último segmento fica em `{colors.ink}` e `{typography.ui-strong}`. Cada segmento é um destino de arrastar e soltar. Quando não cabe, os segmentos do meio colapsam em "…", que abre um `{component.menu}`.

**`toolbar`**: linha abaixo do breadcrumb, com altura de 48px. À esquerda, as ações da pasta ("Nova pasta") em `{component.button-utility}`. À direita, a alternância entre lista e grade. Com itens selecionados, a barra troca de conteúdo: mostra a contagem ("3 selecionados") e as ações em lote (baixar, mover, excluir).

**`account-menu`**: botão circular de 32px com a inicial do usuário, fundo `{colors.surface}` e `{rounded.full}`. Abre um `{component.menu}` com o e-mail, o plano atual e as ações "Planos" e "Sair".

### Arquivos

**`file-list`**: a visão padrão do Drive, em tabela. Cabeçalho de 40px em `{typography.ui-strong}` e `{colors.ink-muted}`, com borda inferior em `{colors.hairline}`. Colunas: Nome, Tipo, Tamanho e Modificado em. O cabeçalho ordena a lista ao clique e mostra uma seta de 16px na coluna ativa.

**`file-row`**: linha da lista. Altura de 48px, fundo `{colors.canvas}`, borda inferior de 1px em `{colors.hairline}`, padding horizontal `{spacing.md}`. Da esquerda para a direita: `{component.checkbox}`, ícone do tipo ou miniatura de 32px, nome em `{typography.ui}` e `{colors.ink}` (truncado com reticências), e tipo, tamanho e data em `{typography.mono}` e `{colors.ink-muted}`. No fim da linha, um `{component.button-icon}` "Mais ações" abre o `{component.menu}`. Um clique seleciona; dois cliques abrem a pasta ou a pré-visualização.

**`file-card`**: célula da visão em grade. Fundo `{colors.canvas}`, borda de 1px em `{colors.hairline}`, `{rounded.lg}`, padding `{spacing.xs}`. Em cima, a miniatura 1:1 com `{rounded.sm}`; embaixo, o nome em `{typography.ui}` (uma linha, truncado) e o tamanho em `{typography.mono}`. O checkbox e o botão "Mais ações" aparecem sobre a miniatura em hover, em foco e quando o cartão está selecionado; em telas de toque, ficam sempre visíveis.

**`empty-state`**: ocupa a área de conteúdo quando não há itens. Centrado, com ícone de 48px em `{colors.ink-muted}`, título em `{typography.title}`, uma frase em `{typography.body}` e `{colors.ink-muted}`, e no máximo um botão. Variações: pasta vazia ("Arraste arquivos para cá ou clique em Enviar"), lixeira vazia e busca sem resultados.

**`dropzone`**: cobre a área de conteúdo enquanto o usuário arrasta arquivos sobre a janela. Usa o estado "arrastando sobre", com `{rounded.lg}`, e mostra o nome da pasta de destino em `{typography.title}`.

**`upload-panel`**: painel flutuante no canto inferior direito, com 360px de largura. Fundo `{colors.surface-raised}`, borda em `{colors.hairline}`, `{rounded.lg}` e `{shadow.overlay}`. O cabeçalho resume o envio ("Enviando 3 de 5") e tem botões para recolher e fechar. Cada `{component.upload-item}` ocupa uma linha, e a lista rola a partir de cinco itens.

**`upload-item`**: linha do painel de uploads, com 48px de altura. Ícone do tipo, nome em `{typography.ui}` e, à direita, o progresso em `{typography.mono}`. Sob o nome, uma barra de 2px em `{colors.primary}` sobre `{colors.hairline}`. Estados: enviando (barra e botão de cancelar), pausado ou retomando (texto em `{colors.ink-muted}`), concluído (ícone de confirmação em `{colors.success}`) e falhou (mensagem em `{colors.danger}` e botão "Tentar de novo").

**`quota-meter`**: indicador de uso da cota, ao pé da barra lateral. Barra de 4px com `{rounded.pill}`, preenchida em `{colors.primary}` sobre `{colors.hairline}`; abaixo, "9,2 GB de 15 GB" em `{typography.mono}`. A partir de 80% de uso, o preenchimento passa a `{colors.warning}`; em 100%, a `{colors.danger-fill}`, e aparece um `{component.text-link}` "Ver planos".

**`preview-viewer`**: pré-visualização em tela cheia de imagem, PDF, vídeo, áudio e texto. Fundo `{colors.surface-black}`, nos dois temas. Barra no topo com 56px de altura: nome do arquivo em `{typography.ui-strong}` e, à direita, `{component.button-icon}` para baixar, compartilhar e fechar. Setas laterais em `{component.button-icon}` passam ao arquivo anterior e ao seguinte. Tipos sem pré-visualização (documentos do Office, por exemplo) mostram um `{component.empty-state}` com o botão "Baixar".

### Botões

**`button-primary`**: a ação principal de cada tela. Fundo `{colors.primary-fill}`, texto `{colors.on-fill}` em `{typography.ui-strong}`, `{rounded.pill}`, padding 11px × 22px, altura de 44px. Cada tela tem no máximo um.

**`button-secondary`**: a segunda ação, ao lado do primário ("Cancelar", "Agora não"). Fundo transparente, texto `{colors.primary}`, borda de 1px em `{colors.primary}`, `{rounded.pill}`, mesmo padding e altura do primário.

**`button-utility`**: ações de barra de ferramentas ("Nova pasta", "Mover", "Baixar"). Fundo transparente, texto `{colors.ink}` em `{typography.ui-strong}`, ícone opcional de 16px à esquerda, `{rounded.sm}`, padding 8px × 14px, altura de 36px.

**`button-danger`**: confirma uma ação destrutiva e sem volta ("Excluir definitivamente", "Esvaziar lixeira"). Igual ao `{component.button-primary}`, com fundo `{colors.danger-fill}`. Aparece só dentro de um diálogo de confirmação.

**`button-icon`**: botão só com ícone. Circular (`{rounded.full}`), fundo transparente, ícone em `{colors.ink-muted}`. Tem 36px nas barras e linhas do desktop e 44px em telas de toque. Sempre com `aria-label`.

**`text-link`**: link dentro de texto, em `{colors.primary}`, sem sublinhado em repouso e sublinhado em hover e foco.

### Campos e formulários

**`text-field`**: campo de texto com rótulo. Rótulo acima em `{typography.ui-strong}`; campo com fundo `{colors.canvas}`, texto em `{typography.body}`, borda de 1px em `{colors.hairline-strong}`, `{rounded.sm}`, padding 10px × 12px e altura de 44px. Placeholder em `{colors.ink-muted}`. Texto de ajuda abaixo, em `{typography.caption}` e `{colors.ink-muted}`. Rótulo, campo e texto de ajuda ficam separados por `{spacing.xs}`.

**`text-field-error`**: estado de erro. A borda passa a 2px em `{colors.danger}`, e o texto de ajuda dá lugar à mensagem de erro em `{typography.caption}` e `{colors.danger}`, com um ícone de alerta de 16px. A mensagem diz o que corrigir, não só que há um erro.

**`password-field`**: um `{component.text-field}` com um `{component.button-icon}` à direita, que alterna a exibição da senha.

**`search-input`**: a busca da barra superior. Fundo `{colors.surface}`, sem borda, `{rounded.pill}`, padding 10px × 16px, altura de 40px. Ícone de lupa de 16px à esquerda, em `{colors.ink-muted}`; texto em `{typography.ui}`. Com texto digitado, um botão de limpar aparece à direita.

**`checkbox`**: 18 × 18px, borda de 1px em `{colors.hairline-strong}` e raio de 4px. Marcado: fundo `{colors.primary-fill}` e ícone de confirmação em `{colors.on-fill}`. A área de toque é de 44 × 44px.

**`segmented-control`**: alternância entre duas ou três opções exclusivas (lista e grade; mensal e anual). Trilho em `{colors.surface}` com `{rounded.pill}` e padding de 2px; a opção ativa é uma pílula em `{colors.canvas}` com texto `{colors.ink}` em `{typography.ui-strong}`.

### Sobreposições e avisos

**`menu`**: menu de contexto e menu "Mais ações". Fundo `{colors.surface-raised}`, borda em `{colors.hairline}`, `{rounded.lg}`, `{shadow.overlay}`, padding `{spacing.xxs}` e largura mínima de 200px. Itens com 36px de altura, ícone de 16px e rótulo em `{typography.ui}`, com `{rounded.sm}`. Ações destrutivas ficam por último, depois de um separador, em `{colors.danger}`.

**`dialog`**: janela modal sobre `{colors.scrim}`. Fundo `{colors.surface-raised}`, `{rounded.lg}`, `{shadow.overlay}`, padding `{spacing.lg}`. Título em `{typography.title}`, corpo em `{typography.body}` e, no rodapé, os botões alinhados à direita, com o primário por último. Usos: nova pasta, renomear, mover (com árvore de pastas) e confirmação de exclusão definitiva.

**`toast`**: confirmação breve, no canto inferior esquerdo. Fundo `{colors.surface-raised}`, borda em `{colors.hairline}`, `{rounded.lg}`, `{shadow.overlay}`, padding 12px × 16px, texto em `{typography.ui}`. Pode ter uma ação em `{component.text-link}` ("Desfazer", depois de mover um item para a lixeira). Some sozinho em 5 segundos; os de erro ficam até o usuário fechar.

**`banner`**: aviso persistente no topo da área de conteúdo, em largura total. Padding 12px × 16px, ícone de 20px, texto em `{typography.ui}` e `{colors.ink}` e, à direita, uma ação opcional em `{component.text-link}`. Variações:

- **Alerta** (`{colors.warning-soft}` com o ícone `triangle-alert` em `{colors.warning}`): cota perto do limite, pagamento em período de tolerância e sessão expirada.
- **Erro** (`{colors.danger-soft}` com o ícone `circle-alert` em `{colors.danger}`): conta em modo somente leitura por estar acima da cota e erros de formulário que não pertencem a um campo.
- **Sucesso** (`{colors.success-soft}` com o ícone `circle-check` em `{colors.success}`): confirmação que precisa ficar na tela, como "e-mail verificado" e "senha redefinida".

Dentro de um contêiner estreito, como o `{component.auth-card}`, o banner usa `{rounded.sm}` e a ação fica abaixo do texto, e não à direita.

### Compartilhamento

**`share-dialog`**: um `{component.dialog}` de até 560px. Mostra o link em um campo somente leitura, em `{typography.mono}`, com o `{component.button-primary}` "Copiar link" ao lado. Abaixo, duas opções com checkbox: "Expira em", que revela um campo de data, e "Proteger com senha", que revela um `{component.password-field}`. No rodapé, a ação "Desativar link" em `{colors.danger}`.

**`public-share-page`**: a página do link público, sem barra lateral nem busca. Fundo `{colors.surface}`; no topo, só a marca do produto. No centro, um cartão em `{colors.canvas}` com `{rounded.lg}` e padding `{spacing.xl}`: ícone do tipo ou miniatura, nome em `{typography.title}`, tamanho em `{typography.mono}` e o `{component.button-primary}` "Baixar". Para uma pasta, o cartão dá lugar a um `{component.file-list}` somente leitura. Link com senha mostra antes um `{component.password-field}`; link expirado ou inválido mostra um `{component.empty-state}`.

### Planos

**`plan-card`**: cartão de plano. Fundo `{colors.canvas}`, borda de 1px em `{colors.hairline}`, `{rounded.lg}`, padding `{spacing.lg}`. De cima para baixo: nome do plano em `{typography.title}`, espaço em `{typography.display}` ("100 GB"), preço em `{typography.body-strong}` com o período em `{typography.caption}`, e o botão de contratar. Um `{component.segmented-control}` acima da grade alterna entre cobrança mensal e anual.

**`plan-card-current`**: o plano em uso. A borda passa a 2px em `{colors.primary}`, um chip "Plano atual" em `{colors.primary-soft}` aparece ao lado do nome, e o botão dá lugar a um texto em `{colors.ink-muted}`.

### Autenticação

**`auth-card`**: o cartão de login, cadastro e redefinição de senha. Página em `{colors.surface}`; cartão em `{colors.canvas}` com `{rounded.lg}`, padding `{spacing.xl}` e largura máxima de 400px. De cima para baixo: marca do produto, título em `{typography.display}`, campos em `{component.text-field}` separados por `{spacing.md}`, um `{component.button-primary}` em largura total e, abaixo, o `{component.text-link}` que leva ao fluxo vizinho ("Criar conta", "Esqueci minha senha"). Erros que não pertencem a um campo (credenciais inválidas, por exemplo) aparecem acima do formulário, em um `{component.banner}` de erro. Os avisos que chegam de outro fluxo ("e-mail verificado", "senha redefinida", "sua sessão expirou") ocupam o mesmo lugar, na variação de sucesso ou de alerta.

O cartão tem ainda três conteúdos opcionais:

- **Texto de apoio:** um parágrafo em `{typography.body}` e `{colors.ink-muted}`, logo abaixo do título, que explica o passo ("Informe seu e-mail e enviaremos um link").
- **Frase de aceite:** em `{typography.caption}` e `{colors.ink-muted}`, abaixo do botão do cadastro, com os links dos Termos e da Política de Privacidade em `{component.text-link}`.
- **Estado sem formulário:** telas de confirmação e de link inválido mostram só o título, o texto de apoio e a ação seguinte (um `{component.button-primary}` ou um `{component.text-link}`).

O cartão fica a `{spacing.section}` do topo da página e centrado na horizontal. Abaixo de `sm`, ocupa a largura toda, com margem de `{spacing.md}`.

## Faça e não faça

### Faça

- Use `{colors.primary}` e `{colors.primary-fill}` em todo elemento interativo: links, botões principais, foco e seleção. O acento único não é negociável.
- Use as cores semânticas só quando a informação for de perigo, alerta ou sucesso.
- Componha títulos em `{typography.display}` ou `{typography.title}`, com o tracking negativo do token.
- Use `{typography.ui}` (14px) em listas, menus e navegação, e `{typography.body}` (16px) em formulários e texto corrido.
- Separe áreas trocando de superfície (`{colors.canvas}` ↔ `{colors.surface}`) ou com uma linha de 1px em `{colors.hairline}`.
- Reserve `{rounded.pill}` para a ação principal e para busca e filtro.
- Aplique `{shadow.overlay}` só em menu, popover, diálogo, toast e painel de uploads.
- Use `transform: scale(0.95)` como estado pressionado de todo botão.
- Garanta o anel de foco em todo elemento interativo e alvo de toque de pelo menos 44 × 44px.
- Valide cada componente nos temas claro e escuro.

### Não faça

- Não crie uma segunda cor de acento, nem pinte ícones de tipo de arquivo.
- Não ponha sombra em cartões, botões, linhas ou texto.
- Não use gradiente como fundo decorativo.
- Não use os pesos 300, 500 ou 700. A escala é 400 e 600.
- Não escreva hex direto em componentes. Use o token, para que o tema escuro funcione.
- Não misture gramáticas de raio: `{rounded.sm}` para controles compactos, `{rounded.lg}` para contêineres, `{rounded.pill}` para ações.
- Não ponha dois `{component.button-primary}` na mesma tela.
- Não use `{component.button-danger}` fora de um diálogo de confirmação.
- Não comunique estado só por cor. Erro, alerta e sucesso sempre têm ícone ou texto junto.

## Comportamento responsivo

### Breakpoints

Os breakpoints são os padrões do Tailwind, sem valores próprios. O estilo base é o do celular, e cada breakpoint acrescenta o que muda para cima.

| Nome | Largura | Mudanças principais |
| --- | --- | --- |
| Base | < 640px | Barra lateral em gaveta; lista só com nome, e tamanho e data em uma segunda linha; grade de 2 colunas; diálogos em largura total, com margem de 16px; a busca vira um ícone que expande |
| `sm` | ≥ 640px | Grade de 3 colunas; coluna Tamanho volta à lista; diálogos com largura máxima |
| `md` | ≥ 768px | Grade de 4 colunas; coluna Modificado em volta à lista; busca sempre visível; planos em 2 colunas |
| `lg` | ≥ 1024px | Barra lateral fixa de 240px; some o botão de menu; coluna Tipo volta à lista; grade de 5 colunas; padding do conteúdo sobe para 24px |
| `xl` | ≥ 1280px | Grade de 6 colunas; planos em 4 colunas |

### Alvos de toque

- Mínimo de 44 × 44px em telas de toque.
- `{component.button-primary}`, `{component.text-field}` e `{component.file-row}` (48px) já atendem ao mínimo.
- `{component.button-icon}` e `{component.button-utility}` têm 36px no desktop, por serem ações de precisão com ponteiro, e sobem para 44px abaixo de `lg`.
- `{component.checkbox}` tem 18px visíveis e área de toque de 44px.

### Estratégia de colapso

- **Barra lateral:** fixa a partir de `lg`; abaixo disso, gaveta aberta pelo botão de menu da `{component.app-bar}`.
- **Barra superior:** marca, busca, "Enviar" e conta no desktop. No celular, o "Enviar" fica só com o ícone e a busca expande sobre a barra ao toque.
- **Lista de arquivos:** perde Tipo abaixo de `lg`, Modificado em abaixo de `md` e Tamanho abaixo de `sm`. O que sai vira uma segunda linha em `{typography.caption}`, sob o nome.
- **Grade de arquivos:** 6 → 5 → 4 → 3 → 2 colunas.
- **Barra de ferramentas:** as ações em lote que não cabem vão para um `{component.menu}` "Mais".
- **Painel de uploads:** no celular, ocupa a largura toda e fica ancorado ao pé da tela.
- **Planos:** 4 colunas → 2 colunas → 1 coluna.
- **Título:** `{typography.display}` cai de 32px para 28px abaixo de `sm`.

### Menu de contexto

No desktop, o clique com o botão direito em uma linha ou cartão abre o `{component.menu}`. Em telas de toque não há clique direito, então o botão "Mais ações" fica sempre visível e é o único caminho para o menu.

## Tokens no Tailwind

As tabelas deste documento são a fonte da verdade. A implementação declara os tokens em `apps/web/app/globals.css`, como variáveis do `@theme` do Tailwind v4, e os componentes usam só as classes geradas.

| Grupo | Variável no `@theme` | Exemplo de classe |
| --- | --- | --- |
| `{colors.*}` | `--color-<nome>` | `{colors.primary-fill}` → `--color-primary-fill` → `bg-primary-fill` |
| `{typography.*}` | `--text-<nome>` e seus modificadores | `{typography.ui}` → `--text-ui` → `text-ui` |
| `{rounded.*}` | `--radius-<nome>` | `{rounded.lg}` → `--radius-lg` → `rounded-lg` |
| `{shadow.*}` | `--shadow-<nome>` | `{shadow.overlay}` → `--shadow-overlay` → `shadow-overlay` |
| `{spacing.*}` | Nenhuma: usa a escala padrão de 4px | `{spacing.lg}` (24px) → `p-6` |

- **Temas:** cada cor é declarada uma vez em `:root` com o valor claro e sobrescrita em `@media (prefers-color-scheme: dark)` com o valor escuro, como o `globals.css` do scaffold já faz com `--background` e `--foreground`.
- **Componentes:** as chaves `{component.*}` nomeiam componentes React em `kebab-case`. Elas não viram variáveis CSS.
- **Sintaxe:** confirme a sintaxe atual do `@theme` na documentação do Tailwind, pelo context7, antes de implementar.

## Tokens no Figma

O arquivo do Figma espelha este documento com os mesmos nomes. Nenhuma camada usa valor solto: toda cor, tamanho, raio e sombra vem de uma variável ou de um estilo.

| Grupo | No Figma | Exemplo |
| --- | --- | --- |
| `{colors.*}` | Coleção de variáveis `colors`, com os modos `Light` e `Dark` | `{colors.primary-fill}` → `colors/primary-fill` |
| `{typography.*}` | Estilos de texto | `{typography.ui}` → `typography/ui` |
| `{rounded.*}` | Coleção de variáveis numéricas `rounded` | `{rounded.lg}` → `rounded/lg` |
| `{spacing.*}` | Coleção de variáveis numéricas `spacing` | `{spacing.lg}` → `spacing/lg` |
| `{shadow.*}` | Estilos de efeito | `{shadow.overlay}` → `shadow/overlay` |
| `{component.*}` | Componentes, com os estados como variantes | `{component.file-row}` → `file-row` |

- **Temas:** os valores das colunas Claro e Escuro das tabelas de cor são os modos `Light` e `Dark` da coleção `colors`.
- **Título responsivo:** o `{typography.display}` de 28px, usado abaixo de `sm`, é o estilo de texto `typography/display-base` (28px, 600, 1.15, -0.56px). No código não há token próprio: é o mesmo `{typography.display}` com o tamanho reduzido.
- **Raio em porcentagem:** variáveis do Figma não aceitam porcentagem, então `rounded/full` vale 9999, como `rounded/pill`.
- **Estados de erro:** as variantes com sufixo (`text-field-error`) são o valor `error` da propriedade `State` do componente base.
- **Estados de interação:** são valores da propriedade `State` (`default`, `hover`, `focus`, `disabled`, `loading`). O pressionado não é desenhado, porque é uma transformação (`scale(0.95)`) e não muda cor nem forma.
- **Anel de foco:** é a camada `focus-ring`, 4px maior que o controle em cada lado, com borda interna de 2px em `colors/primary-focus`. Isso reproduz o `outline` de 2px com 2px de afastamento. O raio do anel é o do controle mais 4px. No campo, o anel contorna só a caixa, e não o rótulo.
- **Ícones:** os do Lucide, com o nome original na camada, para que o código importe o mesmo ícone do `lucide-react`.
- **Processo:** as regras de trabalho com o Figma (sincronia, fluxo, assets, validação) estão na seção "Fluxo de trabalho com o Figma", a seguir.

## Fluxo de trabalho com o Figma

O Figma é a ferramenta de design do projeto, acessada pelo servidor MCP do plugin `figma`. Este documento governa as duas pontas: o que é desenhado no Figma e o que é implementado no código. As regras abaixo valem para qualquer tarefa de interface.

### Sincronia

- Doc, Figma e código usam os mesmos nomes e os mesmos valores. O mapeamento está nas seções "Tokens no Tailwind" e "Tokens no Figma".
- Toda mudança de token ou componente começa neste documento e, na mesma tarefa, é propagada para o Figma e para o `apps/web/app/globals.css`.
- Se o Figma tiver um valor ou componente que não está neste documento, ou o contrário, pare e aponte a divergência. Nunca resolva com valor fixo no código nem com valor solto no Figma.

### Do Figma para o código

Siga os passos nesta ordem, sem pular nenhum:

1. Rode `get_design_context` para obter a representação estruturada do nó exato.
2. Se a resposta vier grande demais ou truncada, rode `get_metadata` para ver o mapa de nós e busque de novo só os nós necessários com `get_design_context`.
3. Rode `get_screenshot` para ter a referência visual da variante que será implementada.
4. Só depois dos passos 1 e 3, baixe os assets e comece a implementar.
5. Trate o código que o servidor devolve (em geral React com Tailwind) como descrição do design, e não como código final. Traduza-o para as convenções do projeto:
   - troque as classes utilitárias cruas pelas classes dos tokens (`bg-primary-fill`, `text-ui`, `rounded-lg`); nenhum hex, tamanho de fonte, raio ou sombra fixo;
   - reutilize os componentes de `apps/web/components/` em vez de duplicar a funcionalidade;
   - aplique os estados de interação e as regras de foco e de alvo de toque do design system, mesmo que o frame só mostre o estado padrão.
6. Valide o resultado contra o Figma antes de concluir, como descrito em "Validação visual", abaixo.

### Componentes

- Os componentes ficam em `apps/web/components/`: os primitivos em `ui/` e os de domínio em `navigation/`, `files/`, `sharing/`, `plans/` e `auth/`.
- O nome do arquivo é a chave do componente neste documento, em `kebab-case`: `{component.file-row}` → `components/files/file-row.tsx`.
- Antes de criar um componente, procure a chave em `apps/web/components/`. Só crie o que existe neste documento; se não existir, acrescente aqui primeiro.

### Assets

- Ícones nunca são baixados do Figma. Identifique o ícone pelo nome da camada e importe o equivalente do `lucide-react`. Se não houver equivalente, pare e aponte.
- Não instale nenhum outro pacote de ícones.
- Para os demais assets (logotipo, imagens, ilustrações), use a fonte que o servidor MCP do Figma devolve e salve o arquivo em `apps/web/public/`. Não crie placeholders nem redesenhe o asset à mão quando o servidor fornece a fonte.

### Deste documento para o Figma

- Procure na biblioteca do arquivo (`search_design_system`) antes de criar um componente ou uma variável.
- Ligue tudo a variáveis e estilos: nenhum hex, tamanho de fonte, raio ou sombra solto.
- Nomeie cada componente com a chave deste documento (`file-row`, `plan-card`) e modele os estados como variantes.
- Use auto layout em todo frame e componente.
- Organize o arquivo nas páginas Fundações, Componentes, Drive, Autenticação, Link público e Planos.
- Desenhe cada tela em dois frames, base (390px) e `lg` (1280px), e confira os modos Light e Dark.
- Use os ícones do Lucide, com o nome original na camada.

### Validação visual

Com a web rodando no contêiner, abra a tela pelo MCP do Playwright, capture em 390px e em 1280px, nos temas claro e escuro, e compare com o `get_screenshot` do frame. Corrija as diferenças de layout, espaçamento, cor e tipografia. Se o Figma não tiver a variante de um tamanho ou de um tema, valide o que existe e diga o que ficou sem referência.

## Guia de iteração

1. Trabalhe em UM componente por vez e cite a chave dele (`{component.file-row}`, `{component.share-dialog}`).
2. Variantes de um componente (`-error`, `-current`) são entradas próprias na seção de componentes.
3. Use referências a tokens em todo lugar, nunca hex direto.
4. Os estados valem como regra geral. Documente no componente só o que foge dela.
5. Títulos ficam em Geist 600 com tracking negativo; texto fica em Geist 400. Não há peso intermediário.
6. A sombra única (`{shadow.overlay}`) é só para camadas flutuantes.
7. Na dúvida sobre ênfase, troque a superfície ou aumente o espaço antes de acrescentar borda, cor ou sombra.
8. Um token ou componente novo entra neste documento antes de entrar no Figma e no código.

## Lacunas conhecidas

- O produto ainda não tem nome nem logotipo. Onde este documento diz "marca do produto", a interface usa um marcador de texto até a identidade ser definida.
- O contraste dos pares de cor (texto sobre superfície, nos dois temas) foi escolhido para atender à WCAG AA, mas ainda não foi medido com ferramenta. A medição acontece quando os tokens forem implementados.
- O arquivo do Figma tem as fundações (variáveis, estilos de texto e de sombra), os componentes usados na autenticação (`auth-card`, `banner`, `button-primary`, `button-icon`, `text-field`, `password-field` e `text-link`) e as telas da página Autenticação. Os demais componentes e as páginas Drive, Link público e Planos ainda estão vazios, e a página Fundações não tem uma folha de amostras.
- No Figma, o hover do `{component.text-field}` e do `{component.password-field}` não foi desenhado como variante. Ele vale pela regra geral de "Estados de interação".
- Os tokens ainda não estão no `globals.css`, e o `lucide-react` não está instalado. Os dois entram com a implementação da interface.
- Não há seletor manual de tema. O tema segue o sistema operacional.
- Os controles internos de vídeo, áudio e PDF do `{component.preview-viewer}` são os do navegador e não seguem estes tokens.
- O checkout de cartão e Pix é hospedado pelo gateway de pagamento e fica fora deste design system. Só o `{component.plan-card}` e a tela de retorno são nossos.
- E-mails transacionais (verificação de conta, redefinição de senha) não estão cobertos.
- Tom de voz e textos da interface não estão definidos. Os rótulos usados aqui são exemplos.
- Ilustrações para estados vazios não existem; o `{component.empty-state}` usa só um ícone.
