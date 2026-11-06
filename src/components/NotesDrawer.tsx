import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { stepDef } from "@/lib/session";
import { useField, useSession } from "@/lib/store";
import { fmtClockRef, fmtDur } from "@/lib/time";
import type { EventType } from "@/lib/types";
import { FlagButton, QuickEvents } from "./exec";
import { Segmented, TextInput, cx } from "./ui";

const TYPE_LABEL: Record<EventType, string> = {
  intercorrencia: "Intercorrência",
  etapa: "Etapa",
  interrupcao: "Interrupção",
  check: "Check",
  correcao: "Correção",
  config: "Configuração",
  desvio: "Desvio",
  relogio: "Relógio",
  sinalizacao: "Sinalização",
  sessao: "Sessão",
};

export function NotesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update } = useSession();
  const [general, setGeneral] = useField("nota_geral");
  const [filter, setFilter] = useState<"todos" | "intercorrencias" | "etapas">("todos");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const events = [...s.events]
    .filter((e) =>
      filter === "todos"
        ? true
        : filter === "intercorrencias"
          ? ["intercorrencia", "interrupcao", "sinalizacao", "desvio", "relogio"].includes(e.type)
          : ["etapa", "sessao"].includes(e.type),
    )
    .reverse();
  return (
    <div
      className="fixed inset-0 z-[75] flex justify-end bg-ink/30"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Anotações e intercorrências"
        className="flex h-full w-full max-w-[460px] flex-col bg-panel"
      >
        <div className="flex items-center justify-between border-b border-hair px-5 py-4">
          <div>
            <h2 className="text-[19px]">Anotações e intercorrências</h2>
            <p className="text-[12px] text-ash">{s.events.length} eventos na linha do tempo</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-steel hover:bg-wash"
            aria-label="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <section>
            <h3 className="mb-1 text-[15px]">Registro rápido</h3>
            <p className="mb-3 text-[12px] text-ash">
              Um toque cria o evento com horário, etapa e tempo na tarefa. Complemente depois, se
              necessário.
            </p>
            <QuickEvents />
            <div className="mt-3">
              <FlagButton size="sm" />
            </div>
          </section>

          <section className="mt-7">
            <TextInput
              label="Anotação geral da sessão"
              multiline
              rows={4}
              value={general}
              onChange={setGeneral}
            />
          </section>

          {s.flagged.length > 0 && (
            <section className="mt-7">
              <h3 className="mb-2 text-[15px]">Intervalos sinalizados para revisão</h3>
              <ul className="grid gap-2">
                {s.flagged.map((fl) => (
                  <li key={fl.id} className="rounded-[16px] bg-canvas p-3">
                    <p className="tabular text-[13px]">
                      {fmtClockRef(fl.start, s.createdAt)} →{" "}
                      {fl.end ? fmtClockRef(fl.end, s.createdAt) : "em aberto"}
                      {fl.stepKey && (
                        <span className="text-steel"> · {stepDef(s, fl.stepKey)?.name}</span>
                      )}
                    </p>
                    <input
                      aria-label="Nota do intervalo sinalizado"
                      value={fl.note}
                      onChange={(e) => {
                        const v = e.target.value;
                        update((p) => ({
                          ...p,
                          flagged: p.flagged.map((x) => (x.id === fl.id ? { ...x, note: v } : x)),
                        }));
                      }}
                      placeholder="Nota (opcional)"
                      className="mt-2 min-h-10 w-full rounded-[12px] border border-black/10 bg-white px-3 text-[16px] outline-none focus:border-signal"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-7">
            <h3 className="mb-2 text-[15px]">Linha do tempo</h3>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "todos", label: "Todos" },
                { value: "intercorrencias", label: "Intercorrências" },
                { value: "etapas", label: "Etapas" },
              ]}
            />
            {events.length === 0 ? (
              <p className="mt-4 text-[13px] text-ash">Nenhum evento.</p>
            ) : (
              <ol className="mt-4 border-l border-hair">
                {events.map((e) => (
                  <li key={e.id} className="relative pb-4 pl-4">
                    <span
                      aria-hidden
                      className={cx(
                        "absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full",
                        e.type === "intercorrencia" || e.type === "interrupcao"
                          ? "bg-alert"
                          : e.type === "relogio" || e.type === "desvio"
                            ? "bg-signal"
                            : "bg-ash",
                      )}
                    />
                    <p className="tabular text-[12px] text-steel">
                      {fmtClockRef(e.at, s.createdAt)} · {TYPE_LABEL[e.type]}
                      {e.stepKey && ` · ${stepDef(s, e.stepKey)?.name}`}
                      {e.attemptId &&
                        (() => {
                          const n = s.attempts.find((a) => a.id === e.attemptId)?.n;
                          return n && n > 1 ? ` · T${n}` : "";
                        })()}
                      {e.relativeMs != null && ` · ${fmtDur(e.relativeMs)} na tarefa`}
                    </p>
                    <p className="mt-0.5 text-[14px] leading-snug">{e.label}</p>
                    {e.type === "intercorrencia" ? (
                      <input
                        aria-label={`Descrição de ${e.label}`}
                        value={e.description}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          update((p) => ({
                            ...p,
                            events: p.events.map((x) =>
                              x.id === e.id ? { ...x, description: v } : x,
                            ),
                          }));
                        }}
                        placeholder="Complementar descrição"
                        className="mt-1.5 min-h-10 w-full rounded-[12px] border border-black/10 bg-white px-3 text-[16px] outline-none focus:border-signal"
                      />
                    ) : (
                      e.description && (
                        <p className="mt-0.5 text-[12px] leading-snug text-steel">
                          {e.description}
                        </p>
                      )
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
