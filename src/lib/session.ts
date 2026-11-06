import {
  ALL_CHECKS,
  ALL_STEP_DEFS,
  CHECK_BY_ID,
  CONFIG_LABELS,
  buildSequence,
  defaultConfig,
  type CheckDef,
} from "./protocol";
import { fmtClock, fmtDateTime, fmtDur, toDateInput, uid } from "./time";
import type {
  Attempt,
  CheckState,
  CheckStatus,
  Interruption,
  ProtocolConfig,
  SessionState,
  SessionStatus,
  StageId,
  StepDef,
  StepStatus,
  TimelineEvent,
} from "./types";

export function createSession(now = Date.now()): SessionState {
  return {
    id: uid("sessao"),
    createdAt: now,
    stage: 1,
    fields: { data_coleta: toDateInput(now) },
    checks: {},
    config: defaultConfig(),
    configConfirmedAt: null,
    configChanges: [],
    attempts: [],
    interruptions: [],
    skipped: {},
    stepNotes: {},
    selectedStep: "repouso_inicial",
    events: [],
    flagged: [],
    corrections: [],
    deviations: [],
    preStartClearedAt: null,
    experimentStartedAt: null,
    experimentEndedAt: null,
    experimentEndReason: null,
    outcome: null,
    closedAt: null,
    closedWithPendencies: false,
  };
}

export function hasData(s: SessionState): boolean {
  return (
    s.events.length > 0 ||
    s.attempts.length > 0 ||
    Object.keys(s.checks).length > 0 ||
    s.fields.data_coleta !== toDateInput(s.createdAt) ||
    Object.values(s.stepNotes).some((v) => v.trim() !== "") ||
    s.flagged.length > 0 ||
    s.interruptions.length > 0 ||
    JSON.stringify(s.config) !== JSON.stringify(defaultConfig()) ||
    !!s.preStartClearedAt ||
    !!s.closedAt ||
    !!s.outcome ||
    Object.entries(s.fields).some(([k, v]) => k !== "data_coleta" && v.trim() !== "")
  );
}

/** A pre-start approval is only valid for the preparation that was reviewed. */
export function reconcilePreparation(prev: SessionState, next: SessionState): SessionState {
  if (!prev.preStartClearedAt || prev.experimentStartedAt) return next;
  const reviewed = (s: SessionState) =>
    JSON.stringify({
      config: s.config,
      checks: ALL_CHECKS.filter((d) => d.group.stage <= 4).map((d) => s.checks[d.id]),
      fields: Object.fromEntries(
        Object.entries(s.fields).filter(([key]) => !/^(nota_|arq_|pos_|enc_)/.test(key)),
      ),
    });
  return reviewed(prev) === reviewed(next)
    ? next
    : { ...next, preStartClearedAt: null, configConfirmedAt: null };
}

/* ---------------------------------- checks --------------------------------- */

const EMPTY_CHECK: CheckState = {
  status: "pendente",
  note: "",
  completedAt: null,
  responsible: "",
};

export const getCheck = (s: SessionState, id: string): CheckState => s.checks[id] ?? EMPTY_CHECK;

export function isRequired(s: SessionState, def: CheckDef): boolean {
  if (def.critical) return true;
  const override = s.checks[def.id]?.required;
  return override ?? !!def.required;
}

export function checkProgress(s: SessionState, stage?: StageId) {
  const defs = ALL_CHECKS.filter((c) => stage == null || c.group.stage === stage);
  let done = 0;
  let applicable = 0;
  let requiredPending = 0;
  for (const d of defs) {
    const st = getCheck(s, d.id).status;
    if (st === "na") continue;
    applicable += 1;
    if (st === "concluido") done += 1;
    else if (isRequired(s, d)) requiredPending += 1;
  }
  return { done, applicable, total: defs.length, requiredPending };
}

export function pendingRequired(s: SessionState, stages: StageId[]) {
  return ALL_CHECKS.filter(
    (d) =>
      stages.includes(d.group.stage) && isRequired(s, d) && getCheck(s, d.id).status === "pendente",
  );
}

/* --------------------------------- events ---------------------------------- */

export function addEvent(
  s: SessionState,
  e: Omit<TimelineEvent, "id" | "stepKey" | "attemptId" | "relativeMs" | "description"> &
    Partial<Pick<TimelineEvent, "id" | "stepKey" | "attemptId" | "relativeMs" | "description">>,
): SessionState {
  const active = activeAttempt(s);
  const ev: TimelineEvent = {
    id: e.id ?? uid("ev"),
    at: e.at,
    type: e.type,
    category: e.category,
    label: e.label,
    description: e.description ?? "",
    stepKey: e.stepKey !== undefined ? e.stepKey : (active?.stepKey ?? null),
    attemptId: e.attemptId !== undefined ? e.attemptId : (active?.id ?? null),
    relativeMs:
      e.relativeMs !== undefined ? e.relativeMs : active ? attemptEffective(s, active, e.at) : null,
  };
  return { ...s, events: [...s.events, ev] };
}

export function setCheckStatus(
  s: SessionState,
  id: string,
  status: CheckStatus,
  now: number,
): SessionState {
  const prev = getCheck(s, id);
  if (prev.status === status) return s;
  const def = CHECK_BY_ID[id];
  if (def?.critical && status === "na") return s;
  const next: CheckState = { ...prev, status, completedAt: status === "concluido" ? now : null };
  let out: SessionState = { ...s, checks: { ...s.checks, [id]: next } };
  const labels: Record<CheckStatus, string> = {
    pendente: "pendente",
    concluido: "concluído",
    na: "não se aplica",
  };
  const wasDone = prev.status === "concluido";
  out = addEvent(out, {
    at: now,
    type: "check",
    label: wasDone
      ? `Check alterado de concluído para ${labels[status]}: ${def?.text ?? id}`
      : `Check marcado como ${labels[status]}: ${def?.text ?? id}`,
    description:
      wasDone && prev.completedAt
        ? `Conclusão anterior registrada às ${fmtDateTime(prev.completedAt)}.`
        : "",
    stepKey: null,
    attemptId: null,
    relativeMs: null,
  });
  return out;
}

export function setCheckMeta(
  s: SessionState,
  id: string,
  patch: Partial<CheckState>,
): SessionState {
  return { ...s, checks: { ...s.checks, [id]: { ...getCheck(s, id), ...patch } } };
}

/* --------------------------------- steps ----------------------------------- */

export const sequenceOf = (s: SessionState): StepDef[] => buildSequence(s.config);

export const activeAttempt = (s: SessionState): Attempt | undefined =>
  s.attempts.find((a) => a.endedAt == null);

export const activeInterruption = (s: SessionState): Interruption | undefined =>
  s.interruptions.find((i) => i.end == null);

export const attemptsFor = (s: SessionState, key: string) =>
  s.attempts.filter((a) => a.stepKey === key);

export function attemptPaused(s: SessionState, a: Attempt, now: number): number {
  const end = a.endedAt ?? now;
  return s.interruptions
    .filter((i) => i.attemptId === a.id)
    .reduce((acc, i) => {
      const iEnd = Math.min(i.end ?? end, end);
      return acc + Math.max(0, iEnd - Math.max(i.start, a.startedAt));
    }, 0);
}

/** Effective duration: wall-clock span minus unplanned interruptions. Computed from timestamps, not ticks. */
export function attemptEffective(s: SessionState, a: Attempt, now: number): number {
  const end = Math.min(a.endedAt ?? now, now);
  return Math.max(0, end - a.startedAt - attemptPaused(s, a, end));
}

export function stepDef(s: SessionState, key: string): StepDef | undefined {
  return sequenceOf(s).find((d) => d.key === key) ?? ALL_STEP_DEFS.find((d) => d.key === key);
}

export function referenceAttempt(s: SessionState, key: string): Attempt | undefined {
  const list = attemptsFor(s, key);
  return list.find((a) => a.considered) ?? list[list.length - 1];
}

export function stepStatus(s: SessionState, step: StepDef, now: number): StepStatus {
  if (s.skipped[step.key]) return "nao_realizada";
  const list = attemptsFor(s, step.key);
  const running = list.find((a) => a.endedAt == null);
  if (running) {
    if (activeInterruption(s)?.attemptId === running.id) return "interrompida";
    return attemptEffective(s, running, now) >= step.minutes * 60000
      ? "tempo_atingido"
      : "em_andamento";
  }
  const ref = referenceAttempt(s, step.key);
  if (!ref) return "nao_iniciada";
  return ref.endKind === "interrompida" ? "interrompida" : "concluida";
}

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  tempo_atingido: "Tempo previsto atingido",
  concluida: "Concluída",
  interrompida: "Interrompida",
  nao_realizada: "Não realizada",
};

export function tellApplies(s: SessionState, key: string): boolean {
  return s.config.tellBlocks[key] === "sim";
}

export function sessionStatus(s: SessionState): SessionStatus {
  if (s.closedAt) return s.closedWithPendencies ? "encerrada_pendencias" : "encerrada";
  if (s.experimentEndedAt) return "pos_registro";
  if (activeInterruption(s) || s.experimentEndReason === "interrompida") return "interrompida";
  if (s.experimentStartedAt) return "execucao";
  return "preparacao";
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  preparacao: "Preparação",
  execucao: "Em execução",
  interrompida: "Interrompida",
  pos_registro: "Pós-registro",
  encerrada: "Encerrada",
  encerrada_pendencias: "Encerrada com pendências",
};

export function startAttempt(
  s: SessionState,
  key: string,
  now: number,
  retryReason = "",
  automatic = false,
): SessionState {
  if (
    !s.preStartClearedAt ||
    s.closedAt ||
    s.experimentEndedAt ||
    activeAttempt(s) ||
    activeInterruption(s) ||
    s.skipped[key] ||
    getCheck(s, "part.consentimento").status !== "concluido" ||
    getCheck(s, "part.elegibilidade").status !== "concluido"
  )
    return s;
  const def = stepDef(s, key);
  if (!sequenceOf(s).some((st) => st.key === key)) return s;
  const prev = attemptsFor(s, key);
  const lastEnded = [...s.attempts]
    .filter((a) => a.endedAt)
    .sort((a, b) => b.endedAt! - a.endedAt!)[0];
  const a: Attempt = {
    id: uid("tent"),
    stepKey: key,
    n: prev.length + 1,
    startedAt: now,
    endedAt: null,
    endKind: null,
    earlyReason: "",
    retryReason,
    considered: false,
    automaticStart: automatic,
    automaticEnd: false,
    eyes: def?.kind === "repouso" ? s.config.restEyes : "",
  };
  let out: SessionState = { ...s, attempts: [...s.attempts, a], selectedStep: key };
  if (!out.experimentStartedAt) {
    out = { ...out, experimentStartedAt: now };
    out = addEvent(out, {
      at: now,
      type: "sessao",
      label: "Início da sequência experimental",
      stepKey: key,
      attemptId: a.id,
      relativeMs: 0,
    });
  }
  const gap = lastEnded ? now - lastEnded.endedAt! : null;
  out = addEvent(out, {
    at: now,
    type: "etapa",
    label: `${automatic ? "Início automático" : "Início"}: ${def?.name ?? key}${a.n > 1 ? ` — tentativa ${a.n}` : ""}`,
    description: [
      automatic ? "Horário programado da sequência guiada." : "",
      retryReason ? `Motivo da nova tentativa: ${retryReason}` : "",
      gap != null
        ? `Intervalo desde o término da etapa anterior: ${fmtDur(gap)} (não é pausa prevista).`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    stepKey: key,
    attemptId: a.id,
    relativeMs: 0,
  });
  return out;
}

export function endAttempt(
  s: SessionState,
  id: string,
  at: number,
  earlyReason = "",
  kind: "concluida" | "interrompida" = "concluida",
  automatic = false,
): SessionState {
  const a = s.attempts.find((x) => x.id === id);
  if (!a || a.endedAt) return s;
  const eff = attemptEffective(s, a, at);
  const def = stepDef(s, a.stepKey);
  let out: SessionState = {
    ...s,
    attempts: s.attempts.map((x) =>
      x.id === id ? { ...x, endedAt: at, endKind: kind, earlyReason, automaticEnd: automatic } : x,
    ),
  };
  const planned = (def?.minutes ?? 0) * 60000;
  out = addEvent(out, {
    at,
    type: "etapa",
    label: `${kind === "interrompida" ? "Tentativa interrompida" : "Término"}: ${def?.name ?? a.stepKey}${a.n > 1 ? ` — tentativa ${a.n}` : ""}`,
    description: `${automatic ? "Transição automática do cronograma. " : ""}Duração efetiva ${fmtDur(eff)} de ${fmtDur(planned)} planejados.${earlyReason ? ` Motivo do encerramento antes do previsto: ${earlyReason}` : ""}`,
    stepKey: a.stepKey,
    attemptId: a.id,
    relativeMs: eff,
  });
  return out;
}

export function interrupt(s: SessionState, at: number): SessionState {
  if (s.closedAt || s.experimentEndedAt || activeInterruption(s)) return s;
  const a = activeAttempt(s);
  const i: Interruption = {
    id: uid("int"),
    start: at,
    end: null,
    attemptId: a?.id ?? null,
    stepKey: a?.stepKey ?? null,
    reason: "",
    eegState: "",
    tellState: "",
    outcome: null,
  };
  const out = addEvent(s, {
    at,
    type: "interrupcao",
    label: "Interrupção não prevista registrada",
    description: a
      ? `Durante: ${stepDef(s, a.stepKey)?.name ?? a.stepKey}`
      : "Fora de uma etapa em andamento.",
  });
  return { ...out, interruptions: [...out.interruptions, i] };
}

export function patchInterruption(
  s: SessionState,
  id: string,
  patch: Partial<Interruption>,
): SessionState {
  return {
    ...s,
    interruptions: s.interruptions.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  };
}

export function resolveInterruption(
  s: SessionState,
  outcome: NonNullable<Interruption["outcome"]>,
  now: number,
): SessionState {
  const i = activeInterruption(s);
  if (!i) return s;
  let out = patchInterruption(s, i.id, { end: now, outcome });
  const detail = [
    `Duração da interrupção: ${fmtDur(now - i.start)}.`,
    i.reason ? `Motivo: ${i.reason}.` : "Motivo não informado.",
    i.eegState ? `EEG: ${i.eegState}.` : "",
    i.tellState ? `TELL: ${i.tellState}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const labels = {
    retomada: "Interrupção encerrada — etapa retomada",
    nova_tentativa: "Interrupção encerrada — tarefa será reiniciada como nova tentativa",
    sessao_encerrada: "Interrupção — sessão experimental encerrada",
  };
  out = addEvent(out, {
    at: now,
    type: "interrupcao",
    label: labels[outcome],
    description: detail,
    stepKey: i.stepKey,
    attemptId: i.attemptId,
  });
  if (outcome !== "retomada" && i.attemptId) {
    out = endAttempt(out, i.attemptId, now, "", "interrompida");
  }
  if (outcome === "nova_tentativa" && i.stepKey) {
    out = startAttempt(out, i.stepKey, now, i.reason || "Reinício após interrupção");
  }
  if (outcome === "sessao_encerrada") {
    out = finishExperiment(out, now, "interrompida");
  }
  return out;
}

/** Start the whole guided sequence with one action. */
export function startProtocol(s: SessionState, now: number): SessionState {
  if (s.attempts.length || s.experimentStartedAt) return s;
  return startAttempt(s, sequenceOf(s)[0].key, now);
}

/** Catch up from timestamps, including delayed/background browser ticks. */
export function advanceProtocol(s: SessionState, now: number): SessionState {
  if (s.closedAt || s.experimentEndedAt || activeInterruption(s)) return s;
  if (
    activeAttempt(s) &&
    (getCheck(s, "part.consentimento").status !== "concluido" ||
      getCheck(s, "part.elegibilidade").status !== "concluido")
  ) {
    return interrupt(s, now);
  }
  let out = s;
  const seq = sequenceOf(s);
  for (let count = 0; count < seq.length; count++) {
    const a = activeAttempt(out);
    if (!a) break;
    const step = stepDef(out, a.stepKey);
    if (!step) break;
    const planned = step.minutes * 60000;
    if (attemptEffective(out, a, now) < planned) break;
    const boundary = a.startedAt + planned + attemptPaused(out, a, now);
    out = endAttempt(out, a.id, boundary, "", "concluida", true);
    const index = seq.findIndex((st) => st.key === step.key);
    const next = seq.slice(index + 1).find((st) => !out.skipped[st.key]);
    if (!next) {
      out = finishExperiment(out, boundary, "concluida");
      break;
    }
    out = startAttempt(out, next.key, boundary, "", true);
  }
  if (
    out !== s &&
    activeAttempt(s) &&
    now -
      (activeAttempt(s)!.startedAt +
        (stepDef(s, activeAttempt(s)!.stepKey)?.minutes ?? 0) * 60000 +
        attemptPaused(s, activeAttempt(s)!, now)) >
      2000
  ) {
    out = addEvent(out, {
      at: now,
      type: "sessao",
      label: "Cronograma atualizado após atraso do navegador",
      description:
        "Os horários das transições automáticas seguem o cronograma. A equipe deve conferir a execução dos períodos durante a ausência da página.",
    });
  }
  return out;
}

export function finishExperiment(
  s: SessionState,
  now: number,
  reason: "concluida" | "interrompida",
): SessionState {
  if (s.experimentEndedAt) return s;
  let out = s;
  const interruption = activeInterruption(out);
  if (interruption) {
    out = patchInterruption(out, interruption.id, { end: now, outcome: "sessao_encerrada" });
    out = addEvent(out, {
      at: now,
      type: "interrupcao",
      label: "Interrupção encerrada com a sequência experimental",
      description: interruption.reason || "Motivo não informado.",
      stepKey: interruption.stepKey,
      attemptId: interruption.attemptId,
    });
  }
  const a = activeAttempt(out);
  if (a || interruption) reason = "interrompida";
  if (a)
    out = endAttempt(
      out,
      a.id,
      now,
      "Sequência experimental encerrada pelo pesquisador.",
      "interrompida",
    );
  out = { ...out, experimentEndedAt: now, experimentEndReason: reason };
  return addEvent(out, {
    at: now,
    type: "sessao",
    label:
      reason === "interrompida"
        ? "Sequência experimental encerrada por interrupção"
        : "Término da sequência experimental registrado",
    stepKey: null,
    attemptId: null,
    relativeMs: null,
  });
}

export function patchAttempt(s: SessionState, id: string, patch: Partial<Attempt>): SessionState {
  return { ...s, attempts: s.attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

/** Validate corrected times against the attempt and neighbouring records. */
export function attemptTimeError(
  s: SessionState,
  a: Attempt,
  field: "startedAt" | "endedAt",
  value: number,
): string | null {
  if (!Number.isFinite(value)) return "Informe uma data e um horário válidos.";
  const start = field === "startedAt" ? value : a.startedAt;
  const end = field === "endedAt" ? value : a.endedAt;
  if (end != null && end < start) return "O término não pode ser anterior ao início.";
  if (
    s.attempts.some(
      (other) =>
        other.id !== a.id &&
        start < (other.endedAt ?? Infinity) &&
        (end ?? Infinity) > other.startedAt,
    )
  )
    return "O horário cria sobreposição com outra tentativa. Confira os registros.";
  if (
    s.interruptions.some(
      (i) =>
        i.attemptId === a.id && (i.start < start || (end != null && (i.end ?? Infinity) > end)),
    )
  )
    return "A tentativa precisa abranger as interrupções vinculadas a ela.";
  return null;
}

export function setConsidered(s: SessionState, id: string, now: number): SessionState {
  const a = s.attempts.find((x) => x.id === id);
  if (!a) return s;
  const out = {
    ...s,
    attempts: s.attempts.map((x) =>
      x.stepKey === a.stepKey ? { ...x, considered: x.id === id } : x,
    ),
  };
  return addEvent(out, {
    at: now,
    type: "etapa",
    label: `Tentativa ${a.n} indicada como considerada pela equipe: ${stepDef(s, a.stepKey)?.name ?? a.stepKey}`,
    stepKey: a.stepKey,
    attemptId: a.id,
    relativeMs: null,
  });
}

export function skipStep(s: SessionState, key: string, reason: string, now: number): SessionState {
  if (s.closedAt || s.experimentEndedAt || activeAttempt(s)?.stepKey === key || !reason.trim())
    return s;
  const out = { ...s, skipped: { ...s.skipped, [key]: { at: now, reason } } };
  return addEvent(out, {
    at: now,
    type: "etapa",
    label: `Etapa marcada como não realizada: ${stepDef(s, key)?.name ?? key}`,
    description: `Motivo: ${reason}`,
    stepKey: key,
    attemptId: null,
    relativeMs: null,
  });
}

export function unskipStep(s: SessionState, key: string, now: number): SessionState {
  const { [key]: _removed, ...rest } = s.skipped;
  const out = { ...s, skipped: rest };
  return addEvent(out, {
    at: now,
    type: "etapa",
    label: `Marcação "não realizada" desfeita: ${stepDef(s, key)?.name ?? key}`,
    stepKey: key,
    attemptId: null,
    relativeMs: null,
  });
}

/* ------------------------------ time records ------------------------------- */

export function correctTime(
  s: SessionState,
  target: string,
  original: number | null,
  corrected: number,
  justification: string,
  now: number,
): SessionState {
  const out = {
    ...s,
    corrections: [
      ...s.corrections,
      { id: uid("cor"), at: now, target, original, corrected, justification },
    ],
  };
  return addEvent(out, {
    at: now,
    type: "correcao",
    label: `Correção de horário: ${target}`,
    description: `Original: ${fmtDateTime(original)} → corrigido: ${fmtDateTime(corrected)}. Justificativa: ${justification}`,
    stepKey: null,
    attemptId: null,
    relativeMs: null,
  });
}

/* --------------------------------- config ---------------------------------- */

function configValueText(key: string, v: unknown): string {
  if (typeof v === "boolean") return v ? "ativado" : "desativado";
  if (key === "tellBlocks" && v && typeof v === "object")
    return Object.entries(v as Record<string, string>)
      .map(([k, x]) => `${k}: ${x}`)
      .join(", ");
  return String(v ?? "") || "(vazio)";
}

export function diffConfig(a: ProtocolConfig, b: ProtocolConfig) {
  return (Object.keys(b) as (keyof ProtocolConfig)[])
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => ({
      key: k,
      label: CONFIG_LABELS[k] ?? k,
      from: configValueText(k, a[k]),
      to: configValueText(k, b[k]),
    }));
}

export function applyConfigChange(
  s: SessionState,
  next: ProtocolConfig,
  justification: string,
  now: number,
): SessionState {
  const changes = diffConfig(s.config, next);
  if (!changes.length) return s;
  const out = {
    ...s,
    config: next,
    configChanges: [...s.configChanges, { id: uid("cfg"), at: now, changes, justification }],
  };
  return addEvent(out, {
    at: now,
    type: "config",
    label: "Configuração alterada após o início",
    description: `${changes.map((c) => `${c.label}: "${c.from}" → "${c.to}"`).join("; ")}. Justificativa: ${justification}`,
    stepKey: null,
    attemptId: null,
    relativeMs: null,
  });
}

export const describeTime = (ms: number | null) => (ms ? fmtClock(ms) : "—");
