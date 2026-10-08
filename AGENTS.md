# AGENTS.md

## Documentos

Em `docs/` estão os documentos que definem o produto, a arquitetura e os detalhes de implementação. Abaixo estão os principais do projeto:

1. `docs/product-brief.md`: o quê e para quem. Escopo do MVP, o que fica fora, planos e métricas.
2. `docs/hld.md`: High-level design, documento de arquitetura de alto nível. Aqui ficam as decisões de arquitetura, os fluxos principais e a visão geral do sistema.
3. `docs/lld.md`: Low-level design, documento de arquitetura de baixo nível com detalhes de implementação. Aqui ficam os esquemas de banco, contratos de API, estados, regras de cota, tarefas do worker e upload em chunks.

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

## Definição de pronto

Uma mudança no código só está concluída quando **todos** os itens abaixo passam:

1. Durante o desenvolvimento, rode só os testes ligados ao código alterado.
2. Antes de terminar, rode a suíte completa de testes: `pnpm test`.
3. O TypeScript compila sem erros: `pnpm exec tsc --noEmit` termina com código 0. Erros de compilação nunca ficam como dívida para tarefas futuras.
4. O lint passa: `pnpm lint`.

Se algum item falhar, a tarefa não está pronta. Corrija a causa antes de declarar a conclusão.

Os comandos acima são os planejados para o monorepo com pnpm. Confira os scripts reais no `package.json` de cada projeto antes de rodá-los.

## Convenções de Git

- **Branch principal:** `main`. Nunca faça commit direto nela.
- **Branches de trabalho:** `feature/*`, `bugfix/*`, `hotfix/*` e `docs/*`, criadas a partir da `main` e integradas por pull request.
- **Commits:** mensagens curtas e descritivas, focadas no porquê da mudança.

## Consulta à documentação de bibliotecas

Quando precisar consultar a documentação de uma biblioteca, use o context7 para buscar informações atualizadas e precisas.

