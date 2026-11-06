import { CheckGroupCard } from "@/components/Checklist";
import { Field, Segmented, StageHeader } from "@/components/ui";
import { SPEECH_STEPS } from "@/lib/protocol";
import { useField, useSession } from "@/lib/store";
import type { TriState } from "@/lib/types";

export function Stage3() {
  const [method, setMethod] = useField("eeg_metodo_eventos");
  const { s, update } = useSession();
  return (
    <>
      <StageHeader
        n={3}
        title="Preparação do ambiente, EEG e TELL"
        description="Confira cada item e registre os detalhes logo abaixo dele."
      />
      <div className="grid gap-5">
        <CheckGroupCard groupId="amb" />
        <CheckGroupCard
          groupId="eeg"
          fields={{
            "eeg.sistema": (
              <Field k="eeg_sistema" label="Equipamento, software e identificação do sistema" />
            ),
            "eeg.parametros": (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field k="eeg_fs" label="Frequência de amostragem" />
                <Field k="eeg_filtros" label="Filtros utilizados" />
              </div>
            ),
            "eeg.touca": <Field k="eeg_touca" label="Touca ou eletrodos utilizados" />,
            "eeg.posicao": (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field k="eeg_montagem" label="Montagem" />
                <Field k="eeg_canais" label="Número de canais" />
              </div>
            ),
            "eeg.impedancia": (
              <Field
                k="eeg_limites"
                label="Impedâncias e limites de aceitação"
                hint="Registre o critério adotado e os valores relevantes."
              />
            ),
            "eeg.canais": (
              <Field
                k="eeg_problemas"
                label="Canais problemáticos e correções realizadas"
                multiline
                rows={2}
              />
            ),
            "eeg.inspecao": (
              <Field k="eeg_ruido" label="Ruído e artefatos observados" multiline rows={2} />
            ),
            "eeg.arquivo": (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field k="eeg_arquivo" label="Nome planejado do arquivo" />
                <Field k="eeg_pasta" label="Pasta de destino" />
              </div>
            ),
            "eeg.eventos": (
              <>
                <Segmented
                  label="Método de anotação dos eventos"
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: "marcador", label: "Marcador no EEG" },
                    { value: "anotacao", label: "Anotação manual" },
                    { value: "ambos", label: "Marcador e anotação" },
                    { value: "outro", label: "Outro" },
                  ]}
                />
                <Field k="eeg_metodo_eventos_desc" label="Descrição do método" multiline rows={2} />
              </>
            ),
          }}
        />
        <CheckGroupCard
          groupId="tell"
          fields={{
            "tell.app": (
              <Field
                k="tell_dispositivo"
                label="Dispositivo do TELL"
                placeholder="Identificação do aparelho"
              />
            ),
            "tell.localizacao": (
              <Field k="tell_local" label="Localização ou identificação dos registros" />
            ),
            "tell.blocos": (
              <div className="grid gap-4">
                {SPEECH_STEPS.map((step) => (
                  <Segmented<TriState>
                    key={step.key}
                    label={step.name}
                    value={s.config.tellBlocks[step.key] ?? "indefinido"}
                    disabled={!!s.experimentStartedAt}
                    onChange={(value) =>
                      update((p) => ({
                        ...p,
                        config: {
                          ...p.config,
                          tellBlocks: { ...p.config.tellBlocks, [step.key]: value },
                        },
                      }))
                    }
                    options={[
                      { value: "sim", label: "Sim" },
                      { value: "nao", label: "Não" },
                      { value: "indefinido", label: "Não definido" },
                    ]}
                  />
                ))}
              </div>
            ),
          }}
        />
      </div>
    </>
  );
}
