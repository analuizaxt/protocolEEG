import test from "node:test";
import assert from "node:assert/strict";
import { ALL_CHECKS, buildSequence, defaultConfig } from "../src/lib/protocol";
import {
  activeAttempt,
  activeInterruption,
  advanceProtocol,
  attemptEffective,
  attemptTimeError,
  createSession,
  endAttempt,
  finishExperiment,
  hasData,
  interrupt,
  reconcilePreparation,
  resolveInterruption,
  sessionStatus,
  setCheckStatus,
  startAttempt,
  startProtocol,
} from "../src/lib/session";
import { buildSummary, exportFileBase, summaryHTML, suggestOutcome } from "../src/lib/export";
import { isoLocal } from "../src/lib/time";
const at = new Date(2026, 10, 5, 23, 59, 50).getTime();
const minute = 60000;
function ready() {
  let s = createSession(at);
  s = setCheckStatus(s, "part.consentimento", "concluido", at);
  s = setCheckStatus(s, "part.elegibilidade", "concluido", at);
  return { ...s, preStartClearedAt: at, configConfirmedAt: at };
}
test("sequência fixa de 14 minutos sem decisão sobre repouso adicional", () => {
  const seq = buildSequence(defaultConfig());
  assert.equal(seq.length, 10);
  assert.equal(seq.filter((step) => step.kind === "repouso").length, 1);
  assert.equal(
    seq.reduce((sum, step) => sum + step.minutes, 0),
    14,
  );
  assert.equal("extraRest" in defaultConfig(), false);
});
test("checks retirados não integram a contagem nem as pendências", () => {
  for (const id of [
    "rand.conferida",
    "amb.condicoes",
    "amb.armazenamento",
    "tempo.eeg",
    "rev.qualidade",
  ]) {
    assert.equal(
      ALL_CHECKS.some((check) => check.id === id),
      false,
    );
    assert.equal(
      buildSummary(createSession(at), at).checks.some((check) => check.item === id),
      false,
    );
  }
});
test("sessão vazia, sem demonstração ou cegamento", () => {
  const s = createSession(at);
  assert.equal(hasData(s), false);
  assert.equal(hasData({ ...s, stage: 4 }), false);
  assert.equal("demo" in s, false);
  assert.equal("blinded" in s, false);
});
test("configuração e anotações protegem contra limpeza sem confirmação", () => {
  const s = createSession(at);
  assert.equal(hasData({ ...s, config: { ...s.config, restEyes: "variavel" } }), true);
  assert.equal(hasData({ ...s, stepNotes: { repouso_inicial: "Nota" } }), true);
  assert.equal(hasData({ ...s, fields: { data_coleta: "2026-11-06" } }), true);
});
test("mudança na preparação exige nova liberação", () => {
  const s = ready();
  const next = { ...s, fields: { ...s.fields, codigo_participante: "P-02" } };
  assert.equal(reconcilePreparation(s, next).preStartClearedAt, null);
  assert.equal(reconcilePreparation(s, { ...s, stage: 5 }).preStartClearedAt, at);
  assert.equal(
    reconcilePreparation(s, { ...s, fields: { ...s.fields, nota_geral: "Nota" } })
      .preStartClearedAt,
    at,
  );
});
test("consentimento e elegibilidade não são contornados", () => {
  for (const id of ["part.consentimento", "part.elegibilidade"]) {
    const s = setCheckStatus(ready(), id, "pendente", at + 1);
    assert.equal(startProtocol(s, at + 2).attempts.length, 0);
    assert.equal(setCheckStatus(s, id, "na", at + 3), s);
  }
  assert.equal(startProtocol(createSession(at), at).attempts.length, 0);
});
test("um início abre o primeiro período, sem duplicação por clique repetido", () => {
  const s = startProtocol(ready(), at);
  assert.equal(s.attempts.length, 1);
  assert.equal(s.attempts[0].stepKey, "repouso_inicial");
  assert.equal(startProtocol(s, at + 1), s);
  assert.equal(advanceProtocol(s, at + 59999), s);
});
test("aos 60 segundos passa automaticamente do repouso para a pausa", () => {
  const s = advanceProtocol(startProtocol(ready(), at), at + minute);
  assert.equal(s.attempts.length, 2);
  assert.equal(s.attempts[0].endedAt, at + minute);
  assert.equal(s.attempts[0].automaticEnd, true);
  assert.equal(activeAttempt(s)!.stepKey, "pausa_1");
  assert.equal(activeAttempt(s)!.startedAt, at + minute);
  assert.equal(activeAttempt(s)!.automaticStart, true);
  assert.equal("eeg" in s.attempts[0], false);
  assert.equal("tell" in s.attempts[0], false);
});
test("ao completar 14 minutos todos os períodos e o fim são registrados", () => {
  const s = advanceProtocol(startProtocol(ready(), at), at + 14 * minute);
  assert.equal(s.attempts.length, 10);
  assert.equal(activeAttempt(s), undefined);
  assert.equal(s.experimentEndedAt, at + 14 * minute);
  assert.equal(s.experimentEndReason, "concluida");
  assert.equal(sessionStatus(s), "pos_registro");
  assert.equal(suggestOutcome(s, at + 14 * minute), "concluida");
  assert.equal(buildSummary(s, at + 14 * minute).tempos.somaDuracoesEfetivasDasEtapas, "14:00");
});
test("retorno de segundo plano usa horários programados e identifica o atraso", () => {
  const s = advanceProtocol(startProtocol(ready(), at), at + 5 * minute + 10000);
  assert.equal(activeAttempt(s)!.stepKey, "fluencia_simples");
  assert.equal(activeAttempt(s)!.startedAt, at + 5 * minute);
  assert.equal(attemptEffective(s, activeAttempt(s)!, at + 5 * minute + 10000), 10000);
  assert.ok(s.events.some((event) => event.label.includes("atraso do navegador")));
  assert.match(isoLocal(s.attempts[1].startedAt)!, /2026-11-06T/);
});
test("interrupção congela a sequência, que retoma somente após o comando", () => {
  let s = startProtocol(ready(), at);
  s = interrupt(s, at + 20000);
  assert.equal(advanceProtocol(s, at + 10 * minute), s);
  s = resolveInterruption(s, "retomada", at + 10 * minute);
  s = advanceProtocol(s, at + 10 * minute + 39999);
  assert.equal(activeAttempt(s)!.stepKey, "repouso_inicial");
  s = advanceProtocol(s, at + 10 * minute + 40000);
  assert.equal(activeAttempt(s)!.stepKey, "pausa_1");
});
test("reinício após interrupção cria nova tentativa imediatamente", () => {
  let s = interrupt(startProtocol(ready(), at), at + 10000);
  s = { ...s, interruptions: s.interruptions.map((i) => ({ ...i, reason: "Problema técnico" })) };
  s = resolveInterruption(s, "nova_tentativa", at + 30000);
  assert.equal(s.attempts.length, 2);
  assert.equal(s.attempts[0].endKind, "interrompida");
  assert.equal(activeAttempt(s)!.retryReason, "Problema técnico");
  assert.equal(activeAttempt(s)!.startedAt, at + 30000);
  s = advanceProtocol(s, at + 90000);
  assert.equal(activeAttempt(s)!.stepKey, "pausa_1");
});
test("encerramento antecipado mantém períodos restantes incompletos", () => {
  let s = startProtocol(ready(), at);
  s = finishExperiment(s, at + 10000, "interrompida");
  assert.equal(activeAttempt(s), undefined);
  assert.equal(s.attempts.length, 1);
  assert.equal(advanceProtocol(s, at + 20 * minute), s);
  assert.equal(suggestOutcome(s, at + 10000), "interrompida");
});
test("encerramento fecha a interrupção e impede crescimento posterior das durações", () => {
  let s = interrupt(startProtocol(ready(), at), at + 10000);
  s = finishExperiment(s, at + 30000, "interrompida");
  assert.equal(activeInterruption(s), undefined);
  assert.equal(buildSummary(s, at + 90000).tempos.tempoTotalDeInterrupcao, "00:20");
});
test("sessão fechada não inicia nem continua o protocolo", () => {
  const s = { ...ready(), closedAt: at + 1 };
  assert.equal(startProtocol(s, at + 2), s);
  assert.equal(interrupt(s, at + 2), s);
});
test("retirada de consentimento durante execução interrompe o avanço", () => {
  const s = setCheckStatus(startProtocol(ready(), at), "part.consentimento", "pendente", at + 1000);
  assert.ok(activeInterruption(advanceProtocol(s, at + 2000)));
});
test("correções impedem duração negativa e sobreposição", () => {
  let s = startProtocol(ready(), at);
  s = endAttempt(s, s.attempts[0].id, at + minute);
  s = startAttempt(s, "pausa_1", at + minute + 1000);
  assert.ok(attemptTimeError(s, s.attempts[0], "endedAt", at - 1));
  assert.ok(attemptTimeError(s, s.attempts[1], "startedAt", at + 59000));
  assert.equal(attemptTimeError(s, s.attempts[0], "endedAt", at + 60500), null);
});
test("olhos têm estado explícito e são exportados por repouso", () => {
  const initial = { ...ready(), config: { ...ready().config, restEyes: "variavel" as const } };
  const s = startProtocol(initial, at);
  assert.equal(s.attempts[0].eyes, "variavel");
  assert.equal(buildSummary(s, at).etapas[0].tentativas[0].olhosNoRepouso, "Variável");
});
test("resumo não inclui campos retirados, mas inclui o método dos eventos no EEG", () => {
  const s = ready();
  s.fields.eeg_metodo_eventos = "marcador";
  const summary = buildSummary(s, at);
  assert.equal("randomizacao" in summary, false);
  assert.equal("visita" in summary.identificacao, false);
  assert.equal("modoDemonstracao" in summary.meta, false);
  assert.equal("revisao" in summary, false);
  assert.equal(summary.preparacao.eeg.metodoAnotacaoEventos, "marcador");
  assert.equal("horariosManuais" in summary.tempos, false);
});
test("HTML escapa todo texto informado, sem duplicar escape", () => {
  const s = createSession(at);
  s.fields.obs_iniciais = '<img src=x onerror="alert(1)">';
  s.fields.med_relevantes__estado = "registrado";
  s.fields.med_relevantes = "A & B";
  const html = summaryHTML(s);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x"));
  assert.ok(html.includes("A &amp; B"));
  assert.ok(!html.includes("A &amp;amp; B"));
});
test("arquivo exportado usa códigos e data", () => {
  const s = createSession(at);
  s.fields.codigo_participante = "P-01";
  s.fields.codigo_sessao = "S01";
  assert.match(exportFileBase(s), /^P-01_S01_2026-11-05$/);
});
