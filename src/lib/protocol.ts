import type { ProtocolConfig, StageId, StepColor, StepDef } from "./types";

export const STAGES: { id: StageId; title: string; short: string }[] = [
  { id: 1, title: "Identificação da sessão", short: "Identificação" },
  { id: 2, title: "Conferência do participante", short: "Participante" },
  { id: 3, title: "Preparação do ambiente, EEG e TELL", short: "Preparação" },
  { id: 4, title: "Conferência antes de iniciar", short: "Pré-início" },
  { id: 5, title: "Execução do protocolo", short: "Execução" },
  { id: 6, title: "Verificações após o registro", short: "Pós-registro" },
  { id: 7, title: "Resumo e encerramento", short: "Encerramento" },
];

export interface CheckDef {
  id: string;
  text: string;
  /** Critical items cannot be "não se aplica" and are always required. */
  critical?: boolean;
  /** Blocking items: a justification never replaces them (consent, eligibility). */
  blocking?: boolean;
  required?: boolean;
  hint?: string;
}

export interface CheckGroup {
  id: string;
  stage: StageId;
  title: string;
  items: CheckDef[];
}

export const CHECK_GROUPS: CheckGroup[] = [
  {
    id: "part",
    stage: 2,
    title: "Conferência do participante",
    items: [
      { id: "part.codigo", text: "Código do participante conferido", critical: true },
      {
        id: "part.consentimento",
        text: "Consentimento conferido conforme o procedimento do estudo",
        critical: true,
        blocking: true,
      },
      {
        id: "part.elegibilidade",
        text: "Elegibilidade conferida pela equipe",
        critical: true,
        blocking: true,
      },
      {
        id: "part.orientacoes",
        text: "Orientações compreendidas pelo participante",
        required: true,
      },
      {
        id: "part.conforto",
        text: "Participante confortável e disponível para iniciar",
        required: true,
      },
    ],
  },
  {
    id: "amb",
    stage: 3,
    title: "Ambiente e posicionamento",
    items: [
      { id: "amb.sala", text: "Sala preparada e interrupções reduzidas", required: true },
      {
        id: "amb.posicionamento",
        text: "Participante posicionado com conforto e apoio adequado",
        required: true,
      },
      {
        id: "amb.cabos",
        text: "Cabos organizados para reduzir tração e movimentação",
        required: true,
      },
      { id: "amb.energia", text: "Equipamentos com energia ou bateria suficiente", required: true },
      { id: "amb.materiais", text: "Instruções e materiais disponíveis", required: true },
    ],
  },
  {
    id: "eeg",
    stage: 3,
    title: "EEG",
    items: [
      { id: "eeg.sistema", text: "Equipamento e software identificados", required: true },
      { id: "eeg.parametros", text: "Parâmetros de aquisição conferidos", required: true },
      { id: "eeg.eventos", text: "Método de anotação dos eventos definido", required: true },
      { id: "eeg.touca", text: "Touca ou eletrodos adequados ao procedimento", required: true },
      { id: "eeg.posicao", text: "Posicionamento dos eletrodos conferido", required: true },
      { id: "eeg.refterra", text: "Referência e terra conferidos", required: true },
      {
        id: "eeg.impedancia",
        text: "Contato dos eletrodos e impedâncias verificados",
        required: true,
      },
      { id: "eeg.canais", text: "Canais problemáticos identificados e correções registradas" },
      { id: "eeg.inspecao", text: "Inspeção visual do sinal antes de iniciar", required: true },
      {
        id: "eeg.arquivo",
        text: "Nome planejado do arquivo e pasta de destino definidos",
        required: true,
      },
      {
        id: "eeg.teste",
        text: "Teste de gravação e de marcadores realizado",
        hint: "Somente se previsto pela equipe.",
      },
    ],
  },
  {
    id: "tell",
    stage: 3,
    title: "TELL",
    items: [
      { id: "tell.app", text: "Aplicativo aberto e pronto", required: true },
      { id: "tell.codigo", text: "Código do participante conferido no TELL", required: true },
      { id: "tell.microfone", text: "Microfone e permissões conferidos", required: true },
      { id: "tell.teste", text: "Teste de captação de voz realizado", required: true },
      { id: "tell.armazenamento", text: "Armazenamento e bateria conferidos", required: true },
      {
        id: "tell.localizacao",
        text: "Localização ou identificação dos registros conhecida",
        required: true,
      },
      {
        id: "tell.blocos",
        text: "Blocos que utilizarão o TELL confirmados pela equipe",
        required: true,
      },
    ],
  },
  {
    id: "cfg",
    stage: 4,
    title: "Configuração da sessão",
    items: [
      {
        id: "cfg.confirmada",
        text: "Configuração do protocolo revisada e confirmada pela equipe",
        critical: true,
      },
      {
        id: "cfg.instrucoes",
        text: "Instruções da tarefa secundária disponíveis para o aplicador",
        required: true,
      },
    ],
  },
  {
    id: "enc",
    stage: 6,
    title: "Encerramento dos registros",
    items: [
      { id: "enc.termino", text: "Término do protocolo registrado", required: true },
      { id: "enc.eeg", text: "Estado final do EEG confirmado", required: true },
      { id: "enc.tell", text: "Estado final do TELL confirmado", required: true },
      { id: "enc.horarios", text: "Horários de encerramento conferidos", required: true },
      {
        id: "enc.incompletas",
        text: "Interrupções e tarefas incompletas documentadas",
        required: true,
      },
    ],
  },
  {
    id: "arq",
    stage: 6,
    title: "Conferência dos arquivos",
    items: [
      { id: "arq.eeg", text: "Arquivo de EEG salvo", required: true },
      { id: "arq.nome", text: "Nome e código do participante conferidos", required: true },
      { id: "arq.pasta", text: "Pasta de destino conferida", required: true },
      { id: "arq.abertura", text: "Abertura ou reprodução verificada pela equipe", required: true },
      {
        id: "arq.trechos",
        text: "Presença e duração dos trechos esperados verificadas",
        required: true,
      },
      {
        id: "arq.tell",
        text: "Registros do TELL localizados e conferidos",
        required: true,
        hint: "Quando aplicável.",
      },
      {
        id: "arq.correspondencia",
        text: "Correspondência entre arquivos, participante, sessão e tarefas conferida",
        required: true,
      },
      {
        id: "arq.marcadores",
        text: "Referências temporais e marcadores revisados",
        required: true,
      },
      {
        id: "arq.backup",
        text: "Cópia de segurança realizada conforme a rotina do estudo",
        required: true,
      },
    ],
  },
  {
    id: "pos",
    stage: 6,
    title: "Participante e materiais",
    items: [
      { id: "pos.conforto", text: "Estado e conforto após a coleta verificados", required: true },
      {
        id: "pos.intercorrencias",
        text: "Intercorrências e providências registradas",
        required: true,
      },
      { id: "pos.remocao", text: "Eletrodos ou touca removidos", required: true },
      {
        id: "pos.pele",
        text: "Pele e desconfortos locais verificados conforme a rotina da equipe",
        required: true,
      },
      { id: "pos.orientacoes", text: "Orientações finais fornecidas", required: true },
      {
        id: "pos.higiene",
        text: "Equipamentos e materiais higienizados ou encaminhados conforme procedimento local",
        required: true,
      },
      { id: "pos.ambiente", text: "Ambiente preparado para a próxima coleta" },
    ],
  },
];

export const ALL_CHECKS: (CheckDef & { group: CheckGroup })[] = CHECK_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g })),
);
export const CHECK_BY_ID = Object.fromEntries(ALL_CHECKS.map((c) => [c.id, c]));

export const STEP_COLORS: Record<
  StepColor,
  { label: string; swatch: string; soft: string; ink: string }
> = {
  red: { label: "Vermelho", swatch: "#d4473b", soft: "#fbecea", ink: "#9b2c22" },
  lightblue: { label: "Azul-claro", swatch: "#7cc3ea", soft: "#eaf5fb", ink: "#24658a" },
  yellow: { label: "Amarelo", swatch: "#e8b923", soft: "#fcf5df", ink: "#7a5b00" },
  purple: { label: "Roxo", swatch: "#8a5cc8", soft: "#f2ecfa", ink: "#5b3796" },
};

const FLUENCY = "Falar o maior número possível de nomes de animais, sem repeti-los.";

const BASE: StepDef[] = [
  {
    key: "repouso_inicial",
    kind: "repouso",
    condition: "repouso",
    name: "Repouso inicial",
    detail: "Sem atividade ou estímulos",
    minutes: 1,
    color: "red",
  },
  {
    key: "pausa_1",
    kind: "pausa",
    condition: "pausa",
    name: "Pausa",
    minutes: 1,
    color: "lightblue",
  },
  {
    key: "relato_dia",
    kind: "tarefa",
    condition: "simples",
    name: "Relato sobre como foi o dia",
    minutes: 2,
    color: "yellow",
    speech: "Relatar como foi o dia.",
  },
  {
    key: "pausa_2",
    kind: "pausa",
    condition: "pausa",
    name: "Pausa",
    minutes: 1,
    color: "lightblue",
  },
  {
    key: "fluencia_simples",
    kind: "tarefa",
    condition: "simples",
    name: "Fluência de animais",
    minutes: 2,
    color: "purple",
    speech: FLUENCY,
  },
  {
    key: "pausa_3",
    kind: "pausa",
    condition: "pausa",
    name: "Pausa",
    detail: "Sem estímulos",
    minutes: 1,
    color: "lightblue",
  },
  {
    key: "relato_tarde_dupla",
    kind: "tarefa",
    condition: "dupla",
    name: "Relato sobre como foi a tarde + tarefa secundária",
    minutes: 2,
    color: "yellow",
    speech: "Relatar como foi a tarde.",
  },
  {
    key: "pausa_4",
    kind: "pausa",
    condition: "pausa",
    name: "Pausa",
    minutes: 1,
    color: "lightblue",
  },
  {
    key: "fluencia_dupla",
    kind: "tarefa",
    condition: "dupla",
    name: "Fluência de animais + tarefa secundária",
    minutes: 2,
    color: "purple",
    speech: FLUENCY,
  },
  {
    key: "pausa_final",
    kind: "pausa",
    condition: "pausa",
    name: "Pausa final",
    detail: "Sem estímulos",
    minutes: 1,
    color: "lightblue",
  },
];

export const ALL_STEP_DEFS: StepDef[] = BASE;

export function buildSequence(_config?: ProtocolConfig): StepDef[] {
  return BASE;
}

export const SPEECH_STEPS = BASE.filter((s) => s.kind === "tarefa");

export const CONDITION_LABEL: Record<StepDef["condition"], string> = {
  repouso: "Repouso",
  pausa: "Pausa prevista no protocolo",
  simples: "Tarefa simples",
  dupla: "Dupla tarefa",
};

export const EEG_PAUSE_LABEL: Record<ProtocolConfig["eegPauses"], string> = {
  indefinido: "Não definido",
  interrompido: "Registro interrompido nas pausas",
  continuo: "Registro contínuo com marcação",
  outro: "Outro procedimento aprovado",
};

export const EVENT_CATEGORIES = [
  "Movimento",
  "Tremor ou discinesia",
  "Piscada ou movimento ocular",
  "Fala fora da tarefa",
  "Ruído ambiental",
  "Problema de eletrodo ou sinal",
  "Problema no EEG",
  "Problema no TELL ou áudio",
  "Dificuldade de compreensão",
  "Fadiga ou desconforto",
  "Interrupção externa",
  "Desvio do protocolo",
  "Outro",
];

export function defaultConfig(): ProtocolConfig {
  return {
    secondaryName: "",
    secondaryInstructions: "",
    secondaryMaterials: "",
    secondaryMeasure: "",
    secondaryNotes: "",
    eegPauses: "indefinido",
    eegPausesDescription: "",
    tellBlocks: {
      relato_dia: "sim",
      fluencia_simples: "indefinido",
      relato_tarde_dupla: "indefinido",
      fluencia_dupla: "indefinido",
    },
    restOrientation: "",
    restEyes: "",
    soundAlert: false,
    vibrationAlert: false,
  };
}

export const CONFIG_LABELS: Record<string, string> = {
  secondaryName: "Tarefa secundária — nome",
  secondaryInstructions: "Tarefa secundária — instruções aprovadas",
  secondaryMaterials: "Tarefa secundária — materiais e posicionamento",
  secondaryMeasure: "Tarefa secundária — medida de desempenho",
  secondaryNotes: "Tarefa secundária — observações operacionais",
  eegPauses: "EEG nas pausas",
  eegPausesDescription: "EEG nas pausas — descrição",
  tellBlocks: "Blocos com registro pelo TELL",
  restOrientation: "Postura durante o repouso",
  restEyes: "Olhos durante o repouso",
  soundAlert: "Alerta sonoro",
  vibrationAlert: "Vibração",
};
