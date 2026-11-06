import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, PencilLine } from "lucide-react";
import { CheckGroupCard } from "@/components/Checklist";
import { SequenceList } from "@/components/SequenceList";
import {
  Badge,
  Button,
  Card,
  KV,
  Modal,
  Notice,
  Segmented,
  StageHeader,
  TextInput,
  Toggle,
} from "@/components/ui";
import { buildSequence, EEG_PAUSE_LABEL, SPEECH_STEPS } from "@/lib/protocol";
import { addEvent, applyConfigChange, diffConfig, getCheck, pendingRequired } from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtDateTime, uid } from "@/lib/time";
import type { ProtocolConfig, SessionState, TriState } from "@/lib/types";

function ConfigEditor({
  c,
  set,
  started,
}: {
  c: ProtocolConfig;
  set: (p: Partial<ProtocolConfig>) => void;
  started: boolean;
}) {
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <h3 className="text-[16px]">1. Tarefa secundária</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Nome da tarefa secundária"
            value={c.secondaryName}
            onChange={(v) => set({ secondaryName: v })}
          />
          <TextInput
            label="Medida de desempenho"
            hint="Se prevista."
            value={c.secondaryMeasure}
            onChange={(v) => set({ secondaryMeasure: v })}
          />
          <TextInput
            className="sm:col-span-2"
            label="Instruções aprovadas"
            hint="Serão exibidas junto da orientação de fala na dupla tarefa."
            multiline
            value={c.secondaryInstructions}
            onChange={(v) => set({ secondaryInstructions: v })}
          />
          <TextInput
            label="Materiais e posicionamento"
            multiline
            rows={2}
            value={c.secondaryMaterials}
            onChange={(v) => set({ secondaryMaterials: v })}
          />
          <TextInput
            label="Observações operacionais"
            multiline
            rows={2}
            value={c.secondaryNotes}
            onChange={(v) => set({ secondaryNotes: v })}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <h3 className="text-[16px]">2. Gravação de EEG nas pausas</h3>
        <Segmented
          value={c.eegPauses}
          onChange={(v) => set({ eegPauses: v })}
          options={[
            { value: "interrompido", label: EEG_PAUSE_LABEL.interrompido },
            { value: "continuo", label: EEG_PAUSE_LABEL.continuo },
            { value: "outro", label: EEG_PAUSE_LABEL.outro },
            { value: "indefinido", label: "Não definido" },
          ]}
        />
        <TextInput
          label="Descrição do procedimento"
          multiline
          rows={2}
          value={c.eegPausesDescription}
          onChange={(v) => set({ eegPausesDescription: v })}
        />
      </section>

      <section className="grid gap-4">
        <h3 className="text-[16px]">3. Orientação durante o repouso</h3>
        <Segmented
          label="Olhos durante o repouso"
          value={c.restEyes}
          onChange={(value) => set({ restEyes: value })}
          options={[
            { value: "abertos", label: "Abertos" },
            { value: "fechados", label: "Fechados" },
            { value: "variavel", label: "Varia durante a coleta" },
          ]}
        />
        <TextInput
          label="Postura e observações do repouso"
          multiline
          rows={2}
          value={c.restOrientation}
          onChange={(v) => set({ restOrientation: v })}
        />
      </section>

      <section className="grid gap-4">
        <h3 className="flex items-center gap-2 text-[16px]">
          Alertas ao atingir o tempo previsto {started && <Lock size={14} className="text-ash" />}
        </h3>
        <p className="-mt-2 text-[13px] text-steel">
          Desativados por padrão, pois podem interferir na coleta. Só podem ser ativados antes do
          experimento.
        </p>
        <Toggle
          label="Alerta sonoro curto"
          checked={c.soundAlert}
          onChange={(v) => set({ soundAlert: v })}
          disabled={started}
        />
        <Toggle
          label="Vibração (quando o dispositivo permitir)"
          checked={c.vibrationAlert}
          onChange={(v) => set({ vibrationAlert: v })}
          disabled={started}
        />
      </section>
    </div>
  );
}

function configGaps(c: ProtocolConfig) {
  const gaps: string[] = [];
  if (!c.secondaryName.trim()) gaps.push("Tarefa secundária sem nome");
  if (!c.secondaryInstructions.trim())
    gaps.push("Instruções aprovadas da tarefa secundária não registradas");
  if (c.eegPauses === "indefinido") gaps.push("Procedimento de EEG nas pausas não definido");
  if (c.eegPauses === "outro" && !c.eegPausesDescription.trim())
    gaps.push("Procedimento de EEG nas pausas sem descrição");
  SPEECH_STEPS.forEach(
    (st) =>
      (c.tellBlocks[st.key] ?? "indefinido") === "indefinido" &&
      gaps.push(`TELL não definido para: ${st.name}`),
  );
  if (!c.restEyes) gaps.push("Condição dos olhos durante o repouso não selecionada");
  return gaps;
}

export function prestartState(s: SessionState) {
  const blocking: string[] = [];
  ["part.consentimento", "part.elegibilidade"].forEach((id) => {
    if (getCheck(s, id).status !== "concluido")
      blocking.push(
        id === "part.consentimento" ? "Consentimento não conferido" : "Elegibilidade não conferida",
      );
  });
  const operational = [
    ...pendingRequired(s, [1, 2, 3, 4])
      .filter((d) => !d.blocking)
      .map((d) => `${d.group.title}: ${d.text}`),
    ...configGaps(s.config),
  ];
  if (!s.fields.codigo_participante?.trim())
    operational.unshift("Código do participante não informado");
  if (!s.fields.codigo_sessao?.trim()) operational.unshift("Código da sessão não informado");
  return { blocking, operational };
}

export function Stage4({ goExec }: { goExec: () => void }) {
  const { s, update } = useSession();
  const started = !!s.experimentStartedAt;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProtocolConfig>(s.config);
  const [justOpen, setJustOpen] = useState(false);
  const [just, setJust] = useState("");
  const [devJust, setDevJust] = useState("");
  const { blocking, operational } = prestartState(s);
  const lastDeviation = s.deviations[s.deviations.length - 1];

  const setLive = (p: Partial<ProtocolConfig>) =>
    update((x) => ({ ...x, config: { ...x.config, ...p } }));
  const changes = diffConfig(s.config, draft);

  const clear = (withDeviation: boolean) => {
    const now = Date.now();
    update((p) => {
      let out: SessionState = { ...p, preStartClearedAt: now, configConfirmedAt: now };
      if (withDeviation) {
        out = {
          ...out,
          deviations: [
            ...out.deviations,
            { id: uid("desv"), at: now, items: operational, justification: devJust.trim() },
          ],
        };
        out = addEvent(out, {
          at: now,
          type: "desvio",
          label: "Início liberado com pendências operacionais (desvio registrado)",
          description: `Pendências: ${operational.join("; ")}. Justificativa: ${devJust.trim()}`,
          stepKey: null,
          attemptId: null,
          relativeMs: null,
        });
      } else {
        out = addEvent(out, {
          at: now,
          type: "sessao",
          label: "Conferência antes do início concluída sem pendências",
          stepKey: null,
          attemptId: null,
          relativeMs: null,
        });
      }
      return out;
    });
  };

  return (
    <>
      <StageHeader
        n={4}
        title="Conferência antes de iniciar"
        description="Confira as instruções e a configuração da sessão antes de iniciar."
      />
      <div className="grid gap-5">
        <Card
          title="Configuração do protocolo"
          eyebrow={
            started
              ? "Sequência em andamento — alterações exigem justificativa"
              : "Definida pela equipe"
          }
          right={
            started && !editing ? (
              <Button
                size="sm"
                icon={<PencilLine size={15} />}
                onClick={() => {
                  setDraft(s.config);
                  setEditing(true);
                }}
              >
                Alterar configuração
              </Button>
            ) : undefined
          }
        >
          {!started && <ConfigEditor c={s.config} set={setLive} started={false} />}
          {started && editing && (
            <>
              <ConfigEditor c={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} started />
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hair pt-5">
                <Button onClick={() => setEditing(false)}>Descartar alterações</Button>
                <Button
                  variant="primary"
                  disabled={!changes.length}
                  onClick={() => setJustOpen(true)}
                >
                  Salvar {changes.length ? `${changes.length} alteração(ões)` : ""}
                </Button>
              </div>
            </>
          )}
          {started && !editing && <ConfigReadOnly c={s.config} />}
          {s.configChanges.length > 0 && (
            <div className="mt-6 border-t border-hair pt-4">
              <p className="mb-2 text-[13px] text-steel">Alterações registradas após o início</p>
              {s.configChanges.map((ch) => (
                <p key={ch.id} className="py-1 text-[13px]">
                  <span className="tabular text-steel">{fmtDateTime(ch.at)}</span> —{" "}
                  {ch.changes.map((c) => c.label).join(", ")}. Justificativa: {ch.justification}
                </p>
              ))}
            </div>
          )}
        </Card>

        <CheckGroupCard groupId="cfg" />

        <Card
          title="Pendências antes do início"
          eyebrow="Itens críticos e obrigatórios das etapas 1 a 4"
        >
          {blocking.length > 0 && (
            <Notice tone="alert" icon={<AlertTriangle size={18} />} className="mb-4">
              <p className="text-ink">
                Impede o início — justificativas não substituem estes itens:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {blocking.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Notice>
          )}
          {operational.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2 text-[14px]">Pendências operacionais ({operational.length})</p>
              <ul className="grid gap-1 text-[14px] text-steel">
                {operational.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ash" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            blocking.length === 0 && (
              <Notice tone="blue" icon={<CheckCircle2 size={18} />} className="mb-4">
                Nenhuma pendência obrigatória.
              </Notice>
            )
          )}

          {s.preStartClearedAt && blocking.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-canvas p-4">
              <div>
                <p className="text-[14px]">Início liberado às {fmtDateTime(s.preStartClearedAt)}</p>
                {lastDeviation && (
                  <p className="mt-1 text-[13px] text-steel">
                    Desvio registrado: {lastDeviation.justification}
                  </p>
                )}
              </div>
              <Button variant="primary" icon={<ArrowRight size={16} />} onClick={goExec}>
                Ir para a execução
              </Button>
            </div>
          ) : blocking.length > 0 ? null : operational.length === 0 ? (
            <Button variant="primary" size="lg" onClick={() => clear(false)}>
              Liberar início do protocolo
            </Button>
          ) : (
            <div className="grid gap-3 rounded-[18px] bg-canvas p-4">
              <TextInput
                label="Justificativa para prosseguir com pendências operacionais"
                hint="Será registrada como desvio na linha do tempo e no resumo."
                multiline
                rows={2}
                value={devJust}
                onChange={setDevJust}
              />
              <div>
                <Button
                  variant="primary"
                  disabled={devJust.trim().length < 3}
                  onClick={() => clear(true)}
                >
                  Prosseguir com pendências e registrar desvio
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={justOpen}
        onClose={() => setJustOpen(false)}
        title="Justificar alteração da configuração"
        footer={
          <>
            <Button onClick={() => setJustOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={just.trim().length < 3}
              onClick={() => {
                const now = Date.now();
                update((p) =>
                  applyConfigChange(
                    p,
                    {
                      ...draft,
                      soundAlert: p.config.soundAlert,
                      vibrationAlert: p.config.vibrationAlert,
                    },
                    just.trim(),
                    now,
                  ),
                );
                setJust("");
                setJustOpen(false);
                setEditing(false);
              }}
            >
              Registrar alteração
            </Button>
          </>
        }
      >
        <ul className="mb-4 grid gap-1 text-[14px]">
          {changes.map((c) => (
            <li key={c.key}>
              <span className="text-steel">{c.label}:</span> “{c.from}” → “{c.to}”
            </li>
          ))}
        </ul>
        <TextInput
          label="Justificativa"
          multiline
          rows={3}
          value={just}
          onChange={setJust}
          autoFocus
        />
      </Modal>
    </>
  );
}

function ConfigReadOnly({ c }: { c: ProtocolConfig }) {
  const tri = (v?: TriState) => (v === "sim" ? "Sim" : v === "nao" ? "Não" : "Não definido");
  return (
    <div className="grid gap-6">
      <dl>
        <KV k="Tarefa secundária" v={c.secondaryName} />
        <KV k="Instruções aprovadas" v={c.secondaryInstructions} />
        <KV k="Materiais e posicionamento" v={c.secondaryMaterials} />
        <KV k="Medida de desempenho" v={c.secondaryMeasure} />
        <KV
          k="EEG nas pausas"
          v={`${EEG_PAUSE_LABEL[c.eegPauses]}${c.eegPausesDescription ? ` — ${c.eegPausesDescription}` : ""}`}
        />
        <KV
          k="TELL por bloco"
          v={SPEECH_STEPS.map((st) => `${st.name}: ${tri(c.tellBlocks[st.key])}`).join(" · ")}
        />
        <KV
          k="Olhos no repouso"
          v={
            c.restEyes === "abertos"
              ? "Abertos"
              : c.restEyes === "fechados"
                ? "Fechados"
                : c.restEyes === "variavel"
                  ? "Varia durante a coleta"
                  : "Não informado"
          }
        />
        <KV k="Postura e observações" v={c.restOrientation} />
        <KV
          k="Alertas"
          v={
            <span className="flex flex-wrap gap-1.5">
              <Badge tone="muted">Som: {c.soundAlert ? "ativado" : "desativado"}</Badge>
              <Badge tone="muted">Vibração: {c.vibrationAlert ? "ativada" : "desativada"}</Badge>
            </span>
          }
        />
      </dl>
      <SequenceList steps={buildSequence(c)} />
    </div>
  );
}
