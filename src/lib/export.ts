import {
  ALL_CHECKS,
  CONDITION_LABEL,
  EEG_PAUSE_LABEL,
  SPEECH_STEPS,
  STEP_COLORS,
} from "./protocol";
import {
  STEP_STATUS_LABEL,
  attemptEffective,
  attemptPaused,
  attemptsFor,
  getCheck,
  isRequired,
  referenceAttempt,
  sequenceOf,
  sessionStatus,
  SESSION_STATUS_LABEL,
  stepDef,
  stepStatus,
} from "./session";
import { fmtDateTime, fmtDur, isoLocal, timeZoneName, utcOffset } from "./time";
import type { Outcome, SessionState } from "./types";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  concluida: "Concluída",
  concluida_desvios: "Concluída com desvios",
  interrompida: "Interrompida",
};
const f = (s: SessionState, k: string) => (s.fields[k] ?? "").trim();
const CLIN_STATE: Record<string, string> = {
  registrado: "Registrado",
  nao_avaliado: "Não avaliado",
  nao_se_aplica: "Não se aplica",
  ON: "ON",
  OFF: "OFF",
  outro: "Outro",
};
const eyesLabel = (value: string) =>
  ({ abertos: "Abertos", fechados: "Fechados", variavel: "Variável" })[value] ?? "Não informado";
function clin(s: SessionState, k: string) {
  const state = s.fields[`${k}__estado`] ?? "";
  return { estado: CLIN_STATE[state] ?? (state || "Sem informação"), descricao: f(s, k) };
}
export function suggestOutcome(s: SessionState, now: number): Outcome {
  if (
    s.experimentEndReason === "interrompida" ||
    sequenceOf(s).some((step) => !["concluida", "nao_realizada"].includes(stepStatus(s, step, now)))
  )
    return "interrompida";
  return s.deviations.length ||
    s.configChanges.length ||
    s.corrections.length ||
    s.interruptions.length ||
    Object.keys(s.skipped).length ||
    s.attempts.some((a) => a.n > 1 || a.earlyReason || a.endKind === "interrompida")
    ? "concluida_desvios"
    : "concluida";
}
export function buildSummary(s: SessionState, now: number) {
  const seq = sequenceOf(s);
  const tri = (v?: string) => (v === "sim" ? "Sim" : v === "nao" ? "Não" : "Não definido");
  const checks = ALL_CHECKS.map((d) => {
    const c = getCheck(s, d.id);
    return {
      grupo: d.group.title,
      etapa: d.group.stage,
      item: d.text,
      tipo: d.critical ? "Crítico" : isRequired(s, d) ? "Obrigatório" : "Complementar",
      estado:
        c.status === "concluido" ? "Concluído" : c.status === "na" ? "Não se aplica" : "Pendente",
      concluidoEm: isoLocal(c.completedAt),
      responsavel: c.responsible,
      observacao: c.note,
    };
  });
  const pending = checks.filter((c) => c.estado === "Pendente" && c.tipo !== "Complementar");
  const steps = seq.map((step, index) => ({
    ordem: index + 1,
    chave: step.key,
    nome: step.name,
    condicao: CONDITION_LABEL[step.condition],
    cor: STEP_COLORS[step.color].label,
    duracaoPlanejada: fmtDur(step.minutes * 60000),
    estado: STEP_STATUS_LABEL[stepStatus(s, step, now)],
    observacao: s.stepNotes[step.key] ?? "",
    tellAplicavel: s.config.tellBlocks[step.key] === "sim",
    tentativas: attemptsFor(s, step.key).map((a) => ({
      numero: a.n,
      inicio: isoLocal(a.startedAt),
      termino: isoLocal(a.endedAt),
      duracaoEfetiva: fmtDur(attemptEffective(s, a, now)),
      duracaoEfetivaMs: attemptEffective(s, a, now),
      tempoInterrupcao: fmtDur(attemptPaused(s, a, now)),
      resultado:
        a.endedAt == null
          ? "Em andamento"
          : a.endKind === "interrompida"
            ? "Interrompida"
            : "Concluída",
      inicioAutomatico: a.automaticStart,
      terminoAutomatico: a.automaticEnd,
      olhosNoRepouso: step.kind === "repouso" ? eyesLabel(a.eyes) : null,
      motivoEncerramento: a.earlyReason,
      motivoNovaTentativa: a.retryReason,
      consideradaPelaEquipe: a.considered,
    })),
  }));
  const review = pending.map((c) => `Check pendente (${c.grupo}): ${c.item}`);
  if (!f(s, "codigo_participante")) review.push("Código do participante não informado");
  if (!f(s, "codigo_sessao")) review.push("Código da sessão não informado");
  if (!s.configConfirmedAt) review.push("Conferência antes do início não registrada");
  if (!s.experimentStartedAt) review.push("Sequência experimental não iniciada");
  else if (!s.experimentEndedAt) review.push("Término da sequência experimental não registrado");
  steps
    .filter((st) => st.estado !== "Concluída")
    .forEach((st) => review.push(`Período ${st.ordem} (${st.nome}): ${st.estado}`));
  steps
    .filter((st) => st.tentativas.length > 1 && !st.tentativas.some((a) => a.consideradaPelaEquipe))
    .forEach((st) =>
      review.push(`Período ${st.ordem}: indicar a tentativa considerada pela equipe`),
    );
  s.interruptions
    .filter((i) => !i.reason.trim())
    .forEach((i) => review.push(`Interrupção às ${fmtDateTime(i.start)} sem motivo registrado`));
  s.flagged
    .filter((flag) => flag.end == null)
    .forEach((flag) =>
      review.push(`Intervalo sinalizado às ${fmtDateTime(flag.start)} sem fim marcado`),
    );
  s.events
    .filter(
      (e) => e.type === "relogio" || e.label === "Cronograma atualizado após atraso do navegador",
    )
    .forEach((e) => review.push(`${e.label} (${fmtDateTime(e.at)})`));
  if (s.outcome === "concluida" && suggestOutcome(s, now) !== "concluida")
    review.push("Resultado declarado sem desvios diverge dos registros; conferir");
  const effective = seq.reduce((sum, step) => {
    const a = referenceAttempt(s, step.key);
    return sum + (a ? attemptEffective(s, a, now) : 0);
  }, 0);
  return {
    meta: {
      versaoFormato: 2,
      idSessao: s.id,
      documento: "Resumo operacional da sessão EEG e TELL",
      geradoEm: isoLocal(now),
      fusoHorario: timeZoneName(),
      deslocamentoUTC: utcOffset(now),
      estadoDaSessao: SESSION_STATUS_LABEL[sessionStatus(s)],
      aviso:
        "Horários da sequência guiada no website. Transições automáticas seguem o cronograma e não comprovam ações nos equipamentos de EEG e TELL.",
    },
    identificacao: {
      codigoParticipante: f(s, "codigo_participante"),
      codigoSessao: f(s, "codigo_sessao"),
      dataColeta: f(s, "data_coleta"),
      local: f(s, "local"),
      versaoProtocolo: f(s, "versao_protocolo"),
      observacoesIniciais: f(s, "obs_iniciais"),
    },
    responsaveis: {
      pesquisador: f(s, "pesquisador"),
      operadorEEG: f(s, "operador_eeg"),
      operadorTELL: f(s, "operador_tell"),
    },
    configuracao: {
      confirmadaEm: isoLocal(s.configConfirmedAt),
      tarefaSecundaria: {
        nome: s.config.secondaryName,
        instrucoes: s.config.secondaryInstructions,
        materiais: s.config.secondaryMaterials,
        medida: s.config.secondaryMeasure,
        observacoes: s.config.secondaryNotes,
      },
      eegNasPausas: EEG_PAUSE_LABEL[s.config.eegPauses],
      eegNasPausasDescricao: s.config.eegPausesDescription,
      tellPorBloco: Object.fromEntries(
        SPEECH_STEPS.map((st) => [st.name, tri(s.config.tellBlocks[st.key])]),
      ),
      olhosNoRepouso: eyesLabel(s.config.restEyes),
      posturaRepouso: s.config.restOrientation,
      alertaSonoro: s.config.soundAlert,
      vibracao: s.config.vibrationAlert,
      alteracoesAposInicio: s.configChanges.map((c) => ({
        em: isoLocal(c.at),
        alteracoes: c.changes,
        justificativa: c.justification,
      })),
    },
    medicacaoECondicoes: {
      medicacoesRelevantes: clin(s, "med_relevantes"),
      ultimaTomada: clin(s, "med_ultima"),
      estadoMedicamentoso: clin(s, "med_estado"),
      sonoESonolencia: clin(s, "cond_sono"),
      fadigaDesconfortoDor: clin(s, "cond_fadiga"),
      manifestacoesMotoras: clin(s, "cond_motor"),
      falaAudicaoCompreensao: clin(s, "cond_fala"),
      outras: f(s, "cond_outras"),
    },
    preparacao: {
      eeg: {
        sistema: f(s, "eeg_sistema"),
        toucaEletrodos: f(s, "eeg_touca"),
        montagem: f(s, "eeg_montagem"),
        canais: f(s, "eeg_canais"),
        frequenciaAmostragem: f(s, "eeg_fs"),
        filtros: f(s, "eeg_filtros"),
        limitesAceitacao: f(s, "eeg_limites"),
        canaisProblematicos: f(s, "eeg_problemas"),
        ruidoArtefatos: f(s, "eeg_ruido"),
        arquivoPlanejado: f(s, "eeg_arquivo"),
        pastaDestino: f(s, "eeg_pasta"),
        metodoAnotacaoEventos: f(s, "eeg_metodo_eventos"),
        descricaoMetodo: f(s, "eeg_metodo_eventos_desc"),
      },
      tell: { dispositivo: f(s, "tell_dispositivo"), localRegistros: f(s, "tell_local") },
    },
    tempos: {
      sessaoAbertaEm: isoLocal(s.createdAt),
      sessaoEncerradaEm: isoLocal(s.closedAt),
      tempoTotalDeTrabalho: fmtDur((s.closedAt ?? now) - s.createdAt),
      inicioSequenciaExperimental: isoLocal(s.experimentStartedAt),
      terminoSequenciaExperimental: isoLocal(s.experimentEndedAt),
      duracaoSequenciaExperimental: s.experimentStartedAt
        ? fmtDur((s.experimentEndedAt ?? now) - s.experimentStartedAt)
        : null,
      duracaoPlanejadaSequencia: fmtDur(seq.reduce((sum, step) => sum + step.minutes * 60000, 0)),
      somaDuracoesEfetivasDasEtapas: fmtDur(effective),
      tempoTotalDeInterrupcao: fmtDur(
        s.interruptions.reduce((sum, i) => sum + (i.end ?? now) - i.start, 0),
      ),
    },
    etapas: steps,
    interrupcoes: s.interruptions.map((i) => ({
      inicio: isoLocal(i.start),
      termino: isoLocal(i.end),
      duracao: fmtDur((i.end ?? now) - i.start),
      etapa: i.stepKey ? stepDef(s, i.stepKey)?.name : null,
      motivo: i.reason,
      estadoEEG: i.eegState,
      estadoTELL: i.tellState,
      desfecho: i.outcome,
    })),
    checks,
    checksPendentes: pending,
    desvios: s.deviations.map((d) => ({
      em: isoLocal(d.at),
      pendencias: d.items,
      justificativa: d.justification,
    })),
    anotacoes: {
      geral: f(s, "nota_geral"),
      porEtapa: Object.fromEntries(
        Object.entries(s.stepNotes)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => [key, value]),
      ),
    },
    intervalosSinalizados: s.flagged.map((flag) => ({
      inicio: isoLocal(flag.start),
      termino: isoLocal(flag.end),
      etapa: flag.stepKey ? stepDef(s, flag.stepKey)?.name : null,
      nota: flag.note,
    })),
    eventos: s.events.map((e) => ({
      horario: isoLocal(e.at),
      tipo: e.type,
      categoria: e.category ?? null,
      evento: e.label,
      descricao: e.description,
      etapa: e.stepKey ? stepDef(s, e.stepKey)?.name : null,
      tentativa: e.attemptId ? s.attempts.find((a) => a.id === e.attemptId)?.n : null,
      tempoRelativoNaTarefa: e.relativeMs != null ? fmtDur(e.relativeMs) : null,
    })),
    correcoesDeHorario: s.corrections.map((c) => ({
      em: isoLocal(c.at),
      alvo: c.target,
      valorOriginal: isoLocal(c.original),
      valorCorrigido: isoLocal(c.corrected),
      justificativa: c.justification,
    })),
    arquivos: {
      eeg: f(s, "arq_eeg"),
      tell: f(s, "arq_tell"),
      copiaSeguranca: f(s, "arq_backup"),
      outros: f(s, "arq_outros"),
    },
    posColeta: {
      estadoFinalEEGTELL: f(s, "enc_estado_final"),
      providencias: f(s, "pos_providencias"),
    },
    resultadoOperacional: s.outcome ? OUTCOME_LABEL[s.outcome] : "Não definido",
    pendenciasParaRevisao: review,
  };
}
export type Summary = ReturnType<typeof buildSummary>;
export function exportFileBase(s: SessionState): string {
  const clean = (v: string) =>
    v
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  return `${clean(f(s, "codigo_participante")) || "participante-sem-codigo"}_${clean(f(s, "codigo_sessao")) || "sessao-sem-codigo"}_${clean(f(s, "data_coleta")) || "sem-data"}`;
}
export function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function exportJSON(s: SessionState) {
  downloadFile(
    `${exportFileBase(s)}.json`,
    JSON.stringify(buildSummary(s, Date.now()), null, 2),
    "application/json",
  );
}
const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const label = (key: string) =>
  key.replace(/([a-zà-ú])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
function renderValue(value: unknown): string {
  if (value == null || value === "") return '<span class="muted">Não informado</span>';
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value))
    return value.length
      ? `<ol>${value.map((item) => `<li>${renderValue(item)}</li>`).join("")}</ol>`
      : '<span class="muted">Nenhum registro</span>';
  if (typeof value === "object")
    return `<table>${Object.entries(value)
      .map(([key, item]) => `<tr><th>${esc(label(key))}</th><td>${renderValue(item)}</td></tr>`)
      .join("")}</table>`;
  return esc(value);
}
export function summaryHTML(s: SessionState): string {
  const m = buildSummary(s, Date.now());
  const sections: [string, unknown][] = [
    ["Identificação", m.identificacao],
    ["Responsáveis", m.responsaveis],
    ["Configuração", m.configuracao],
    ["Medicação e condições", m.medicacaoECondicoes],
    ["Preparação", m.preparacao],
    ["Horários e durações", m.tempos],
    ["Períodos e tentativas", m.etapas],
    ["Interrupções", m.interrupcoes],
    ["Checklist", m.checks],
    ["Desvios", m.desvios],
    ["Anotações", m.anotacoes],
    ["Intervalos sinalizados", m.intervalosSinalizados],
    ["Linha do tempo", m.eventos],
    ["Correções de horário", m.correcoesDeHorario],
    ["Arquivos", m.arquivos],
    ["Pós-coleta", m.posColeta],
    ["Pendências", m.pendenciasParaRevisao],
  ];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(exportFileBase(s))}</title><style>
body{font:13px/1.45 system-ui,sans-serif;color:#111;margin:28px;overflow-wrap:anywhere}h1{font-size:22px}h2{font-size:17px;margin-top:28px;break-after:avoid}table{width:100%;border-collapse:collapse;margin:6px 0}th,td{border:1px solid #ddd;text-align:left;vertical-align:top;padding:7px;white-space:pre-wrap}th{width:30%;background:#f6f6f6;font-weight:500}li{margin-bottom:10px}.muted{color:#777}@media print{body{margin:10mm}table{font-size:11px}}</style></head><body><h1>Resumo da sessão EEG e TELL</h1><p>${esc(m.meta.aviso)}</p><p>Gerado em ${esc(m.meta.geradoEm)} · Fuso ${esc(m.meta.fusoHorario)} · ${esc(m.meta.estadoDaSessao)} · Resultado: ${esc(m.resultadoOperacional)}</p>${sections.map(([title, value]) => `<section><h2>${esc(title)}</h2>${renderValue(value)}</section>`).join("")}</body></html>`;
}
export function exportHTML(s: SessionState) {
  downloadFile(`${exportFileBase(s)}.html`, summaryHTML(s), "text/html");
}
export function printSummary(s: SessionState) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  if (!frame.contentWindow) {
    frame.remove();
    throw new Error("Impressão indisponível neste navegador");
  }
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(summaryHTML(s));
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 150);
}
