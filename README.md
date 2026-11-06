# Protocolo EEG e TELL

Checklist interativo para apoiar a coleta presencial de EEG e tarefas de fala em participantes com doença de Parkinson. A aplicação tem sete etapas, configuração da sessão, sequência cronometrada, registro de intercorrências, verificações após a coleta e exportação do resumo.

## Abrir com dois cliques

Abra `index.html` na pasta do projeto. Esse arquivo é a aplicação pronta: funciona diretamente no navegador, sem servidor ou instalação de ferramentas. Também é possível copiá-lo sozinho para outro computador.

Essa versão inclui a aplicação, os estilos e as imagens no próprio arquivo. Os dados de coleta continuam temporários e são apagados ao recarregar ou fechar a página.

Depois de alterar o código, execute `pnpm build` para atualizar `index.html`. Inclua esse arquivo no GitHub junto com o código. A publicação pelo fluxo automático também gera a versão atualizada em `dist/index.html`. A entrada de desenvolvimento fica em `src/index.html`; ela é processada pelo Vite.

## Executar para desenvolvimento

Requisitos: Node.js 22.12 ou posterior e pnpm 10.34.3. A versão do gerenciador está em `package.json`; `.mise.toml` também registra as ferramentas para quem utiliza mise.

```sh
npm install --global pnpm@10.34.3
pnpm install --frozen-lockfile
pnpm dev
```

Abra o endereço informado no terminal. Para acessar a prévia em um celular na mesma rede, execute `pnpm dev --host 0.0.0.0` e utilize o endereço de rede informado pelo Vite. Cada dispositivo terá uma sessão independente.

```sh
pnpm test       # Regressões do fluxo da coleta e da exportação
pnpm typecheck  # Verificação de tipos
pnpm build      # Verificação de tipos, dist/ e index.html
pnpm preview    # Prévia local da versão compilada
```

## Uso durante a coleta

- Identifique o participante e a sessão, sem dados de identificação direta.
- Confira o participante e prepare o ambiente e os equipamentos.
- Na preparação, os campos de EEG e TELL aparecem logo abaixo dos checks correspondentes. O método de anotação dos eventos fica no EEG; os blocos com TELL ficam no check de blocos do aplicativo.
- Na etapa 4, registre as instruções da tarefa secundária, o procedimento do EEG nas pausas e a condição dos olhos: abertos, fechados ou variável. Postura e observações são opcionais.
- Confirme consentimento e elegibilidade. Pendências operacionais podem ser documentadas com justificativa; esses dois checks não podem ser contornados.
- Libere o início após a conferência. Mudanças na preparação antes da primeira tarefa exigem nova liberação.
- Clique em **Iniciar protocolo** uma única vez. O repouso inicial, as tarefas e as pausas avançam automaticamente. A sequência fixa tem 10 períodos e 14 minutos planejados, incluindo o repouso inicial de um minuto. Não há decisão prévia sobre outro repouso.
- Inícios, términos e duração são registrados pelo cronograma do website, sem confirmações repetidas a cada período. Os horários automáticos não equivalem a comandos ou marcadores enviados ao EEG ou ao TELL.
- Durante o repouso, a condição dos olhos pode ser marcada e suas mudanças ficam na linha do tempo.
- **Interromper experimento** registra o horário imediatamente e congela o avanço. Ao retomar, os períodos seguintes são deslocados pelo tempo da interrupção. Reiniciar cria imediatamente uma nova tentativa e preserva a anterior.
- **Encerrar protocolo** permite terminar antes do tempo previsto, preservando as tarefas incompletas. Ao completar o último período, o término do cronograma é registrado automaticamente.
- A sequência continua ao navegar entre as etapas. Depois de uma ausência em segundo plano, o cronograma é atualizado pelos horários previstos. Atrasos detectados do navegador são registrados para que a equipe confira os períodos ocorridos durante a ausência.
- Após o registro, confira arquivos, estado dos equipamentos, participante e materiais. No resumo, selecione o resultado operacional e exporte em JSON ou HTML, ou use a impressão para salvar como PDF.

Alertas sonoros e vibração começam desativados. Os parâmetros de EEG são informados pela equipe. Ajustes no relógio ou suspensão do dispositivo podem exigir conferência dos horários; inconsistências detectadas aparecem na linha do tempo.

## Dados temporários

O preenchimento existe apenas na memória da página. Navegar entre etapas mantém os dados; recarregar, fechar a página ou confirmar a troca de participante apaga a sessão. Não existe recuperação automática, servidor de dados, sincronização, login, localStorage, sessionStorage ou IndexedDB.

Antes de trocar de participante, é possível exportar o resumo. A aplicação mantém os dados até a confirmação de que o arquivo foi recebido, ou até a escolha explícita de limpar sem exportar. Avisos ao fechar ou recarregar dependem do navegador e podem não aparecer no celular.
