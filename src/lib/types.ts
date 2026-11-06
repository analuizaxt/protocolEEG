export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CheckStatus = "pendente" | "concluido" | "na";

export interface CheckState {
  status: CheckStatus;
  note: string;
  completedAt: number | null;
  responsible: string;
  /** Overrides the default "required for this session" flag (non-critical items only). */
  required?: boolean;
}

export type StepColor = "red" | "lightblue" | "yellow" | "purple";
export type StepKind = "repouso" | "pausa" | "tarefa";
export type StepCondition = "repouso" | "pausa" | "simples" | "dupla";

export interface StepDef {
  key: string;
  kind: StepKind;
  condition: StepCondition;
  name: string;
  detail?: string;
  minutes: number;
  color: StepColor;
  speech?: string;
}

export type TriState = "indefinido" | "sim" | "nao";

export interface ProtocolConfig {
  secondaryName: string;
  secondaryInstructions: string;
  secondaryMaterials: string;
  secondaryMeasure: string;
  secondaryNotes: string;
  eegPauses: "indefinido" | "interrompido" | "continuo" | "outro";
  eegPausesDescription: string;
  tellBlocks: Record<string, TriState>;
  restOrientation: string;
  restEyes: "" | "abertos" | "fechados" | "variavel";
  soundAlert: boolean;
  vibrationAlert: boolean;
}

export interface ConfigChange {
  id: string;
  at: number;
  changes: { key: string; label: string; from: string; to: string }[];
  justification: string;
}

export interface Attempt {
  id: string;
  stepKey: string;
  n: number;
  startedAt: number;
  endedAt: number | null;
  endKind: "concluida" | "interrompida" | null;
  earlyReason: string;
  retryReason: string;
  considered: boolean;
  automaticStart: boolean;
  automaticEnd: boolean;
  eyes: "" | "abertos" | "fechados" | "variavel";
}

export interface Interruption {
  id: string;
  start: number;
  end: number | null;
  attemptId: string | null;
  stepKey: string | null;
  reason: string;
  eegState: string;
  tellState: string;
  outcome: "retomada" | "nova_tentativa" | "sessao_encerrada" | null;
}

export type EventType =
  | "intercorrencia"
  | "etapa"
  | "interrupcao"
  | "check"
  | "correcao"
  | "config"
  | "desvio"
  | "relogio"
  | "sinalizacao"
  | "sessao";

export interface TimelineEvent {
  id: string;
  at: number;
  type: EventType;
  category?: string;
  label: string;
  description: string;
  stepKey: string | null;
  attemptId: string | null;
  /** Milliseconds since the start of the related attempt (effective time). */
  relativeMs: number | null;
}

export interface FlaggedInterval {
  id: string;
  start: number;
  end: number | null;
  stepKey: string | null;
  attemptId: string | null;
  note: string;
}

export interface TimeCorrection {
  id: string;
  at: number;
  target: string;
  original: number | null;
  corrected: number;
  justification: string;
}

export interface Deviation {
  id: string;
  at: number;
  items: string[];
  justification: string;
}

export type Outcome = "concluida" | "concluida_desvios" | "interrompida";

export interface SessionState {
  id: string;
  createdAt: number;
  stage: StageId;
  fields: Record<string, string>;
  checks: Record<string, CheckState>;
  config: ProtocolConfig;
  configConfirmedAt: number | null;
  configChanges: ConfigChange[];
  attempts: Attempt[];
  interruptions: Interruption[];
  skipped: Record<string, { at: number; reason: string }>;
  stepNotes: Record<string, string>;
  selectedStep: string;
  events: TimelineEvent[];
  flagged: FlaggedInterval[];
  corrections: TimeCorrection[];
  deviations: Deviation[];
  preStartClearedAt: number | null;
  experimentStartedAt: number | null;
  experimentEndedAt: number | null;
  experimentEndReason: "concluida" | "interrompida" | null;
  outcome: Outcome | null;
  closedAt: number | null;
  closedWithPendencies: boolean;
}

export type SessionStatus =
  | "preparacao"
  | "execucao"
  | "interrompida"
  | "pos_registro"
  | "encerrada"
  | "encerrada_pendencias";

export type StepStatus =
  | "nao_iniciada"
  | "em_andamento"
  | "tempo_atingido"
  | "concluida"
  | "interrompida"
  | "nao_realizada";
