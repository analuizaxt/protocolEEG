import { useState } from "react";
import { CirclePause, Flag, FlagOff, Play, RotateCcw, Square } from "lucide-react";
import { EVENT_CATEGORIES } from "@/lib/protocol";
import { useNow } from "@/lib/clock";
import {
  activeAttempt,
  activeInterruption,
  addEvent,
  attemptEffective,
  interrupt,
  patchInterruption,
  resolveInterruption,
} from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtClock, fmtDur, uid } from "@/lib/time";
import type { SessionState } from "@/lib/types";
import { Button, Segmented, TextInput, cx } from "./ui";

/* ------------------------------ quick events ------------------------------- */

export function createQuickEvent(
  s: SessionState,
  category: string,
  at: number,
  id: string,
): SessionState {
  return addEvent(s, { id, at, type: "intercorrencia", category, label: category });
}

export function QuickEvents({
  dark,
  onCreated,
}: {
  dark?: boolean;
  onCreated?: (id: string) => void;
}) {
  const { s, update } = useSession();
  const [lastId, setLastId] = useState<string | null>(null);
  const last = lastId ? s.events.find((e) => e.id === lastId) : undefined;
  const create = (cat: string) => {
    const at = Date.now();
    const id = uid("ev");
    update((p) => createQuickEvent(p, cat, at, id));
    setLastId(id);
    onCreated?.(id);
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {EVENT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => create(c)}
            className={cx(
              "min-h-11 rounded-[14px] px-3 py-2 text-left text-[13px] leading-tight transition-colors",
              dark
                ? "bg-white/8 text-white hover:bg-white/14"
                : "border border-black/10 bg-white hover:border-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {last && (
        <div className={cx("mt-3 rounded-[16px] p-3", dark ? "bg-white/8" : "bg-canvas")}>
          <p className={cx("mb-2 text-[13px]", dark ? "text-white/75" : "text-steel")}>
            Registrado: <span className={dark ? "text-white" : "text-ink"}>{last.label}</span> às{" "}
            <span className="tabular">{fmtClock(last.at)}</span>
            {last.relativeMs != null && <> · {fmtDur(last.relativeMs)} desde o início da tarefa</>}
          </p>
          <input
            aria-label="Complementar descrição do evento"
            value={last.description}
            onChange={(e) => {
              const v = e.target.value;
              update((p) => ({
                ...p,
                events: p.events.map((ev) => (ev.id === last.id ? { ...ev, description: v } : ev)),
              }));
            }}
            placeholder="Complementar descrição (opcional)"
            className={cx(
              "min-h-11 w-full rounded-[12px] px-3 text-[16px] outline-none",
              dark
                ? "bg-white/10 text-white placeholder:text-white/40"
                : "border border-black/10 bg-white",
            )}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------------------- flagged intervals ---------------------------- */

export function FlagButton({ dark, size = "md" }: { dark?: boolean; size?: "sm" | "md" }) {
  const { s, update } = useSession();
  const open = s.flagged.find((f) => f.end == null);
  const toggle = () => {
    const at = Date.now();
    update((p) => {
      const cur = p.flagged.find((f) => f.end == null);
      if (cur) {
        const out = {
          ...p,
          flagged: p.flagged.map((f) => (f.id === cur.id ? { ...f, end: at } : f)),
        };
        return addEvent(out, {
          at,
          type: "sinalizacao",
          label: "Fim do intervalo sinalizado para revisão",
          description: `Duração sinalizada: ${fmtDur(at - cur.start)}`,
        });
      }
      const a = activeAttempt(p);
      const out = {
        ...p,
        flagged: [
          ...p.flagged,
          {
            id: uid("flag"),
            start: at,
            end: null,
            stepKey: a?.stepKey ?? null,
            attemptId: a?.id ?? null,
            note: "",
          },
        ],
      };
      return addEvent(out, {
        at,
        type: "sinalizacao",
        label: "Início de intervalo sinalizado para revisão",
        description: "O trecho não é excluído nem classificado como inválido.",
      });
    });
  };
  return (
    <Button
      size={size}
      variant={dark ? "ghost" : "secondary"}
      className={dark ? "bg-white/8 text-white hover:bg-white/14" : undefined}
      icon={open ? <FlagOff size={16} /> : <Flag size={16} />}
      onClick={toggle}
      aria-pressed={!!open}
    >
      {open
        ? `Fim do intervalo sinalizado (${fmtClock(open.start)})`
        : "Sinalizar intervalo para revisão"}
    </Button>
  );
}

/* ------------------------------ interruption ------------------------------- */

export function useInterruptNow() {
  const { update } = useSession();
  return () => {
    const at = Date.now();
    update((p) => interrupt(p, at));
  };
}

const STATE_OPTS = [
  { value: "gravando", label: "Gravando" },
  { value: "pausado", label: "Pausado" },
  { value: "parado", label: "Parado" },
  { value: "nao_verificado", label: "Não verificado" },
];

export function InterruptionPanel({ onSessionEnded }: { onSessionEnded?: () => void }) {
  const { s, update } = useSession();
  const now = useNow();
  const i = activeInterruption(s);
  if (!i) return null;
  const a = i.attemptId ? s.attempts.find((x) => x.id === i.attemptId) : undefined;
  const patch = (p: Partial<typeof i>) => update((x) => patchInterruption(x, i.id, p));
  const resolve = (o: "retomada" | "nova_tentativa" | "sessao_encerrada") => {
    const at = Date.now();
    update((x) => resolveInterruption(x, o, at));
    if (o === "sessao_encerrada") onSessionEnded?.();
  };
  return (
    <section
      role="alert"
      className="rounded-[var(--radius-card)] border border-alert/50 bg-panel p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] text-alert">
            <CirclePause size={16} /> Interrupção não prevista
          </p>
          <h2 className="mt-1 text-[22px]">Experimento interrompido às {fmtClock(i.start)}</h2>
          <p className="mt-1 text-[14px] text-steel">
            {a
              ? "O cronômetro da etapa está pausado; o tempo de interrupção é contado à parte."
              : "Nenhuma etapa estava em andamento."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-ash">Tempo de interrupção</p>
          <p className="tabular text-[28px] leading-none">{fmtDur(now - i.start)}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <TextInput
          label="Motivo"
          hint="Pode ser preenchido depois."
          value={i.reason}
          onChange={(v) => patch({ reason: v })}
          multiline
          rows={2}
        />
        <Segmented
          label="Estado do EEG (informado)"
          value={i.eegState}
          onChange={(v) => patch({ eegState: v })}
          options={STATE_OPTS}
        />
        <Segmented
          label="Estado do TELL (informado)"
          value={i.tellState}
          onChange={(v) => patch({ tellState: v })}
          options={STATE_OPTS}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" icon={<Play size={16} />} onClick={() => resolve("retomada")}>
          {a ? "Retomar etapa" : "Encerrar interrupção"}
        </Button>
        {a && (
          <Button icon={<RotateCcw size={16} />} onClick={() => resolve("nova_tentativa")}>
            Reiniciar tarefa como nova tentativa
          </Button>
        )}
        <Button
          variant="danger"
          icon={<Square size={15} />}
          onClick={() => resolve("sessao_encerrada")}
        >
          Encerrar sessão experimental
        </Button>
      </div>
      {a && (
        <p className="mt-3 text-[12px] text-ash">
          Ao reiniciar, a tentativa atual é preservada como interrompida e a nova tentativa começa
          imediatamente. A sequência continua automaticamente após ela.
        </p>
      )}
    </section>
  );
}

export function effectiveNow(s: SessionState, now: number) {
  const a = activeAttempt(s);
  return a ? attemptEffective(s, a, now) : 0;
}
