import { useEffect, useState } from "react";
import { CirclePause, Maximize2, Minimize2, Play, Square, Zap } from "lucide-react";
import logo from "@/assets/logo-lateral.png";
import { FlagButton, InterruptionPanel, QuickEvents, useInterruptNow } from "@/components/exec";
import { ColorDot } from "@/components/SequenceList";
import { CorrectionModal } from "@/components/TimeCorrection";
import {
  Badge,
  Button,
  Card,
  Modal,
  Notice,
  Segmented,
  StageHeader,
  TextInput,
  cx,
} from "@/components/ui";
import { useNow } from "@/lib/clock";
import { CONDITION_LABEL, EEG_PAUSE_LABEL, STEP_COLORS } from "@/lib/protocol";
import {
  activeAttempt,
  activeInterruption,
  addEvent,
  attemptEffective,
  attemptPaused,
  attemptTimeError,
  attemptsFor,
  correctTime,
  finishExperiment,
  patchAttempt,
  referenceAttempt,
  sequenceOf,
  setConsidered,
  startProtocol,
  stepDef,
  stepStatus,
  STEP_STATUS_LABEL,
} from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtClock, fmtClockRef, fmtDur } from "@/lib/time";
import type { Attempt, SessionState, StepDef } from "@/lib/types";

function Instruction({ step, s }: { step: StepDef; s: SessionState }) {
  if (step.kind === "repouso")
    return (
      <div className="grid gap-2">
        <p>Repouso, sem atividade ou estímulos.</p>
        {s.config.restOrientation && (
          <p className="text-[14px] opacity-70">{s.config.restOrientation}</p>
        )}
      </div>
    );
  if (step.kind === "pausa")
    return (
      <div className="grid gap-2">
        <p>Pausa prevista{step.detail ? ` — ${step.detail.toLowerCase()}` : ""}.</p>
        <p className="text-[14px] opacity-70">
          EEG: {EEG_PAUSE_LABEL[s.config.eegPauses]}
          {s.config.eegPausesDescription ? ` — ${s.config.eegPausesDescription}` : ""}.
        </p>
      </div>
    );
  return (
    <div className="grid gap-3">
      <p>{step.speech}</p>
      {step.condition === "dupla" && (
        <div className="rounded-[18px] border border-current/15 p-4">
          <p className="mb-1 text-[13px] opacity-70">
            Simultaneamente: {s.config.secondaryName || "tarefa secundária"}
          </p>
          <p>{s.config.secondaryInstructions || "Siga as instruções da equipe."}</p>
        </div>
      )}
    </div>
  );
}

export function Stage5({ goStage }: { goStage: (n: 4 | 6) => void }) {
  const { s, update } = useSession();
  const now = useNow();
  const interruptNow = useInterruptNow();
  const seq = sequenceOf(s);
  const running = activeAttempt(s);
  const intr = activeInterruption(s);
  const step = seq.find((st) => st.key === s.selectedStep) ?? seq[0];
  const index = seq.indexOf(step);
  const shown =
    (running?.stepKey === step.key ? running : undefined) ?? referenceAttempt(s, step.key);
  const isRunningHere = !!running && running.stepKey === step.key;
  const duration = shown ? attemptEffective(s, shown, now) : 0;
  const planned = step.minutes * 60000;
  const remaining = Math.max(0, planned - duration);
  const attempts = attemptsFor(s, step.key);
  const [focus, setFocus] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [correct, setCorrect] = useState<{ a: Attempt; field: "startedAt" | "endedAt" } | null>(
    null,
  );
  const ended = !!s.experimentEndedAt;
  const cleared =
    !!s.preStartClearedAt &&
    !s.closedAt &&
    s.checks["part.consentimento"]?.status === "concluido" &&
    s.checks["part.elegibilidade"]?.status === "concluido";

  useEffect(() => {
    if (!focus) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) setFocus(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [focus]);

  const actions = (dark = false) => (
    <div className="flex flex-wrap gap-2">
      {!s.experimentStartedAt && !ended && (
        <Button
          variant="primary"
          size="lg"
          icon={<Play size={17} />}
          disabled={!cleared}
          className={dark ? "bg-white text-ink" : undefined}
          onClick={() => update((p) => startProtocol(p, Date.now()))}
        >
          Iniciar protocolo
        </Button>
      )}
      <Button
        size="lg"
        icon={<Zap size={17} />}
        onClick={() => setQuickOpen((v) => !v)}
        className={dark ? "bg-white/10 text-white" : undefined}
      >
        Registrar intercorrência
      </Button>
      <Button
        variant="danger"
        size="lg"
        icon={<CirclePause size={17} />}
        onClick={interruptNow}
        disabled={!running || !!intr || ended}
      >
        Interromper experimento
      </Button>
      {s.experimentStartedAt && !ended && (
        <Button
          size="lg"
          icon={<Square size={17} />}
          className={dark ? "bg-white/10 text-white" : undefined}
          onClick={() => setFinishOpen(true)}
        >
          Encerrar protocolo
        </Button>
      )}
      {ended && (
        <Button
          variant="primary"
          onClick={() => {
            setFocus(false);
            goStage(6);
          }}
        >
          Verificações após o registro
        </Button>
      )}
    </div>
  );

  const timer = (dark = false) => (
    <div>
      <p className="text-[13px] opacity-70">
        {intr && isRunningHere
          ? "Cronômetro pausado"
          : isRunningHere
            ? "Tempo restante"
            : shown
              ? "Duração registrada"
              : "Duração prevista"}
      </p>
      <p
        className={cx(
          "tabular font-[300] leading-none tracking-[-0.04em]",
          dark ? "text-[min(28vw,184px)]" : "text-[72px] sm:text-[104px]",
        )}
      >
        {fmtDur(isRunningHere ? remaining : shown ? duration : planned)}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] opacity-70">
        <span>Planejado: {fmtDur(planned)}</span>
        <span>Transcorrido: {fmtDur(duration)}</span>
        {shown && <span>Início: {fmtClockRef(shown.startedAt, s.createdAt)}</span>}
        {shown?.endedAt && <span>Término: {fmtClockRef(shown.endedAt, s.createdAt)}</span>}
      </div>
    </div>
  );

  const eyes = step.kind === "repouso" && shown && (
    <Segmented
      label="Olhos neste repouso"
      value={shown.eyes}
      disabled={!!shown.endedAt || !!s.closedAt}
      options={[
        { value: "abertos", label: "Abertos" },
        { value: "fechados", label: "Fechados" },
        { value: "variavel", label: "Variável" },
      ]}
      onChange={(value) =>
        update((p) =>
          addEvent(patchAttempt(p, shown.id, { eyes: value }), {
            at: Date.now(),
            type: "etapa",
            label: `Olhos no repouso: ${value}`,
            stepKey: shown.stepKey,
            attemptId: shown.id,
          }),
        )
      }
    />
  );

  return (
    <>
      <StageHeader
        n={5}
        title="Execução do protocolo"
        description="Inicie uma vez. Repouso, tarefas e pausas avançam automaticamente, com horários registrados."
        right={
          <Button icon={<Maximize2 size={16} />} onClick={() => setFocus(true)}>
            Modo foco
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-5">
          {!cleared && !s.experimentStartedAt && (
            <Notice tone="alert">
              Conclua a conferência antes do início.{" "}
              <button className="underline" onClick={() => goStage(4)}>
                Ir para a etapa 4
              </button>
              .
            </Notice>
          )}
          {running && !isRunningHere && (
            <Notice>
              Você está consultando outro período.{" "}
              <button
                className="underline"
                onClick={() => update((p) => ({ ...p, selectedStep: running.stepKey }))}
              >
                Voltar ao período em andamento
              </button>
              .
            </Notice>
          )}
          {ended && (
            <Notice>
              Sequência encerrada às {fmtClockRef(s.experimentEndedAt, s.createdAt)}. Os registros
              permanecem disponíveis.
            </Notice>
          )}
          <section className="overflow-hidden rounded-[var(--radius-card)] border border-hair bg-panel">
            <div className="h-1.5" style={{ background: STEP_COLORS[step.color].swatch }} />
            <div className="grid gap-6 p-5 sm:p-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ColorDot step={step} />
                  <span className="text-[13px] text-steel">
                    Período {index + 1} de {seq.length}
                  </span>
                  <Badge tone="muted">{CONDITION_LABEL[step.condition]}</Badge>
                  <Badge tone="muted">{STEP_STATUS_LABEL[stepStatus(s, step, now)]}</Badge>
                  {s.config.tellBlocks[step.key] === "sim" && (
                    <Badge tone="blue">Bloco com TELL</Badge>
                  )}
                </div>
                <h2 className="mt-3 text-[25px] leading-tight">{step.name}</h2>
              </div>
              <div className="text-[18px]">
                <Instruction step={step} s={s} />
              </div>
              {timer()}
              {eyes}
              {actions()}
              {quickOpen && !focus && <QuickEvents />}
              <div className="border-t border-hair pt-4">
                <FlagButton size="sm" />
              </div>
              <p className="text-[14px] text-steel">
                Próximo período: {seq[index + 1]?.name ?? "fim do protocolo"}.
              </p>
              <p className="text-[12px] text-ash">
                O cronograma registra os períodos do checklist. EEG e TELL são operados nos
                respectivos equipamentos.
              </p>
            </div>
          </section>
          <Card title="Observação do período">
            <TextInput
              multiline
              rows={3}
              value={s.stepNotes[step.key] ?? ""}
              onChange={(value) =>
                update((p) => ({ ...p, stepNotes: { ...p.stepNotes, [step.key]: value } }))
              }
              placeholder="Anotações sobre este período"
            />
          </Card>
          {attempts.length > 0 && (
            <Card title="Registros deste período">
              <ul className="grid gap-3">
                {attempts.map((a) => (
                  <li key={a.id} className="rounded-[18px] bg-canvas p-4">
                    <p className="text-[14px]">
                      Tentativa {a.n} ·{" "}
                      {a.endedAt
                        ? a.endKind === "interrompida"
                          ? "Interrompida"
                          : "Concluída"
                        : "Em andamento"}
                    </p>
                    <p className="tabular mt-1 text-[13px] text-steel">
                      {fmtClockRef(a.startedAt, s.createdAt)} →{" "}
                      {fmtClockRef(a.endedAt, s.createdAt)} · efetiva{" "}
                      {fmtDur(attemptEffective(s, a, now))} · interrupção{" "}
                      {fmtDur(attemptPaused(s, a, now))}
                    </p>
                    {a.automaticEnd && (
                      <p className="mt-1 text-[12px] text-ash">
                        Transição automática conforme o cronograma.
                      </p>
                    )}
                    {a.retryReason && <p className="mt-1 text-[13px]">Reinício: {a.retryReason}</p>}
                    {a.earlyReason && (
                      <p className="mt-1 text-[13px]">Encerramento: {a.earlyReason}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.endedAt && (
                        <>
                          {attempts.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => update((p) => setConsidered(p, a.id, Date.now()))}
                            >
                              {a.considered
                                ? "Considerada pela equipe"
                                : "Considerar esta tentativa"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCorrect({ a, field: "startedAt" })}
                          >
                            Corrigir início
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCorrect({ a, field: "endedAt" })}
                          >
                            Corrigir término
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <nav
          aria-label="Sequência experimental"
          className="self-start rounded-[var(--radius-card)] border border-hair bg-panel p-3 lg:sticky lg:top-[88px]"
        >
          <p className="px-2 py-2 text-[12px] text-steel">
            {seq.length} períodos · {seq.reduce((total, st) => total + st.minutes, 0)} min
            planejados
          </p>
          <ol className="grid gap-1">
            {seq.map((st, i) => (
              <li key={st.key}>
                <button
                  type="button"
                  aria-current={step.key === st.key ? "step" : undefined}
                  onClick={() => update((p) => ({ ...p, selectedStep: st.key }))}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-[14px] px-3 py-3 text-left",
                    step.key === st.key ? "bg-canvas" : "hover:bg-canvas/70",
                  )}
                >
                  <span className="text-[12px] text-ash">{i + 1}</span>
                  <ColorDot step={st} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-tight">{st.name}</span>
                    <span className="text-[11px] text-steel">
                      {STEP_STATUS_LABEL[stepStatus(s, st, now)]} · {st.minutes} min
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      {focus && (
        <div
          role="region"
          aria-label="Modo foco"
          className="fixed inset-0 z-[70] overflow-y-auto bg-ink text-white"
        >
          <div className="mx-auto grid min-h-dvh max-w-5xl content-start gap-7 px-5 py-6 sm:px-10">
            <div className="flex items-center justify-between">
              <img src={logo} alt="LNEOC" className="h-6 w-auto" />
              <div className="flex items-center gap-3">
                <span className="tabular text-[14px]">{fmtClock(now)}</span>
                <Button
                  className="bg-white/10 text-white"
                  icon={<Minimize2 size={16} />}
                  onClick={() => setFocus(false)}
                >
                  Sair do foco
                </Button>
              </div>
            </div>
            {intr && (
              <div className="text-ink">
                <InterruptionPanel
                  onSessionEnded={() => {
                    setFocus(false);
                    goStage(6);
                  }}
                />
              </div>
            )}
            <p className="text-[14px] text-white/65">
              Período {index + 1} de {seq.length} · {CONDITION_LABEL[step.condition]}
            </p>
            <h2 className="text-[28px] leading-tight sm:text-[40px]">{step.name}</h2>
            <div className="text-[19px]">
              <Instruction step={step} s={s} />
            </div>
            {timer(true)}
            {eyes && <div className="rounded-[18px] bg-panel p-4 text-ink">{eyes}</div>}
            {quickOpen && <QuickEvents dark />}
            {actions(true)}
          </div>
        </div>
      )}
      <Modal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Encerrar protocolo antes do fim?"
        footer={
          <>
            <Button onClick={() => setFinishOpen(false)}>Continuar protocolo</Button>
            <Button
              variant="danger"
              onClick={() => {
                update((p) => finishExperiment(p, Date.now(), "interrompida"));
                setFinishOpen(false);
                setFocus(false);
                goStage(6);
              }}
            >
              Encerrar agora
            </Button>
          </>
        }
      >
        <p>
          O horário será registrado. Os períodos restantes ficarão sem conclusão; nenhuma gravação
          externa será encerrada pelo website.
        </p>
      </Modal>
      {correct && (
        <CorrectionModal
          open
          onClose={() => setCorrect(null)}
          target={`${step.name} — tentativa ${correct.a.n}`}
          original={correct.a[correct.field]}
          validate={(value) => attemptTimeError(s, correct.a, correct.field, value)}
          onConfirm={(value, reason) =>
            update((p) =>
              correctTime(
                patchAttempt(p, correct.a.id, { [correct.field]: value }),
                `${stepDef(p, correct.a.stepKey)?.name} — ${correct.field === "startedAt" ? "início" : "término"}`,
                correct.a[correct.field],
                value,
                reason,
                Date.now(),
              ),
            )
          }
        />
      )}
    </>
  );
}
