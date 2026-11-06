import type { ReactNode } from "react";
import { Check, CircleDot, CirclePause, Clock3, NotebookPen, UserPlus, Zap } from "lucide-react";
import logo from "@/assets/logo-lateral.png";
import { useNow } from "@/lib/clock";
import { STAGES } from "@/lib/protocol";
import {
  SESSION_STATUS_LABEL,
  activeAttempt,
  activeInterruption,
  attemptEffective,
  checkProgress,
  sequenceOf,
  sessionStatus,
  stepDef,
  stepStatus,
} from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtClock, fmtDur } from "@/lib/time";
import type { SessionStatus, StageId } from "@/lib/types";
import { cx } from "./ui";

export const TEMP_NOTICE =
  "Dados temporários nesta página. Exporte o resumo antes de recarregar, fechar ou trocar de participante.";

function stageMeta(stage: StageId) {
  return STAGES.find((x) => x.id === stage)!;
}

function useStageProgress() {
  const { s } = useSession();
  const now = useNow();
  return (id: StageId): { label: string; complete: boolean } => {
    if (id === 1) {
      const complete = !!s.fields.codigo_participante?.trim() && !!s.fields.codigo_sessao?.trim();
      return { label: complete ? "Dados informados" : "Dados pendentes", complete };
    }
    if (id === 5) {
      const seq = sequenceOf(s);
      const done = seq.filter((st) =>
        ["concluida", "nao_realizada"].includes(stepStatus(s, st, now)),
      ).length;
      return { label: `${done}/${seq.length} etapas`, complete: !!s.experimentEndedAt };
    }
    if (id === 7) return { label: s.closedAt ? "Encerrada" : "Resumo", complete: !!s.closedAt };
    const p = checkProgress(s, id);
    return {
      label: `${p.done}/${p.applicable}`,
      complete: p.applicable > 0 && p.requiredPending === 0 && p.done === p.applicable,
    };
  };
}

export function Sidebar({ goStage, onNew }: { goStage: (n: StageId) => void; onNew: () => void }) {
  const { s } = useSession();
  const progress = useStageProgress();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col bg-ink text-white lg:flex">
      <div className="px-6 pb-6 pt-7">
        <img src={logo} alt="LNEOC" className="h-7 w-auto opacity-80" />
        <p className="mt-4 text-[12px] leading-snug text-white/45">
          Protocolo EEG · tarefas de fala · TELL
        </p>
      </div>
      <nav
        aria-label="Etapas da sessão"
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3"
      >
        <ol className="grid gap-0.5">
          {STAGES.map((st) => {
            const cur = st.id === s.stage;
            const p = progress(st.id);
            return (
              <li key={st.id}>
                <button
                  type="button"
                  onClick={() => goStage(st.id)}
                  aria-current={cur ? "step" : undefined}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors",
                    cur ? "bg-white/10" : "hover:bg-white/5",
                  )}
                >
                  <span
                    className={cx(
                      "tabular grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px]",
                      p.complete
                        ? "bg-white text-ink"
                        : cur
                          ? "border border-white/60"
                          : "border border-white/20 text-white/60",
                    )}
                  >
                    {p.complete ? <Check size={14} strokeWidth={2.4} /> : st.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        "block text-[14px] leading-tight",
                        cur ? "text-white" : "text-white/75",
                      )}
                    >
                      {st.title}
                    </span>
                    <span className="tabular mt-0.5 block text-[11px] text-white/40">
                      {p.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="grid gap-2 px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={onNew}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-white/8 text-[14px] text-white hover:bg-white/14"
        >
          <UserPlus size={16} /> Novo participante
        </button>
        <p className="mt-2 rounded-[14px] border border-white/10 px-3 py-2.5 text-[11px] leading-snug text-white/50">
          {TEMP_NOTICE}
        </p>
      </div>
    </aside>
  );
}

const STATUS_STYLE: Record<SessionStatus, { cls: string; icon: ReactNode }> = {
  preparacao: { cls: "border border-black/15 text-ink", icon: <Clock3 size={13} /> },
  execucao: { cls: "border border-signal/70 text-signal", icon: <CircleDot size={13} /> },
  pos_registro: { cls: "border border-black/15 text-ink", icon: <Check size={13} /> },
  interrompida: {
    cls: "border border-alert/60 bg-alert-soft text-alert",
    icon: <CirclePause size={13} />,
  },
  encerrada: { cls: "bg-ink text-panel", icon: <Check size={13} /> },
  encerrada_pendencias: { cls: "border border-alert/50 text-alert", icon: <Check size={13} /> },
};

export function StatusPill() {
  const { s } = useSession();
  const st = sessionStatus(s);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px]",
        STATUS_STYLE[st].cls,
      )}
    >
      {STATUS_STYLE[st].icon}
      {SESSION_STATUS_LABEL[st]}
    </span>
  );
}

function DeviceClock({ className }: { className?: string }) {
  const now = useNow();
  return (
    <span className={cx("tabular", className)} aria-label="Horário atual do dispositivo">
      {fmtClock(now)}
    </span>
  );
}

function RunningChip({ goStage }: { goStage: (n: StageId) => void }) {
  const { s } = useSession();
  const now = useNow();
  const a = activeAttempt(s);
  if (!a) return null;
  const def = stepDef(s, a.stepKey);
  const idx = sequenceOf(s).findIndex((x) => x.key === a.stepKey);
  const rem = (def?.minutes ?? 0) * 60000 - attemptEffective(s, a, now);
  const paused = activeInterruption(s)?.attemptId === a.id;
  return (
    <button
      type="button"
      onClick={() => goStage(5)}
      className="flex min-w-0 items-center gap-2 rounded-full bg-wash px-3 py-1.5 text-left text-[13px] hover:bg-wash-2"
    >
      <CircleDot size={14} className={rem <= 0 ? "text-signal" : "text-ink"} />
      <span className="min-w-0 truncate">
        {idx + 1}. {def?.name}
      </span>
      <span className={cx("tabular shrink-0", rem <= 0 ? "text-signal" : "text-steel")}>
        {paused ? "pausada" : rem > 0 ? fmtDur(rem) : `+${fmtDur(-rem)}`}
      </span>
    </button>
  );
}

export function Header({
  goStage,
  openNotes,
  onInterrupt,
  canInterrupt,
  onNew,
}: {
  goStage: (n: StageId) => void;
  openNotes: () => void;
  onInterrupt: () => void;
  canInterrupt: boolean;
  onNew: () => void;
}) {
  const { s } = useSession();
  const p = checkProgress(s);
  const pct = p.applicable ? Math.round((p.done / p.applicable) * 100) : 0;
  const stage = stageMeta(s.stage);
  const code = s.fields.codigo_participante?.trim();
  const ses = s.fields.codigo_sessao?.trim();
  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-canvas/92 backdrop-blur-md">
      {/* mobile dark band */}
      <div className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-white lg:hidden">
        <img src={logo} alt="LNEOC" className="h-5 w-auto opacity-80" />
        <div className="flex items-center gap-1">
          <DeviceClock className="mr-2 text-[14px] text-white/80" />
          <button
            type="button"
            onClick={onNew}
            className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] text-white"
          >
            <UserPlus size={14} /> Novo
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-baseline gap-4">
          <div className="min-w-0">
            <p className="text-[11px] text-ash">Participante</p>
            <p className={cx("truncate text-[15px]", !code && "text-ash")}>
              {code || "Sem código"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ash">Sessão</p>
            <p className={cx("truncate text-[15px]", !ses && "text-ash")}>{ses || "Sem código"}</p>
          </div>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="text-[11px] text-ash">Etapa atual</p>
          <p className="truncate text-[15px]">
            {stage.id} · {stage.short}
          </p>
        </div>
        <div
          className="min-w-[150px] flex-1 sm:max-w-[220px]"
          title="Percentual de checks concluídos. Não representa o tempo experimental transcorrido."
        >
          <p className="flex justify-between text-[11px] text-ash">
            <span>Checks concluídos</span>
            <span className="tabular">
              {p.done}/{p.applicable} aplicáveis
            </span>
          </p>
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/8"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Checks concluídos (não é tempo experimental)"
          >
            <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <RunningChip goStage={goStage} />
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] text-ash">Horário do dispositivo</p>
            <DeviceClock className="text-[15px]" />
          </div>
          <StatusPill />
          <button
            type="button"
            onClick={openNotes}
            className="hidden min-h-10 items-center gap-2 rounded-full bg-wash px-3.5 text-[13px] hover:bg-wash-2 sm:inline-flex"
          >
            <NotebookPen size={15} /> Anotações
          </button>
          {canInterrupt && (
            <button
              type="button"
              onClick={onInterrupt}
              className="hidden min-h-10 items-center gap-2 rounded-full border border-alert/60 bg-panel px-3.5 text-[13px] text-alert hover:bg-alert-soft sm:inline-flex"
            >
              <CirclePause size={15} /> Interromper
            </button>
          )}
        </div>
      </div>
      {/* mobile stage selector + temporary notice */}
      <div className="border-t border-hair px-4 py-2 sm:px-6 lg:hidden">
        <label className="sr-only" htmlFor="stage-select">
          Etapa atual
        </label>
        <select
          id="stage-select"
          value={s.stage}
          onChange={(e) => goStage(Number(e.target.value) as StageId)}
          className="min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 text-[16px]"
        >
          {STAGES.map((st) => (
            <option key={st.id} value={st.id}>
              Etapa {st.id} de 7 — {st.title}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] leading-snug text-ash">{TEMP_NOTICE}</p>
      </div>
    </header>
  );
}

export function MobileBar({
  openNotes,
  openQuick,
  onInterrupt,
  canInterrupt,
}: {
  openNotes: () => void;
  openQuick: () => void;
  onInterrupt: () => void;
  canInterrupt: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hair bg-panel/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:hidden">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={openNotes}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-wash text-[12px]"
        >
          <NotebookPen size={17} /> Anotações
        </button>
        <button
          type="button"
          onClick={openQuick}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-wash text-[12px]"
        >
          <Zap size={17} /> Intercorrência
        </button>
        <button
          type="button"
          onClick={onInterrupt}
          disabled={!canInterrupt}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] border border-alert/60 text-[12px] text-alert disabled:border-black/10 disabled:text-ash"
        >
          <CirclePause size={17} /> Interromper
        </button>
      </div>
    </div>
  );
}
