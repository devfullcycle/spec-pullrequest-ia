# AGENTS.md

## Documentos

Em `docs/` estão os documentos que definem o produto, a arquitetura e os detalhes de implementação. Abaixo estão os principais do projeto:

1. `docs/product-brief.md`: o quê e para quem. Escopo do MVP, o que fica fora, planos e métricas.
2. `docs/hld.md`: High-level design, documento de arquitetura de alto nível. Aqui ficam as decisões de arquitetura, os fluxos principais e a visão geral do sistema.
3. `docs/lld.md`: Low-level design, documento de arquitetura de baixo nível com detalhes de implementação. Aqui ficam os esquemas de banco, contratos de API, estados, regras de cota, tarefas do worker e upload em chunks.
4. `docs/design-system.md`: linguagem visual da interface. Aqui ficam os tokens de cor, tipografia, espaçamento, raio e sombra, os estados de interação, os componentes, o comportamento responsivo e o fluxo de trabalho com o Figma.

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

- **Responsabilidade única:** cada módulo, service e função tem uma responsabilidade clara. Reavalie isso a cada passo. Quando um módulo começa a criar ou alterar entidades de outro domínio, extraia a lógica para o módulo certo na hora, em vez de deixar para uma tarefa futura. Um módulo só chama outro pelo service público dele.
- **Tipagem:** TypeScript estrito em todas as camadas.
- **Testes:** pirâmide de testes em todos os níveis (unitários, de integração e de ponta a ponta).
- **Qualidade de código:** ESLint e Prettier para manter o estilo consistente.
- **Documentação:** arquitetura, configuração e solução de problemas ficam em `docs/`.

## Design e Figma

O Figma é a ferramenta de design do projeto, acessada pelo servidor MCP do plugin `figma`.

**Sempre que a tarefa envolver design ou interface, leia antes o `docs/design-system.md`**, seja para desenhar no Figma, seja para implementar uma tela ou um componente no código. Ele define os tokens, os componentes e o fluxo de trabalho com o Figma (sincronia, passos do Figma para o código, assets e validação visual), e as regras dele são obrigatórias.

## Definição de pronto

Uma mudança no código só está concluída quando **todos** os itens abaixo passam:

1. Durante o desenvolvimento, rode só os testes ligados ao código alterado.
2. Antes de terminar, rode a suíte completa de testes: `pnpm test`.
3. O TypeScript compila sem erros: `pnpm exec tsc --noEmit` termina com código 0. Erros de compilação nunca ficam como dívida para tarefas futuras.
4. O lint passa: `pnpm lint`.
5. Em mudanças de interface, a validação visual descrita em `docs/design-system.md` foi feita.

Se algum item falhar, a tarefa não está pronta. Corrija a causa antes de declarar a conclusão.

Os comandos acima são os planejados para o monorepo com pnpm. Confira os scripts reais no `package.json` de cada projeto antes de rodá-los.

Rode todos eles dentro do contêiner do projeto, como descrito em [Execução no Docker](#execução-no-docker).

## Convenções de Git

- **Branch principal:** `main`. Nunca faça commit direto nela.
- **Branches de trabalho:** `feature/*`, `bugfix/*`, `hotfix/*` e `docs/*`, criadas a partir da `main` e integradas por pull request.
- **Commits:** mensagens curtas e descritivas, focadas no porquê da mudança.

## Consulta à documentação de bibliotecas

Quando precisar consultar a documentação de uma biblioteca, use o context7 para buscar informações atualizadas e precisas.

