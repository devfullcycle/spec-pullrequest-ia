## Estado atual

O projeto ainda é o esqueleto gerado pelo Nest CLI: um `AppModule` com um controller e um service de exemplo. Banco, Prisma, módulos de domínio, `infra/` e `common/` **ainda não existem**. A estrutura-alvo está na seção 1 do `docs/lld.md`, e o código novo deve nascer nela.

## Comandos

Todos rodam no contêiner `api`, a partir da raiz do repositório:

```bash
docker compose -f compose.dev.yaml exec api <comando>
```

| Comando | O que faz |
| --- | --- |
| `pnpm start:dev` | Sobe a API em modo watch (`http://localhost:3001` na máquina) |
| `pnpm test` | Testes de unidade (`*.spec.ts`) |
| `pnpm test src/app.controller.spec.ts` | Um arquivo de teste só |
| `pnpm test -t "nome do teste"` | Um teste pelo nome |
| `pnpm test:e2e` | Testes de ponta a ponta (`*.e2e-spec.ts`) |
| `pnpm test:cov` | Testes unitários com cobertura |
| `pnpm lint` | oxlint com regras que usam tipos |
| `pnpm format` | Prettier em `src/` e `test/` |
| `pnpm exec tsc --noEmit` | Checagem de tipos |
| `pnpm build` | Compila para `dist/` |

**O `pnpm test` não roda os testes de ponta a ponta.** As duas suítes têm configurações separadas do Vitest. Para cumprir a definição de pronto, rode `pnpm test` e `pnpm test:e2e`.

O `pnpm lint` só aponta os problemas, sem corrigir. A formatação é conferida à parte, pelo `pnpm format`.

## Particularidades da stack

- **Módulos ES:** o projeto é `"type": "module"` com `moduleResolution: nodenext`. Todo import relativo leva a extensão `.js`, mesmo apontando para um arquivo `.ts` (`import { AppService } from './app.service.js'`). Sem a extensão, o `tsc` e o Node falham.
- **Vitest:** `describe`, `it`, `expect` e `vi` são globais, sem import. Os mocks usam `vi.fn()` e `vi.mock()`.
- **oxlint:** as regras ficam no `.oxlintrc.json`. `no-floating-promises` é erro, então toda promise precisa de `await`, `return` ou `void`.
- **TypeScript:** `strict` ligado, com `strictPropertyInitialization` desligado para os DTOs e as classes com decorators.

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
| Exception filter | `domain-error.filter.ts` |
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

**A suíte de integração ainda não está configurada.** Hoje só existem `pnpm test` (unidade) e `pnpm test:e2e`, e nenhum dos dois encontra arquivos `.int-spec.ts`. O primeiro teste de integração traz junto uma configuração própria do Vitest e o script `test:int`.

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
- **Service:** regras de negócio e transações.
- **Repository:** acesso ao banco.

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
- **Validação de entrada:** o erro do `ValidationPipe` passa pelo mesmo filter e sai como `validation_error`.
- **Erro inesperado:** o filter registra em log e responde 500, sem expor mensagem interna nem stack trace.

### SOLID no dia a dia

- **Responsabilidade única:** o controller adapta o HTTP, o service decide e o repository persiste. Um service que cresce para atender dois motivos de mudança é dividido.
- **Inversão de dependência:** o service depende da interface de `src/infra/`, e a implementação concreta é ligada no módulo por um token de injeção. Nos testes unitários, a interface é trocada por um dublê, sem `vi.mock()` de SDK.
- **Segregação de interface:** as interfaces de `src/infra/` são pequenas e escritas a partir do que o service precisa, e não do que o SDK oferece.
- **Aberto para extensão:** um fornecedor novo é uma implementação nova da interface, sem mudança no service.

## Configuração

Toda configuração entra no projeto por um módulo de config próprio, em `src/config/`, feito com `@nestjs/config` e validado com Joi. **Ele ainda não existe:** hoje o `main.ts` lê `process.env.PORT` direto, e isso sai quando o módulo for criado.

- **Validação na subida:** um schema do Joi descreve todas as variáveis de ambiente, com tipo, obrigatoriedade e valor padrão. Ele é passado ao `ConfigModule.forRoot` em `validationSchema`. Se uma variável faltar ou vier inválida, a aplicação não sobe e o erro diz qual é.
- **Único ponto de leitura:** fora de `src/config/`, ninguém lê `process.env`. Services, guards e implementações de `src/infra/` recebem a configuração por injeção.
- **Tipagem:** os valores saem do módulo já convertidos e tipados (número, booleano, duração), e não como `string | undefined`. Prefira configurações agrupadas por assunto, com `registerAs` (`auth`, `storage`, `mail`), a chaves soltas lidas por nome.
- **Variável nova:** entra na mesma tarefa no schema do Joi, no `.env.example` e na tabela da seção 6 do LLD.
- **Padrões:** os valores padrão do schema são os de produção. O ambiente local os reduz pelo `.env`.
- **Testes:** os testes de unidade não carregam o `ConfigModule`. Eles injetam um objeto de configuração montado no próprio teste.
- **Lista das variáveis:** está na seção 6 do LLD, e não aqui. O `.env` fica fora do Git, e o `.env.example` é versionado.
- **Imagens:** o `Dockerfile.dev` é o do desenvolvimento, com o código montado por volume. O `Dockerfile` é o de produção, para o Cloud Run.
