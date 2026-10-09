# AGENTS.md

## Documentos

Em `docs/` estão os documentos que definem o produto, a arquitetura e os detalhes de implementação. Abaixo estão os principais do projeto:

1. `docs/product-brief.md`: o quê e para quem. Escopo do MVP, o que fica fora, planos e métricas.
2. `docs/hld.md`: High-level design, documento de arquitetura de alto nível. Aqui ficam as decisões de arquitetura, os fluxos principais e a visão geral do sistema.
3. `docs/lld.md`: Low-level design, documento de arquitetura de baixo nível. Aqui ficam a estrutura de pastas, as bibliotecas escolhidas, os esquemas de banco, os contratos de API, os estados, as regras de cota, as tarefas do worker, o upload em chunks e as variáveis de ambiente.
4. `docs/design-system.md`: linguagem visual da interface. Aqui ficam os tokens de cor, tipografia, espaçamento, raio e sombra, os estados de interação, os componentes, o comportamento responsivo e o fluxo de trabalho com o Figma.

Cada projeto tem o próprio `AGENTS.md`, com os comandos, as particularidades da stack e as práticas de código dele:

- `apps/api/AGENTS.md`: API em NestJS.
- `apps/web/AGENTS.md`: frontend em Next.js.

**Onde cada informação mora**

- **O que o sistema faz** fica em `docs/`: escopo, arquitetura, esquema, contrato, regras de negócio e configuração.
- **Como o código é escrito** fica no `AGENTS.md` do projeto: camadas, regras de import, tratamento de erros, nomes de arquivos, níveis de teste e comandos.
- **Nunca nos dois.** Uma informação tem um dono só, e o outro arquivo aponta para ele pelo nome do documento e da seção, sem repetir o conteúdo.
- **Este arquivo** só traz o que vale para todos os projetos.

## Execução no Docker

Tudo roda dentro dos contêineres do Docker Compose: instalação de dependências, servidor de desenvolvimento, testes, lint, compilação do TypeScript e qualquer outro comando do projeto. **Nunca rode `pnpm`, `node` ou `npx` direto na máquina.**

O ambiente de desenvolvimento usa o `compose.dev.yaml`, na raiz. Cada contêiner instala as dependências ao subir (`pnpm install`) e depois fica parado, sem iniciar a aplicação. A `node_modules` é criada na pasta do projeto, montada da máquina, e não num volume do Docker. Os comandos são executados nele com `docker compose exec`.

**Iniciar o projeto**

```bash
docker compose -f compose.dev.yaml up -d --build
docker compose -f compose.dev.yaml exec web pnpm dev --hostname 0.0.0.0
docker compose -f compose.dev.yaml exec api pnpm start:dev
```

Na primeira subida, a instalação das dependências leva algum tempo. Acompanhe com `docker compose -f compose.dev.yaml logs -f` e só inicie as aplicações depois do `Done` do pnpm.

Os dois últimos comandos ficam presos ao terminal, então rode cada um num terminal próprio.

- **Web:** responde em `http://localhost:3000`. O `--hostname 0.0.0.0` é necessário para que ela aceite conexões de fora do contêiner.
- **API:** responde em `http://localhost:3001` na máquina. Entre contêineres, o endereço é `http://api:3000`.

**Derrubar o projeto**

```bash
docker compose -f compose.dev.yaml down
```

As dependências instaladas continuam na pasta do projeto e são reaproveitadas na próxima subida.

**Executar comandos dentro do contêiner**

```bash
docker compose -f compose.dev.yaml exec web <comando>
```

Exemplos:

```bash
docker compose -f compose.dev.yaml exec web pnpm lint
docker compose -f compose.dev.yaml exec web pnpm exec tsc --noEmit
docker compose -f compose.dev.yaml exec web bash
```

O `web` é o nome do serviço no Compose. Para a API, troque por `api`.

## Rede no Docker

O projeto roda inteiro em contêineres do Docker Compose. Ao configurar a conexão entre serviços (banco, storage, e-mail, worker), **use sempre o nome do serviço do Compose como host**, nunca `localhost` nem `127.0.0.1`.

Dentro de um contêiner, `localhost` é o próprio contêiner, e não a máquina nem os outros serviços.

- **Certo:** `DATABASE_URL=postgresql://user:pass@postgres:5432/app`
- **Errado:** `DATABASE_URL=postgresql://user:pass@localhost:5432/app`

A regra vale para variáveis de ambiente, arquivos de configuração e código que referencie o host de um serviço.

## Princípios de trabalho

- **Responsabilidade única:** cada módulo e cada função tem uma responsabilidade clara. Reavalie isso a cada passo. Quando um módulo começa a criar ou alterar entidades de outro domínio, extraia a lógica para o módulo certo na hora, em vez de deixar para uma tarefa futura.
- **Tipagem:** TypeScript estrito em todas as camadas.
- **Testes:** pirâmide de testes em todos os níveis (unitários, de integração e de ponta a ponta).
- **Qualidade de código:** lint e formatação automáticos, com as ferramentas de cada projeto.
- **Documentação:** cada informação fica no documento dono dela, como descrito em [Documentos](#documentos).

## Design e Figma

O Figma é a ferramenta de design do projeto, acessada pelo servidor MCP do plugin `figma`.

**Arquivo do Figma:** <https://www.figma.com/design/wtW40yW0bpzoLvICwZMELG/Gerenciador-de-arquivos>

**Sempre que a tarefa envolver design ou interface, leia antes o `docs/design-system.md`**, seja para desenhar no Figma, seja para implementar uma tela ou um componente no código. Ele define os tokens, os componentes e o fluxo de trabalho com o Figma (sincronia, passos do Figma para o código, assets e validação visual), e as regras dele são obrigatórias.

## Definição de pronto

Uma mudança no código só está concluída quando **todos** os itens abaixo passam:

1. Durante o desenvolvimento, rode só os testes ligados ao código alterado.
2. Antes de terminar, rode todas as suítes de teste do projeto. Elas estão listadas no `AGENTS.md` dele.
3. O TypeScript compila sem erros: `pnpm exec tsc --noEmit` termina com código 0. Erros de compilação nunca ficam como dívida para tarefas futuras.
4. O lint passa: `pnpm lint`.
5. Em mudanças de interface, a validação visual descrita em `docs/design-system.md` foi feita.

Se algum item falhar, a tarefa não está pronta. Corrija a causa antes de declarar a conclusão.

Os comandos de teste, de lint e de formatação de cada projeto estão no `AGENTS.md` dele.

Rode todos eles dentro do contêiner do projeto, como descrito em [Execução no Docker](#execução-no-docker).

## Issues e tickets no Linear

O Linear é o gerenciador de issues do projeto, acessado pelo servidor MCP `linear-server`. Specs e tickets vivem lá, e não em arquivos do repositório.

- **Time:** Luiz Carlos (`LUI`).
- **Projeto:** gerenciador de arquivos.
- **Labels de tipo:** `Feature`, `Bug` e `Improvement`.
- **Label de triagem:** `ready-for-agent`, para a issue já especificada, que um agente pode pegar sem triagem adicional.

**Da funcionalidade ao ticket**

1. **Planejamento:** as decisões são fechadas com o usuário e registradas no documento dono delas: as de produto em `docs/` (LLD e, se houver termo novo, `GLOSSARY.md`), e as de prática de código no `AGENTS.md` do projeto.
2. **Spec:** uma issue por funcionalidade, com o problema, a solução, as histórias de usuário, as decisões de implementação e de teste e o que fica fora de escopo.
3. **Tickets:** sub-issues da spec. Cada ticket é uma fatia vertical, que atravessa banco, API, interface e testes e pode ser verificada sozinha. Tickets de preparação (ambiente, base de componentes) são a exceção e vêm primeiro.
4. **Bloqueios:** as dependências entre tickets são a relação nativa do Linear ("blocked by"), e não texto na descrição.

**Regras de escrita**

- Specs e tickets são escritos em português, com o vocabulário do `GLOSSARY.md`.
- Não cite caminhos de arquivo nem trechos de código: eles envelhecem rápido. Cite documentos e módulos pelo nome.
- Todo ticket traz critérios de aceite verificáveis, e cada critério diz por onde é conferido (teste HTTP da API ou teste no navegador).
- A spec e os tickets levam `ready-for-agent` e uma label de tipo.

**Ao trabalhar em um ticket**

- Pegue só tickets cujos bloqueios já foram concluídos.
- Leia o ticket e a spec pai antes de começar. O contrato e as regras completas estão no LLD.
- Use o identificador da issue no nome da branch, por exemplo `feature/lui-137-cadastro-e-verificacao`.
- Mova a issue para "In Progress" ao começar. Ela só é concluída quando todos os critérios de aceite e a [definição de pronto](#definição-de-pronto) passam.
- Não feche nem edite a spec pai ao concluir um ticket.
- Se a implementação mudar uma decisão, atualize o documento dono dela (o LLD ou o `AGENTS.md` do projeto) e o ticket na mesma tarefa.

## Convenções de Git

- **Branch principal:** `main`. Nunca faça commit direto nela.
- **Branches de trabalho:** `feature/*`, `bugfix/*`, `hotfix/*` e `docs/*`, criadas a partir da `main` e integradas por pull request.
- **Commits:** mensagens curtas e descritivas, focadas no porquê da mudança.

## Consulta à documentação de bibliotecas

Quando precisar consultar a documentação de uma biblioteca, use o context7 para buscar informações atualizadas e precisas.

