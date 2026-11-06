import { useState } from "react";
import { FileDown, FileJson, LockOpen, Printer } from "lucide-react";
import { Badge, Button, Card, KV, Modal, Notice, Segmented, StageHeader } from "@/components/ui";
import { useNow } from "@/lib/clock";
import {
  OUTCOME_LABEL,
  buildSummary,
  exportHTML,
  exportJSON,
  printSummary,
  suggestOutcome,
} from "@/lib/export";
import { activeInterruption, addEvent, finishExperiment, resolveInterruption } from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtDateTime } from "@/lib/time";
import type { Outcome } from "@/lib/types";
const iso = (value: string | null) =>
  value ? value.replace("T", " ").replace(/\.\d{3}/, " UTC") : "";

export function Stage7({
  notify,
  openNotes,
}: {
  notify: (msg: string, tone?: "ok" | "error") => void;
  openNotes: () => void;
}) {
  const { s, update } = useSession();
  const now = useNow();
  const m = buildSummary(s, now);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = (fn: () => void, message: string) => {
    try {
      fn();
      notify(message);
    } catch (error) {
      notify(`Falha na exportação: ${(error as Error).message}. Os dados foram mantidos.`, "error");
    }
  };
  const close = () => {
    const at = Date.now();
    update((p) => {
      let out = p;
      if (activeInterruption(out)) out = resolveInterruption(out, "sessao_encerrada", at);
      if (out.experimentStartedAt && !out.experimentEndedAt)
        out = finishExperiment(out, at, "interrompida");
      const pending = buildSummary(out, at).pendenciasParaRevisao.length > 0;
      return addEvent(
        { ...out, closedAt: at, closedWithPendencies: pending },
        {
          at,
          type: "sessao",
          label: pending ? "Sessão encerrada com pendências" : "Sessão encerrada",
          description: `Resultado: ${p.outcome ? OUTCOME_LABEL[p.outcome] : "Não definido"}`,
          stepKey: null,
          attemptId: null,
          relativeMs: null,
        },
      );
    });
    setConfirmOpen(false);
  };
  return (
    <>
      <StageHeader
        n={7}
        title="Resumo e encerramento"
        description="Confira os registros da sessão e exporte o resumo antes de trocar de participante ou fechar a página."
      />
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Tempo total de trabalho", m.tempos.tempoTotalDeTrabalho],
            ["Sequência experimental", m.tempos.duracaoSequenciaExperimental ?? "—"],
            ["Planejado", m.tempos.duracaoPlanejadaSequencia],
            ["Interrupções", m.tempos.tempoTotalDeInterrupcao],
          ].map(([key, value]) => (
            <div key={key} className="rounded-[22px] border border-hair bg-panel p-4">
              <p className="text-[12px] text-steel">{key}</p>
              <p className="tabular mt-2 text-[26px]">{value}</p>
            </div>
          ))}
        </div>
        <Card title="Resultado operacional">
          <Segmented<Outcome>
            label="Resultado da sessão"
            disabled={!!s.closedAt}
            value={s.outcome ?? ""}
            onChange={(value) => update((p) => ({ ...p, outcome: value }))}
            options={(["concluida", "concluida_desvios", "interrompida"] as Outcome[]).map(
              (value) => ({ value, label: OUTCOME_LABEL[value] }),
            )}
          />
          <p className="mt-3 text-[13px] text-steel">
            Sugestão a partir dos registros: {OUTCOME_LABEL[suggestOutcome(s, now)]}.
          </p>
        </Card>
        <Card
          title="Pendências da sessão"
          right={
            <Badge tone={m.pendenciasParaRevisao.length ? "alert" : "muted"}>
              {m.pendenciasParaRevisao.length}
            </Badge>
          }
        >
          {m.pendenciasParaRevisao.length ? (
            <ul className="grid max-h-80 gap-2 overflow-y-auto text-[14px]">
              {m.pendenciasParaRevisao.map((value, i) => (
                <li key={i}>{value}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-steel">Nenhuma pendência identificada.</p>
          )}
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Identificação e responsáveis">
            <dl>
              <KV k="Participante" v={m.identificacao.codigoParticipante} />
              <KV k="Sessão" v={m.identificacao.codigoSessao} />
              <KV
                k="Data e local"
                v={[m.identificacao.dataColeta, m.identificacao.local].filter(Boolean).join(" · ")}
              />
              <KV k="Versão do protocolo" v={m.identificacao.versaoProtocolo} />
              <KV k="Pesquisador" v={m.responsaveis.pesquisador} />
              <KV k="Operador EEG" v={m.responsaveis.operadorEEG} />
              <KV k="Operador TELL" v={m.responsaveis.operadorTELL} />
            </dl>
          </Card>
          <Card title="Configuração utilizada">
            <dl>
              <KV k="Tarefa secundária" v={m.configuracao.tarefaSecundaria.nome} />
              <KV k="EEG nas pausas" v={m.configuracao.eegNasPausas} />
              <KV k="Olhos no repouso" v={m.configuracao.olhosNoRepouso} />
              <KV k="Postura no repouso" v={m.configuracao.posturaRepouso} />
              <KV k="Anotação dos eventos" v={m.preparacao.eeg.metodoAnotacaoEventos} />
              <KV
                k="TELL por bloco"
                v={Object.entries(m.configuracao.tellPorBloco)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")}
              />
            </dl>
          </Card>
        </div>
        <Card
          title="Horários registrados automaticamente"
          description="Horários da sequência guiada; as transições seguem o cronograma do website."
        >
          <dl>
            <KV k="Sessão aberta" v={iso(m.tempos.sessaoAbertaEm)} />
            <KV k="Início do protocolo" v={iso(m.tempos.inicioSequenciaExperimental)} />
            <KV k="Término do protocolo" v={iso(m.tempos.terminoSequenciaExperimental)} />
            <KV k="Soma das durações efetivas" v={m.tempos.somaDuracoesEfetivasDasEtapas} />
          </dl>
        </Card>
        <Card title="Períodos e tentativas">
          <ol className="grid gap-2">
            {m.etapas.map((step) => (
              <li key={step.chave} className="rounded-[16px] bg-canvas p-4">
                <p className="text-[14px]">
                  {step.ordem}. {step.nome} · <span className="text-steel">{step.estado}</span>
                </p>
                {step.tentativas.map((attempt) => (
                  <p key={attempt.numero} className="tabular mt-1 text-[12px] text-steel">
                    T{attempt.numero}
                    {attempt.consideradaPelaEquipe ? " (considerada)" : ""}:{" "}
                    {attempt.duracaoEfetiva} de {step.duracaoPlanejada} · {attempt.resultado}
                    {attempt.terminoAutomatico ? " · transição automática" : ""}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Arquivos e anotações">
          <dl>
            <KV k="Arquivos de EEG" v={m.arquivos.eeg} />
            <KV k="Registros do TELL" v={m.arquivos.tell} />
            <KV k="Cópia de segurança" v={m.arquivos.copiaSeguranca} />
            <KV k="Eventos registrados" v={String(m.eventos.length)} />
          </dl>
          <Button size="sm" className="mt-3" onClick={openNotes}>
            Abrir anotações e linha do tempo
          </Button>
        </Card>
        <Card title="Exportar resumo" description="Exportar não limpa os dados da sessão.">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={<FileJson size={16} />}
              onClick={() => run(() => exportJSON(s), "Download do JSON iniciado.")}
            >
              Exportar JSON
            </Button>
            <Button
              icon={<Printer size={16} />}
              onClick={() => run(() => printSummary(s), "Impressão solicitada.")}
            >
              Imprimir ou salvar como PDF
            </Button>
            <Button
              icon={<FileDown size={16} />}
              onClick={() => run(() => exportHTML(s), "Download do resumo iniciado.")}
            >
              Baixar resumo legível (HTML)
            </Button>
          </div>
        </Card>
        <Card title="Encerrar sessão">
          {s.closedAt ? (
            <div className="grid gap-3">
              <p className="text-[14px]">
                {s.closedWithPendencies ? "Encerrada com pendências" : "Encerrada"} em{" "}
                {fmtDateTime(s.closedAt)}.
              </p>
              <div>
                <Button
                  variant="ghost"
                  icon={<LockOpen size={16} />}
                  onClick={() =>
                    update((p) =>
                      addEvent(
                        { ...p, closedAt: null, closedWithPendencies: false },
                        {
                          at: Date.now(),
                          type: "sessao",
                          label: "Sessão reaberta para complementação",
                          stepKey: null,
                          attemptId: null,
                          relativeMs: null,
                        },
                      ),
                    )
                  }
                >
                  Reabrir para complementar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {!s.outcome && (
                <Notice>Selecione o resultado operacional para encerrar a sessão.</Notice>
              )}
              <div>
                <Button
                  variant="primary"
                  disabled={!s.outcome}
                  onClick={() => setConfirmOpen(true)}
                >
                  Encerrar sessão
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={m.pendenciasParaRevisao.length ? "Encerrar com pendências?" : "Encerrar sessão?"}
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={close}>
              {m.pendenciasParaRevisao.length ? "Encerrar com pendências" : "Encerrar"}
            </Button>
          </>
        }
      >
        <p>
          Resultado: {s.outcome ? OUTCOME_LABEL[s.outcome] : "Não definido"}. As pendências
          permanecem registradas. Os dados continuam nesta página até a troca de participante ou o
          recarregamento.
        </p>
      </Modal>
    </>
  );
}
