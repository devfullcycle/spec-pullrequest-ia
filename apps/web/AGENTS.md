<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Estado atual

A base está pronta: os tokens do design system no `app/globals.css`, os componentes que a autenticação usa (`components/ui/` e `components/auth/`), o cliente da API (`lib/api/`), a vitrine (`app/vitrine/`) e os testes no navegador (`e2e/`). Das telas, existem as do cadastro, da verificação de e-mail e a de entrar, em `app/(auth)/`, e a página inicial provisória, em `app/(drive)/`, que mostra o e-mail do Usuário e o botão "Sair". A guarda dos cookies de token (`lib/session`), a camada de acesso a dados (`lib/dal`) e o `proxy.ts` existem, ainda sem a renovação da Sessão. A recuperação de senha **ainda não existe**. A estrutura-alvo está na seção 1 do `docs/lld.md`, e o código novo deve nascer nela.

## Comandos

Todos rodam no contêiner `web`, a partir da raiz do repositório:

```bash
docker compose -f compose.dev.yaml exec web <comando>
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev --hostname 0.0.0.0` | Sobe o servidor de desenvolvimento (`http://localhost:3000`) |
| `pnpm lint` | ESLint com as regras do `eslint-config-next` |
| `pnpm exec tsc --noEmit` | Checagem de tipos |
| `pnpm build` | Build de produção, em modo `standalone` |

A web tem uma suíte só, a dos testes no navegador, que roda no contêiner `playwright`, e não no `web`:

```bash
docker compose -f compose.dev.yaml exec playwright npx playwright test
```

| Comando | O que faz |
| --- | --- |
| `npx playwright test` | Todos os testes de `e2e/` |
| `npx playwright test e2e/smoke.spec.ts` | Um arquivo de teste só |
| `npx playwright test -g "nome do teste"` | Um teste pelo nome |

- **A web e a API têm de estar no ar.** Os testes falam com a aplicação real em `http://web:3000`. Antes de rodá-los, suba o `pnpm dev --hostname 0.0.0.0` no contêiner `web` e o `pnpm start:dev` no `api`.
- **O relatório** fica em `apps/web/playwright-report/`, e o trace de um teste que falhou, em `apps/web/test-results/`. Os dois ficam fora do Git.
- **A versão do Playwright é fixa.** A do `@playwright/test`, no `package.json`, e a da imagem do serviço `playwright`, no `compose.dev.yaml`, têm de ser a mesma. Atualize as duas juntas.

A definição de pronto da web é a suíte no navegador, o lint, a checagem de tipos, o `pnpm build` e, em mudanças de interface, a validação visual.

**Rode o `pnpm build` antes de concluir.** Com Cache Components, os erros de pré-renderização (dado lido fora de `<Suspense>` e sem cache, `Date.now()` durante a renderização) só aparecem no overlay de desenvolvimento e no build. O lint e o `tsc` não os pegam.

## Particularidades da stack

- **Documentação da versão:** o Next.js instalado é o 16.4, e os guias dele estão em `node_modules/next/dist/docs/`. Leia o guia do assunto antes de escrever código, como manda o bloco no topo deste arquivo. O que você lembra de versões anteriores sobre cache, `middleware` e configuração de rota provavelmente não vale mais.
- **Cache Components ligado:** o `next.config.ts` tem `cacheComponents: true` e `partialPrefetching: true`. Isso muda o modelo de renderização e de cache inteiro (ver [Cache](#cache)).
- **Proxy:** o arquivo que roda antes de cada rota é o `proxy.ts`, e não mais o `middleware.ts`.
- **Tipos de rota:** os componentes de rota usam os tipos globais `PageProps<'/rota'>` e `LayoutProps<'/rota'>`, gerados pelo Next.js. `params` e `searchParams` são promises.
- **Tailwind v4:** não existe `tailwind.config`. Os tokens são variáveis do `@theme` em `app/globals.css`, e o CSS passa pelo loader `@tailwindcss/turbopack`, configurado no `next.config.ts`.
- **Classe fora dos tokens falha em silêncio.** As classes de cor, texto, raio e sombra são só as da seção "Tokens no Tailwind" do `docs/design-system.md`. Uma classe como `bg-zinc-50` ou `text-sm` não gera CSS nenhum, e o build não avisa.
- **Ícones:** o `LucideProvider` do layout raiz já aplica o traço do design system, e o Lucide esconde do leitor de tela o ícone sem rótulo. O componente passa só o tamanho e a cor.
- **Imports:** o alias `@/` aponta para a raiz do projeto (`@/components/ui/button`).
- **Lint sem formatador:** o projeto não tem Prettier. O `pnpm lint` é a única checagem de estilo.

## Onde está cada assunto

Este arquivo é dono de como o código da web é escrito. O que o sistema faz está nos documentos de `docs/`, e nada de lá é repetido aqui. Antes de implementar, leia a seção do assunto:

| Assunto | Onde ler |
| --- | --- |
| Visão geral, fluxos principais e ambientes | `docs/hld.md` |
| Estrutura de pastas e bibliotecas escolhidas | `docs/lld.md`, seção 1 |
| Endpoints da API e códigos de erro | `docs/lld.md`, seção 3 |
| Cookies de token, renovação no Proxy e verificação da Sessão | `docs/lld.md`, seção 4.5 |
| Upload em chunks | `docs/lld.md`, seção 4.6 |
| Variáveis de ambiente | `docs/lld.md`, seção 6 |
| Tokens, componentes, responsividade e fluxo com o Figma | `docs/design-system.md` |

Toda tarefa de interface começa pela leitura do `docs/design-system.md`. As regras dele são obrigatórias, inclusive a validação visual.

## Server Components primeiro

Todo componente nasce como Server Component. O `"use client"` é a exceção, e precisa de um motivo desta lista:

- Estado ou efeito (`useState`, `useReducer`, `useEffect`).
- Manipulador de evento (`onClick`, `onChange`, arrastar e soltar).
- API do navegador (`window`, `localStorage`, `IntersectionObserver`, seleção de arquivo).
- Hook que só existe no cliente (`useActionState`, `useFormStatus`, `useOptimistic`, `usePathname`).

Buscar dados, ler cookies, formatar valores e montar layout não são motivo.

**Como manter a fronteira pequena**

- **Empurre o `"use client"` para a folha.** O componente de cliente é o botão, o menu ou o campo, e não a página, a lista ou o layout em volta dele. Tudo o que um arquivo com `"use client"` importa vai para o pacote do navegador.
- **Componha por `children`.** Um componente de cliente que envolve conteúdo (diálogo, menu, painel recolhível) recebe esse conteúdo como `children` ou como prop, já renderizado no servidor. Ele não importa o conteúdo.
- **Dados descem por props.** O Server Component busca os dados e passa ao componente de cliente só o que ele mostra. As props atravessam a rede: têm de ser serializáveis e não podem levar token, objeto inteiro da API nem campo que a tela não usa.
- **Mutação é Server Action.** O componente de cliente não chama a API. Ele dispara uma Server Action.
- **Estado na URL antes de estado no cliente.** Filtro, ordenação, pasta atual e termo de busca ficam em `params` e `searchParams`, lidos no servidor. Só vira `useState` o que é efêmero, como menu aberto ou item em foco.
- **Código só de servidor é marcado.** Os módulos de `lib/api` e `lib/dal` e o `lib/session/tokens.ts` começam com `import 'server-only'`, para que um import acidental num componente de cliente quebre o build em vez de vazar código ou segredo. Os outros arquivos de `lib/session` são a exceção, descrita em [Acesso a dados](#acesso-a-dados).

A exceção conhecida é o upload: o navegador envia os chunks direto ao Cloud Storage, e por isso o controle do envio (progresso, pausa e retomada) é de cliente. A sessão de upload continua sendo criada e concluída por Server Action.

## Acesso a dados

- **A API é chamada só no servidor.** Server Components, Server Actions e Route Handlers usam o cliente de `lib/api`. Não existe `fetch` para a API em componente de cliente nem variável `NEXT_PUBLIC_` com o endereço dela.
- **Toda leitura protegida passa por `lib/dal`.** É ela que confere a Sessão na API. O Proxy só faz um filtro otimista e nunca substitui essa conferência.
- **Toda Server Action confere a Sessão de novo.** Uma Server Action é um endpoint público. Esconder o botão na interface não protege nada. A exceção é a de sair, que tem de funcionar com a Sessão já expirada e só age sobre os cookies de quem a chamou.
- **Página protegida:** lê o Usuário com `getCurrentUser()`, de `lib/dal/user.ts`, dentro de `<Suspense>`. Sem Sessão, a função já leva à tela de entrar.
- **Rota nova nasce protegida.** O `proxy.ts` tem a lista das telas de autenticação e a das rotas públicas. Uma rota que abre sem Sessão precisa entrar numa das duas.
- **O que o Proxy importa não leva `server-only`.** Em `lib/session`, só `tokens.ts` leva: ele lê e grava em `cookies()`. Os outros arquivos (caminhos, destino de retorno, leitura da expiração e gravação dos cookies num armazenamento recebido) não guardam segredo e servem também ao Proxy.
- **Uma busca por requisição.** Funções de leitura usadas por mais de um componente na mesma página são envolvidas em `React.cache`, que evita a chamada repetida dentro da mesma requisição. Isso não é cache entre requisições e não tem custo de invalidação.

## Componentes e vitrine

- **Onde ficam e como se chamam:** a seção "Componentes" do fluxo de trabalho com o Figma, no `docs/design-system.md`, define as pastas e o nome dos arquivos.
- **Estados por classe, e não por prop.** Hover, foco, pressionado e desabilitado saem das variantes do Tailwind e dos utilitários de estado da seção "Tokens no Tailwind" do `docs/design-system.md`. Um componente só recebe prop para o estado que o CSS não enxerga, como `loading` e `error`.
- **Link ou botão pelo `href`.** `button-primary` e `text-link` viram um `Link` do Next.js quando recebem `href`, e um `<button>` quando não recebem. O `button-primary` mantém o `type` nativo e envia o formulário em que está; o `text-link` sem `href` é `type="button"`.
- **A vitrine** (`app/vitrine/`) mostra os componentes fora de qualquer fluxo: `/vitrine` traz os primitivos em cada estado, `/vitrine/auth-card` traz o cartão de autenticação montado, e `/vitrine/api` chama a API pelo cliente de `lib/api`. Ela serve à validação visual e aos testes no navegador, e só existe no servidor de desenvolvimento: no build de produção, as rotas dela respondem 404. Ao criar um componente ou um estado, acrescente-o à vitrine.

## Testes no navegador

- **O que entra:** o que só existe na web, pela porta que o Usuário usa. As regras do contrato são provadas pelos testes de ponta a ponta da API, e não aqui.
- **Sem outro nível de teste:** a web não tem executor de testes de unidade. Enquanto for assim, o cliente de `lib/api` é provado pela rota `/vitrine/api`, e os auxiliares de `e2e/support/`, por um teste próprio na mesma suíte.
- **Onde ficam:** em `e2e/`, com o sufixo `.spec.ts`. Os auxiliares ficam em `e2e/support/`.
- **Usuários de teste:** `e2e/support/account.ts` cadastra, verifica e entra pela própria interface (`createVerifiedUser()`, `signIn()`).
- **E-mails:** `e2e/support/mailpit.ts` lê os e-mails pelo Mailpit. `uniqueEmail()` cria um destinatário que nenhum outro teste usa, `waitForMailTo()` espera o e-mail chegar e `extractLink()` tira dele o link de um caminho. Nenhum teste apaga a caixa do Mailpit, que também serve ao desenvolvimento.
- **Seletores:** pelo papel e pelo nome acessível (`getByRole`, `getByLabel`), que é como o Usuário acha o elemento. `data-testid` fica para o que não tem papel nem rótulo.

## Formulários e textos

- **Formulários:** Server Actions com `useActionState`. A validação é feita com zod na Server Action, e o resultado volta como estado do formulário. A validação no navegador é só conforto.
- **Onde ficam:** o formulário é um componente de cliente ao lado da página que o usa (`app/(auth)/criar-conta/register-form.tsx`). As Server Actions de um grupo de rotas ficam num `actions.ts` na pasta do grupo, e o estado que elas devolvem, num `form-state.ts` ao lado.
- **O que vem da URL entra no formulário por props.** O aviso de outro fluxo e o campo oculto do destino são Server Components dentro de `<Suspense>`, passados ao formulário como props. Um formulário inteiro dentro de `<Suspense>` seria trocado quando a URL fosse lida, e a pessoa perderia o que já digitou.
- **Erro junto ao campo:** o formulário leva `noValidate`, para o erro aparecer no campo, com o texto da web, e não no balão do navegador. A senha nunca volta no estado do formulário.
- **Erros da API:** a API responde com um `code` estável. O cliente de `lib/api` devolve o erro esperado como valor (`{ ok: false, error }`), e não como exceção. A web traduz o `code` em mensagem num único mapa, o de `lib/api/error-messages.ts`, e nenhum componente mostra a mensagem crua da API.
- **Textos:** só em português, escritos nos componentes, sem biblioteca de tradução.

## Cache

Com Cache Components, **nada é guardado em cache por padrão**. Uma leitura de dados roda a cada requisição, a menos que alguém a marque com `"use cache"`. Cache é sempre uma decisão explícita, e neste projeto a resposta padrão é não criar.

Leia `01-app/01-getting-started/08-caching.md` e `09-revalidating.md`, na pasta de documentação do Next.js, antes de mexer em qualquer item desta seção.

### Por que o padrão aqui é não criar cache

- **Quase tudo é dado privado de um Usuário.** Pastas, arquivos, lixeira, busca, cota e assinatura dependem da Sessão. Um cache mal chaveado mostra os arquivos de uma pessoa para outra.
- **O usuário espera ver o que acabou de fazer.** Depois de enviar, renomear, mover ou excluir, a listagem tem de refletir a mudança na hora. Cada cache criado vira uma invalidação obrigatória em cada mutação que toca aquele dado.
- **A web roda em várias instâncias no Cloud Run.** O cache do `"use cache"` fica na memória de cada instância. Ele não é compartilhado, some quando a instância morre e tem acerto baixo. A invalidação por tag só vale na instância que a recebeu, e as outras continuam servindo o dado antigo.
- **Permissão não pode envelhecer.** Um link revogado ou expirado tem de parar de funcionar na hora, e uma URL assinada de download vence em minutos.

O caminho padrão para dado dinâmico é **streaming**: o componente que lê o dado fica dentro de `<Suspense>`, com um esqueleto como fallback. A casca da página (navegação, cabeçalho, esqueletos) é pré-renderizada e chega na hora, e o dado chega em seguida, sempre fresco.

### As camadas de cache e o custo de cada uma

O Next.js tem vários mecanismos, com donos e prazos diferentes. Antes de usar um, saiba onde o dado fica, quem o vê e como ele é renovado.

| Mecanismo | Onde o dado fica | Quem compartilha | Como se renova | Uso neste projeto |
| --- | --- | --- | --- | --- |
| `React.cache` | Memória da requisição | Só a própria requisição | Morre no fim da requisição | Livre. É deduplicação, e não cache. |
| Casca pré-renderizada | HTML gerado no build | Todos os visitantes | Novo deploy, ou a renovação do cache que ela contém | Automático. Mantenha fora dela tudo o que depende da Sessão. |
| `"use cache"` | Memória de cada instância | Todos os usuários daquela instância | `cacheLife` (tempo) e `updateTag` ou `revalidateTag` (sob demanda) | Só para dado público e igual para todos. |
| `"use cache: remote"` | Armazenamento externo compartilhado | Todas as instâncias | O mesmo do `"use cache"` | Não usar. Exige um cache handler que o projeto não tem. |
| `"use cache: private"` | Memória do navegador | Só aquele navegador | `stale` do `cacheLife`, ou recarregar a página | Só com justificativa, para dado da Sessão. |
| Cache do roteador e prefetch | Memória do navegador | Só aquele navegador | `stale` do `cacheLife`, `router.refresh()` ou uma Server Action que invalida | Automático. Lembre que ele existe ao depurar tela desatualizada. |

Os caches do servidor valem só para um deploy. Um deploy novo começa vazio.

### Antes de criar um cache

Responda às quatro perguntas. Se alguma ficar sem resposta, não crie.

1. **De quem é o dado?** Se ele depende da Sessão, de um cookie ou de um cabeçalho, o `"use cache"` comum não serve. Ele nem consegue ler `cookies()` ou `headers()`: a chamada lança erro.
2. **Qual é o ganho?** O cache tem de evitar uma chamada lenta ou repetida por muitas pessoas. Com memória por instância, um dado pouco pedido quase nunca acerta, e o cache só acrescenta código.
3. **Por quanto tempo o dado velho é aceitável?** Esse é o `cacheLife`. Se a resposta é "nenhum", o dado não é para cache.
4. **O que muda esse dado, e quem o invalida?** Liste as mutações. Se a mudança vem de fora da web (um webhook de pagamento na API, uma tarefa do worker), a web não fica sabendo, e só o tempo renova.

O candidato natural é o que é público e igual para todos, como a lista de planos e preços.

### Ao criar

- **Cache no dado, e não na tela.** Coloque o `"use cache"` na função de leitura, e não no componente nem na página. O cache de interface guarda também o que foi renderizado, e é mais fácil incluir algo privado sem perceber.
- **Sempre com `cacheLife` e `cacheTag`.** Sem `cacheLife`, vale o perfil `default`, que ninguém escolheu. Sem `cacheTag`, não há como invalidar sob demanda.
- **A chave é o que a função recebe.** Os argumentos e os valores capturados do escopo formam a chave. Tudo o que muda o resultado tem de entrar como argumento. Nunca passe token, e-mail ou outro dado pessoal: chaves e tags são gravadas em texto puro.
- **Cache curto não entra na casca.** O perfil `seconds`, ou um `expire` abaixo de cinco minutos, vira um buraco dinâmico e precisa de `<Suspense>`.
- **Nomes de tag num lugar só.** As tags são constantes exportadas de um único módulo, usadas por quem cria o cache e por quem o invalida. Tag escrita à mão em dois arquivos é invalidação que falha em silêncio.

### Ao manter e renovar

| Função | Comportamento | Quando usar |
| --- | --- | --- |
| `updateTag` | Expira na hora. A próxima leitura já busca o dado novo. Só funciona em Server Action. | Depois de uma mutação feita pelo próprio usuário, que precisa ver o resultado. |
| `revalidateTag(tag, 'max')` | Serve o dado antigo enquanto o novo é gerado em segundo plano. | Quando um pequeno atraso é aceitável, e em Route Handlers. |
| `revalidatePath` | Invalida tudo o que a rota usa. | Último recurso. Prefira a tag, que é precisa. |
| `router.refresh()` | Refaz a rota atual no navegador. | Para atualizar a tela sem mutação, como num botão de recarregar. |

- **Toda mutação revê os caches que ela afeta.** A Server Action que altera um dado é responsável por invalidar as tags dele. Ao criar um cache novo, percorra as Server Actions existentes. Ao criar uma Server Action nova, percorra as tags existentes.
- **A invalidação não atravessa instâncias.** Enquanto o projeto não tiver um cache handler compartilhado, trate o `cacheLife` como o prazo real de renovação, e a invalidação por tag como um atalho que às vezes funciona. Escolha o `cacheLife` pensando no pior caso.
- **Tela desatualizada tem mais de um suspeito.** Antes de mexer no servidor, confira o cache do roteador no navegador: o dado pode estar fresco no servidor e velho na navegação.

### Erros de pré-renderização

O overlay de desenvolvimento e o build acusam quando um componente lê dado sem cache ou uma API de requisição (`cookies()`, `headers()`, `params`, `searchParams`) fora de `<Suspense>`. A correção é quase sempre envolver esse componente em `<Suspense>`, o mais perto possível de quem lê o dado, para a casca ficar grande.

- **Não resolva com `"use cache"`.** Colocar cache para calar o erro cria um cache que ninguém decidiu ter.
- **Valores não determinísticos:** `Date.now()`, `Math.random()` e `crypto.randomUUID()` durante a renderização também são barrados. Chame `await connection()` antes, dentro de `<Suspense>`.
- **Configuração de rota antiga:** `export const dynamic`, `revalidate` e `fetchCache` são do modelo anterior e geram erro com Cache Components.
