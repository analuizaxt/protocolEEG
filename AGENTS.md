# Protocolo EEG e TELL

Aplicação React 19, TypeScript, Vite 8 e Tailwind CSS 4, independente do Figma.

## Ambiente

- Node.js 22.12 ou posterior; pnpm 10.34.3 definido em package.json e .mise.toml.
- Instalar com `pnpm install --frozen-lockfile`.
- Iniciar com `pnpm dev`; não presumir que existe um servidor em execução.
- Validar mudanças funcionais com `pnpm test` e `pnpm build`.
- Manter pnpm-lock.yaml atualizado. Não misturar arquivos de trava de outros gerenciadores.

## Estrutura

- src/index.html: entrada de desenvolvimento e compilação.
- index.html: versão pronta gerada; atualizar com pnpm build, sem edição manual.
- scripts/standalone.mjs: incorpora o pacote compilado em index.html e dist/index.html.
- src/App.tsx: sessão, navegação, alertas e troca de participante.
- src/lib/protocol.ts: checks, sequência e configuração inicial.
- src/lib/session.ts: transições, durações e validações.
- src/lib/store.tsx: dados em memória.
- src/lib/export.ts: resumos JSON, HTML e impressão.
- src/stages: as sete etapas de trabalho.
- src/components: componentes reutilizados.
- src/index.css: Tailwind e estilos globais.
- tests/session.test.ts: regressões dos fluxos de coleta e exportação.
- .github/workflows/deploy.yml: validação e publicação pelo GitHub Pages.

## Regras funcionais

Preservar dados somente na memória da página. Recarregar apaga a sessão. Não adicionar armazenamento persistente nem envio de dados sem uma mudança explícita nos requisitos.

O website não controla o EEG ou o TELL. Confirmações são manuais. Não inserir instruções clínicas, tarefas, limites técnicos ou critérios de elegibilidade não definidos pela equipe.

Preservar tentativas, interrupções, desvios e valores originais de horários corrigidos. A sequência guiada inicia uma vez e avança automaticamente entre os períodos conforme os tempos previstos. As transições e horários gerados pelo cronograma não comprovam ações nos equipamentos. Interrupções suspendem o avanço e devem manter o histórico. Consentimento e elegibilidade não podem ser substituídos por justificativas.

Manter base relativa no Vite para publicação em subpastas do GitHub Pages. Não readicionar configurações ou scripts do Figma.

Estilos globais de elementos devem ficar em `@layer base`, preservando a precedência das classes utilitárias do Tailwind.

O build deve atualizar a versão pronta que abre com dois cliques. Preservar o empacotamento autossuficiente e verificar a abertura por file:// ao alterar esse processo.
