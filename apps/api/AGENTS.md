## Estado atual

A fundação está pronta: módulo de config (`src/config/`), banco com Prisma (`prisma/` e `src/infra/database/`), envio de e-mail (`src/infra/mail/`), filtro de erros e validação de entrada (`src/common/`) e a base de testes (`test/support/`). Dos módulos de domínio (`src/modules/`), existem o `users`, com a rota do Usuário autenticado, e o `auth`, com o cadastro, a verificação de e-mail, o reenvio, o login, a renovação da Sessão, o logout e a recuperação de senha. O token de acesso e o guard que o exige ficam em `src/common/auth/`. O limite de tentativas **ainda não existe**. A estrutura-alvo está na seção 1 do `docs/lld.md`, e o código novo deve nascer nela.

## Comandos

Todos rodam no contêiner `api`, a partir da raiz do repositório:

```bash
docker compose -f compose.dev.yaml exec api <comando>
```

| Comando | O que faz |
| --- | --- |
| `pnpm start:dev` | Sobe a API em modo watch (`http://localhost:3001` na máquina) |
| `pnpm test` | Suíte de unidade (`*.spec.ts`) |
| `pnpm test:int` | Suíte de integração (`*.int-spec.ts`) |
| `pnpm test:e2e` | Suíte de ponta a ponta (`*.e2e-spec.ts`) |
| `pnpm test:e2e test/problem-details.e2e-spec.ts` | Um arquivo de teste só. Vale para as três suítes. |
| `pnpm test:e2e -t "nome do teste"` | Um teste pelo nome. Vale para as três suítes. |
| `pnpm test:cov` | Testes unitários com cobertura |
| `pnpm lint` | oxlint com regras que usam tipos |
| `pnpm format` | Prettier em `src/` e `test/` |
| `pnpm exec tsc --noEmit` | Checagem de tipos |
| `pnpm build` | Compila para `dist/` |
| `pnpm exec prisma migrate dev --name <nome>` | Cria uma migração a partir do `prisma/schema.prisma` e a aplica no banco local. Não gera o cliente. |
| `pnpm exec prisma generate` | Gera de novo o cliente do Prisma, depois de mudar o schema |
| `pnpm setup:dev` | Prepara o ambiente: `.env`, chaves do JWT, cliente do Prisma e migrações. Já roda sozinho quando o contêiner sobe. |

**Cada suíte tem o próprio comando e a própria configuração do Vitest.** O `pnpm test` roda só a de unidade. Para cumprir a definição de pronto, rode as três: `pnpm test`, `pnpm test:int` e `pnpm test:e2e`.

A suíte de unidade passa mesmo sem nenhum arquivo de teste. As de integração e de ponta a ponta precisam do `postgres` e do `mailpit` no ar, o que o Compose já garante.

O `pnpm lint` só aponta os problemas, sem corrigir. A formatação é conferida à parte, pelo `pnpm format`.

## Particularidades da stack

- **Módulos ES:** o projeto é `"type": "module"` com `moduleResolution: nodenext`. Todo import relativo leva a extensão `.js`, mesmo apontando para um arquivo `.ts` (`import { AppService } from './app.service.js'`). Sem a extensão, o `tsc` e o Node falham.
- **Vitest:** `describe`, `it`, `expect` e `vi` são globais, sem import. Os mocks usam `vi.fn()` e `vi.mock()`.
- **oxlint:** as regras ficam no `.oxlintrc.json`. `no-floating-promises` é erro, então toda promise precisa de `await`, `return` ou `void`.
- **TypeScript:** `strict` ligado, com `strictPropertyInitialization` desligado para os DTOs e as classes com decorators.
- **Prisma:** a versão é a 7, fixada no `package.json` (o motivo está na seção 1 do LLD). O cliente é gerado em `src/generated/prisma/`, que fica fora do Git, do lint e do Prettier, e é importado de `generated/prisma/client.js`. A URL do banco fica no `prisma.config.ts`, e não no schema. Depois de mudar o `schema.prisma`, crie a migração com `prisma migrate dev` e gere o cliente com `prisma generate`: no Prisma 7, a migração não gera mais o cliente.
- **`PrismaService`:** é o cliente do banco, global, em `src/infra/database/`. Só os repositories o injetam.
- **pnpm:** os pacotes que rodam script na instalação precisam estar liberados no `pnpm-workspace.yaml` (`allowBuilds`). Sem isso, a instalação falha.

## Nomes de arquivos

Os arquivos seguem a convenção do Nest: nome em `kebab-case`, seguido de um sufixo que diz o papel do arquivo. A classe leva o mesmo nome em `PascalCase`, com o papel no fim (`items.service.ts` exporta `ItemsService`). Na dúvida, gere o arquivo com o Nest CLI (`pnpm exec nest g <tipo> <nome>`), que já aplica o padrão.

| Artefato | Arquivo |
| --- | --- |
| Módulo | `items.module.ts` |
| Controller | `items.controller.ts` |
| Service | `items.service.ts` |
| Repository | `items.repository.ts` |
| DTO | `dto/create-item.dto.ts` |
| Entidade | `entities/item.entity.ts` |
| Guard | `auth.guard.ts` |
| Exception filter | `problem-details.filter.ts` |
| Erro de domínio | `quota-exceeded.error.ts` |
| Interface de `src/infra/` e a implementação dela | `mail-sender.ts` e `smtp-mail-sender.ts` |
| Configuração de um assunto | `mail.config.ts` |
| Pipe, interceptor e decorator | `*.pipe.ts`, `*.interceptor.ts` e `*.decorator.ts` |

**Testes**

O sufixo do arquivo define o nível do teste e a suíte que o executa:

| Nível | Sufixo | Onde fica | O que exercita |
| --- | --- | --- | --- |
| Unidade | `.spec.ts` | Ao lado do código, em `src/` | Uma classe isolada, com as dependências trocadas por dublês |
| Integração | `.int-spec.ts` | Ao lado do código, em `src/` | Uma peça com a dependência real, como um repository contra o PostgreSQL |
| Ponta a ponta | `.e2e-spec.ts` | Em `test/` | A aplicação inteira por HTTP, com `Test.createTestingModule` e `supertest` |

O arquivo de teste leva o nome do arquivo testado: `items.service.ts` é coberto por `items.service.spec.ts`.

**Onde cada regra é provada:** as regras de negócio são provadas pelos testes de ponta a ponta, pelas rotas, com banco e e-mail reais. O teste de unidade de um service é opcional, e vale quando a regra tem muitos casos que seriam lentos ou repetitivos pelas rotas. Funções puras têm teste de unidade. A spec da funcionalidade pode restringir isso, e ela prevalece.

**Base de testes**

As suítes de integração e de ponta a ponta usam a base de `test/support/`. Não há dublês de banco nem de e-mail.

- **Banco de testes:** é um banco separado no mesmo PostgreSQL, com o nome do banco de `DATABASE_URL` mais o sufixo `_test`. Ele é criado e migrado sozinho no começo de cada execução da suíte, e todas as tabelas são esvaziadas antes de cada arquivo de teste. Por dividirem esse banco, os arquivos rodam um por vez.
- **Aplicação:** um teste de ponta a ponta sobe a aplicação inteira com `createTestApp()`, que aplica a mesma configuração do `main.ts`, e fala com ela só por HTTP, com `supertest`. No fim, fecha com `app.close()`.
- **Rotas da autenticação:** `authRoutes(app)`, de `test/support/auth-routes.ts`, traz as chamadas de cadastro, verificação, login, renovação, logout, recuperação de senha e `GET /me`, e os atalhos que deixam um Usuário cadastrado ou verificado. O token de um link de e-mail sai de `verificationToken()` e `resetToken()`, que falham se o e-mail não tiver exatamente um link para o caminho esperado.
- **E-mail:** os testes leem o que foi enviado pela API HTTP do Mailpit, com `waitForMailTo()`. Cada teste usa um destinatário próprio, de `uniqueEmail()`, e acha os e-mails por ele. A caixa do Mailpit nunca é apagada, porque ela também serve ao desenvolvimento. Quando o teste provoca mais de um e-mail para o mesmo destinatário (reenvio, redefinição de senha), ele espera o seguinte com `waitForMailTo(endereço, { count: 2 })`. Sem o `count`, a espera termina no primeiro e-mail que já existir. Para provar que um envio **não** aconteceu, o teste provoca em seguida um envio que conhece, espera por ele e confere o total com `countMailTo()`.
- **Prazos:** são testados reduzindo a variável de ambiente no teste, com `vi.stubEnv` antes de `createTestApp()`, sem relógio falso dentro dos services. O valor trocado passa pelo schema: se for inválido, a aplicação do teste não sobe. O Vitest desfaz a troca sozinho no fim de cada teste (`unstubEnvs`), sem `vi.unstubAllEnvs()` à mão.
- **Configuração no teste:** um teste que precisa de um valor de configuração o pega da configuração injetada (`app.get(mailConfig.KEY)`), e não de `process.env`.
- **Rota só de teste:** para provar um comportamento da fundação que nenhuma rota de negócio exercita, o teste declara um controller próprio e o passa em `createTestApp({ controllers })`. Ele não entra na aplicação real.

## Aplicação HTTP

- **Prefixo:** o `/v1` é aplicado a todas as rotas por `configureApp()`, em `src/app.setup.ts`, que o `main.ts` e a base de testes chamam. Os controllers declaram a rota sem o prefixo.
- **Configuração global:** o que vale para todas as rotas e não depende de injeção entra em `configureApp()`. O filtro de erros e a validação de entrada são registrados no `AppModule` (`APP_FILTER` e `APP_PIPE`), e não no `main.ts`, para valerem também nos testes.

- **Rota protegida:** o controller leva `@UseGuards(AuthGuard)` e lê o id do Usuário com `@CurrentUserId()`, os dois de `src/common/auth/`. O módulo dele importa o `AccessTokensModule`. O guard só confere a assinatura do token, sem consultar o banco.

## Onde está cada assunto

Este arquivo é dono de como o código da API é escrito. O que o sistema faz está nos documentos de `docs/`, e nada de lá é repetido aqui. Antes de implementar, leia a seção do assunto:

| Assunto | Onde ler |
| --- | --- |
| Visão geral, fluxos principais e ambientes | `docs/hld.md` |
| Estrutura de pastas e bibliotecas escolhidas | `docs/lld.md`, seção 1 |
| Esquema e convenções do banco | `docs/lld.md`, seção 2 |
| Convenções do contrato, códigos de erro e endpoints | `docs/lld.md`, seção 3 |
| Estados e regras de negócio | `docs/lld.md`, seção 4 |
| Tarefas do worker | `docs/lld.md`, seção 5 |
| Limites, prazos e variáveis de ambiente | `docs/lld.md`, seção 6 |

Antes de criar uma rota ou uma tabela, leia as convenções das seções 3.1 e 2 do LLD.

## Práticas de código

O código segue Clean Architecture e SOLID. A regra central é a direção das dependências: o controller conhece o service, e o service não conhece nem o HTTP nem o fornecedor de nenhuma integração.

### Camadas de cada módulo

- **Controller:** rotas HTTP, DTOs e validação.
- **Service:** regras de negócio. Ele decide o que acontece e nunca abre uma transação: só os repositories têm o cliente do banco.
- **Repository:** acesso ao banco e a atomicidade de cada comando. Quando um comando lê, decide e grava, ou quando duas gravações têm de valer juntas, o repository as põe numa transação e devolve ao service o que aconteceu, como um resultado tipado (`'rotated' | 'invalid' | 'reused'`). O que só pode valer junto com a gravação entra nessa mesma transação, mesmo sendo consequência de uma regra. A regra continua descrita e conferida no service.

Cada módulo é dono das próprias tabelas. Um módulo só chama outro pelo service público dele, nunca pelas tabelas nem pelo repository.

As integrações externas (storage, fila, e-mail e gateway de pagamento) ficam atrás de interfaces em `src/infra/`, para que a troca de fornecedor fique restrita a um arquivo. Guards, filtros de erro e rate limit ficam em `src/common/`.

### A camada de serviços não conhece o mundo externo

Um service recebe e devolve dados simples e tipos do domínio. Ele tem de poder ser chamado de um controller, de uma tarefa do worker ou de um teste unitário sem nenhuma adaptação.

Antes de adicionar um import num arquivo de service, confira em qual dos dois grupos ele cai:

| Pode importar | Não pode importar |
| --- | --- |
| `Injectable`, `Inject` e `Logger` do `@nestjs/common` | `HttpException` e as filhas (`NotFoundException`, `BadRequestException` etc.) e `HttpStatus` |
| Entidades, tipos e erros de domínio do próprio módulo | `Request` e `Response` do Express, e os decorators de rota (`@Req`, `@Body`, `@Headers`) |
| O repository do próprio módulo | DTOs do controller, com decorators do class-validator ou do Swagger |
| O service público de outro módulo | Repository, tabelas ou tipos internos de outro módulo |
| As interfaces de `src/infra/` (storage, fila, e-mail, gateway) | SDKs de fornecedor (`@google-cloud/*`, cliente SMTP, SDK do gateway) |
| Utilitários puros, sem entrada e saída | `process.env`, direto. A configuração chega pelo módulo de config, por injeção. |

O que vem da requisição (corpo, parâmetros, usuário autenticado, IP, cabeçalho `Idempotency-Key`) é extraído no controller ou num guard e entra no service como argumento tipado.

A mesma regra vale para o repository: ele não importa nada de HTTP.

### Erros

- **No service:** uma regra de negócio violada lança um erro de domínio, uma classe própria que carrega o `code` estável do contrato (`quota_exceeded`, `invalid_move`) e os dados do caso. O erro não sabe o status HTTP.
- **No exception filter:** a resposta HTTP de erro é desenhada num único lugar, um exception filter global em `src/common/`. Ele traduz o erro de domínio em status e corpo `application/problem+json`, e é ali que mora o mapa de `code` para status da seção 3.1 do LLD.
- **No controller:** nada de `try/catch` para converter erro em resposta, nem `res.status(...).json(...)`. O controller deixa o erro subir até o filter.
- **Erro de domínio:** estende `DomainError`, de `src/common/errors/`, e fica no módulo dono da regra. Um `code` novo entra na mesma tarefa no tipo `ErrorCode`, no mapa de status do filter e na tabela da seção 3.1 do LLD. A mensagem do erro vai para o campo `detail` da resposta, então não traz detalhes internos.
- **Validação de entrada:** os DTOs são validados por um pipe global, com os decorators do class-validator. O erro dele passa pelo mesmo filter e sai como `validation_error`. Os campos que o DTO não declara são descartados.
- **Erro inesperado:** o filter registra em log e responde 500, sem expor mensagem interna nem stack trace. Isso vale também para o erro de uma biblioteca que traz um `statusCode` próprio: o filter só aceita o status de uma `HttpException` e dos erros do leitor do corpo do Express.
- **Erro de fornecedor:** a implementação de `src/infra/` que recebe um erro com significado para a regra de negócio (objeto inexistente, limite atingido) o converte em erro de domínio. Ela não deixa o erro do SDK subir contando com o status dele.

### SOLID no dia a dia

- **Responsabilidade única:** o controller adapta o HTTP, o service decide e o repository persiste. Um service que cresce para atender dois motivos de mudança é dividido.
- **Inversão de dependência:** o service depende da interface de `src/infra/`, e a implementação concreta é ligada no módulo por um token de injeção. Nos testes unitários, a interface é trocada por um dublê, sem `vi.mock()` de SDK.
- **Segregação de interface:** as interfaces de `src/infra/` são pequenas e escritas a partir do que o service precisa, e não do que o SDK oferece.
- **Aberto para extensão:** um fornecedor novo é uma implementação nova da interface, sem mudança no service.

## Configuração

Toda configuração entra no projeto por um módulo de config próprio, em `src/config/`, feito com `@nestjs/config` e validado com Joi.

- **Validação na subida:** um schema do Joi (`env.schema.ts`) descreve todas as variáveis de ambiente, com tipo, obrigatoriedade e valor padrão. A função `validatedEnv()` (`env.ts`) aplica esse schema, e é ela que o `ConfigModule.forRoot` recebe em `validate` e que as configurações por assunto chamam. Se uma variável faltar ou vier inválida, a aplicação não sobe e o erro diz qual é.
- **Segredos na mensagem de erro:** a mensagem de validação vai para o log. Numa variável secreta, a regra do schema não pode usar uma mensagem do Joi que repita o valor recusado, como a de `pattern`. Use um `.custom()` com mensagem fixa, como fazem as chaves do JWT.
- **Leitura do valor validado:** as configurações por assunto leem de `validatedEnv()`, que devolve as variáveis já convertidas e com os padrões aplicados pelo schema. Nenhuma delas converte valor nem repete um padrão, e nenhuma lê `process.env`. A validação roda de novo a cada leitura, então um valor trocado depois da subida do módulo, como num teste, também passa pelo schema.
- **Único ponto de leitura:** fora de `src/config/`, ninguém lê `process.env`. Services, guards e implementações de `src/infra/` recebem a configuração por injeção.
- **Tipagem:** os valores saem do módulo já convertidos e tipados (número, booleano, duração), e não como `string | undefined`. Prefira configurações agrupadas por assunto, com `registerAs` (`auth`, `storage`, `mail`), a chaves soltas lidas por nome. Cada assunto tem o próprio arquivo (`mail.config.ts`) e é injetado pela chave dele: `@Inject(mailConfig.KEY) config: ConfigType<typeof mailConfig>`.
- **Variável nova:** entra na mesma tarefa no schema do Joi, no `.env.example` e na tabela da seção 6 do LLD.
- **Padrões:** os valores padrão do schema são os de produção. O ambiente local os reduz pelo `.env`.
- **Testes:** os testes de unidade não carregam o `ConfigModule`. Eles injetam um objeto de configuração montado no próprio teste. Nas suítes de integração e de ponta a ponta, a base de testes carrega o `.env` e troca `DATABASE_URL` pelo banco de testes; ela e o `prisma.config.ts` são as únicas exceções à regra de não ler `process.env` fora de `src/config/`. A CLI do Prisma roda fora do Nest, então lê o `.env` e a `DATABASE_URL` por conta própria.
- **Arquivo `.env`:** a aplicação lê o `.env` da pasta do projeto, se ele existir, e as variáveis já definidas no ambiente prevalecem sobre as do arquivo. Em produção não há arquivo.
- **Lista das variáveis:** está na seção 6 do LLD, e não aqui. O `.env` fica fora do Git, e o `.env.example` é versionado.
- **Imagens:** o `Dockerfile.dev` é o do desenvolvimento, com o código montado por volume. O `Dockerfile` é o de produção, para o Cloud Run.
