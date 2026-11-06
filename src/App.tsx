import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { InterruptionPanel, useInterruptNow } from "@/components/exec";
import { NewParticipantDialog } from "@/components/NewParticipantDialog";
import { NotesDrawer } from "@/components/NotesDrawer";
import { Header, MobileBar, Sidebar } from "@/components/Shell";
import { Button, cx } from "@/components/ui";
import { onClockDrift, useNow } from "@/lib/clock";
import { exportJSON } from "@/lib/export";
import { STAGES } from "@/lib/protocol";
import {
  activeAttempt,
  advanceProtocol,
  activeInterruption,
  addEvent,
  createSession,
  hasData,
} from "@/lib/session";
import { SessionProvider, useSession } from "@/lib/store";
import { fmtDur } from "@/lib/time";
import type { StageId } from "@/lib/types";
import { Stage1 } from "@/stages/Stage1";
import { Stage2 } from "@/stages/Stage2";
import { Stage3 } from "@/stages/Stage3";
import { Stage4 } from "@/stages/Stage4";
import { Stage5 } from "@/stages/Stage5";
import { Stage6 } from "@/stages/Stage6";
import { Stage7 } from "@/stages/Stage7";

export default function App() {
  return (
    <SessionProvider>
      <SessionWorkspace />
    </SessionProvider>
  );
}

// Changing participants also discards transient forms and dialogs.
function SessionWorkspace() {
  const { s } = useSession();
  return <Workspace key={s.id} />;
}

/** Runs independently of the visible stage, so navigation never stops the sequence. */
function ProtocolRunner() {
  const { s, update } = useSession();
  const now = useNow();
  const previous = useRef<string | null>(null);
  const activeId = activeAttempt(s)?.id ?? null;
  useEffect(() => {
    update((p) => advanceProtocol(p, now));
  }, [now, update]);
  useEffect(() => {
    const changed = previous.current != null && previous.current !== activeId;
    previous.current = activeId;
    if (!changed || activeInterruption(s)) return;
    if (s.config.soundAlert) {
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 660;
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.36);
        o.onended = () => {
          void ctx.close();
        };
      } catch {
        /* Audio unavailable. */
      }
    }
    if (s.config.vibrationAlert && "vibrate" in navigator) navigator.vibrate?.(180);
  }, [activeId, s]);
  return null;
}

function Workspace() {
  const { s, update, replace } = useSession();
  const interruptNow = useInterruptNow();
  const [notesOpen, setNotesOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const notify = useCallback(
    (msg: string, tone: "ok" | "error" = "ok") => setToast({ msg, tone }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "error" ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const goStage = useCallback(
    (n: StageId) => {
      update((p) => ({ ...p, stage: n }));
      window.scrollTo({ top: 0 });
    },
    [update],
  );

  // Warn before leaving when there is data (not guaranteed on every mobile browser).
  const dataPresent = hasData(s);
  useEffect(() => {
    if (!dataPresent) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dataPresent]);

  // Detect device clock adjustments (civil vs monotonic clock).
  useEffect(() => {
    onClockDrift((drift, at) => {
      update((p) =>
        addEvent(p, {
          at,
          type: "relogio",
          label: "Possível inconsistência temporal detectada",
          description: `Diferença de ${drift > 0 ? "+" : "−"}${fmtDur(Math.abs(drift))} entre o relógio do dispositivo e o relógio interno do navegador. Pode indicar ajuste do relógio ou suspensão do dispositivo. Revise os horários próximos.`,
        }),
      );
      notify(
        "Possível inconsistência no relógio do dispositivo registrada na linha do tempo.",
        "error",
      );
    });
    return () => onClockDrift(null);
  }, [update, notify]);

  // Note returns from background while a step is running; durations are timestamp-based so no time is lost.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const h = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt) {
        const away = Date.now() - hiddenAt;
        const at = Date.now();
        hiddenAt = null;
        if (away > 10000)
          update((p) =>
            activeAttempt(p)
              ? addEvent(p, {
                  at,
                  type: "sessao",
                  label: "Página retornou do segundo plano",
                  description: `Ausente por ${fmtDur(away)}. As transições seguem o cronograma automático; confira a execução dos períodos durante a ausência.`,
                })
              : p,
          );
      }
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [update]);

  useEffect(() => {
    document.title = `${s.fields.codigo_participante?.trim() ? `${s.fields.codigo_participante.trim()} · ` : ""}Protocolo EEG · Fala · TELL`;
  }, [s.fields.codigo_participante]);

  const canInterrupt =
    !!activeAttempt(s) && !s.closedAt && !s.experimentEndedAt && !activeInterruption(s);

  const clearNow = () => {
    replace(createSession());
    setDialog(false);
    setNotesOpen(false);
    window.scrollTo({ top: 0 });
  };
  const exportThenClear = () => {
    try {
      exportJSON(s);
    } catch (e) {
      notify(`A exportação falhou (${(e as Error).message}). Os dados foram mantidos.`, "error");
      return;
    }
    setExportRequested(true);
    notify("Download iniciado. Confira o arquivo antes de confirmar a limpeza.");
  };
  const requestNew = () => {
    setExportRequested(false);
    if (!hasData(s)) {
      replace(createSession());
      return;
    }
    setDialog(true);
  };

  const stageIdx = s.stage;
  const prev = STAGES.find((x) => x.id === stageIdx - 1);
  const next = STAGES.find((x) => x.id === stageIdx + 1);

  return (
    <div className="flex min-h-dvh">
      <Sidebar goStage={goStage} onNew={requestNew} />
      <div className="min-w-0 flex-1" ref={mainRef}>
        <Header
          goStage={goStage}
          openNotes={() => setNotesOpen(true)}
          onInterrupt={interruptNow}
          canInterrupt={canInterrupt}
          onNew={requestNew}
        />
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-10 lg:pt-10"
        >
          {activeInterruption(s) && (
            <div className="mb-6">
              <InterruptionPanel onSessionEnded={() => goStage(6)} />
            </div>
          )}

          {s.stage === 1 && <Stage1 />}
          {s.stage === 2 && <Stage2 />}
          {s.stage === 3 && <Stage3 />}
          {s.stage === 4 && <Stage4 goExec={() => goStage(5)} />}
          {s.stage === 5 && <Stage5 goStage={goStage} />}
          {s.stage === 6 && <Stage6 />}
          {s.stage === 7 && <Stage7 notify={notify} openNotes={() => setNotesOpen(true)} />}

          <nav
            aria-label="Navegação entre etapas"
            className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-6"
          >
            {prev ? (
              <Button
                variant="ghost"
                icon={<ArrowLeft size={16} />}
                onClick={() => goStage(prev.id)}
              >
                {prev.id}. {prev.short}
              </Button>
            ) : (
              <span />
            )}
            {next && (
              <Button variant="secondary" onClick={() => goStage(next.id)}>
                {next.id}. {next.title} <ArrowRight size={16} />
              </Button>
            )}
          </nav>
          <footer className="mt-10 text-[12px] leading-relaxed text-ash">
            Apoio operacional à coleta. Não realiza diagnóstico, não interpreta EEG e não recomenda
            alterações de medicação. Ações sobre o EEG e o TELL são confirmações manuais do
            pesquisador. Sem sincronização entre dispositivos.
          </footer>
        </main>
      </div>

      <MobileBar
        openNotes={() => setNotesOpen(true)}
        openQuick={() => setNotesOpen(true)}
        onInterrupt={interruptNow}
        canInterrupt={canInterrupt}
      />
      <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
      <NewParticipantDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onExportThenClear={exportThenClear}
        exportRequested={exportRequested}
        onClear={clearNow}
      />
      <ProtocolRunner />
      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-24 left-1/2 z-[90] w-[min(92vw,520px)] -translate-x-1/2 rounded-[18px] px-4 py-3 text-[14px] sm:bottom-6",
            toast.tone === "error" ? "bg-alert text-white" : "bg-ink text-white",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
