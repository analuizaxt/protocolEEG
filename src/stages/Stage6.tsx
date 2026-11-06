import { Info } from "lucide-react";
import { CheckGroupCard } from "@/components/Checklist";
import { Field, Notice, StageHeader } from "@/components/ui";

export function Stage6() {
  return (
    <>
      <StageHeader
        n={6}
        title="Verificações após o registro"
        description="Confira os registros, os arquivos, o participante e os materiais utilizados."
      />
      <div className="grid gap-5">
        <CheckGroupCard groupId="enc">
          <Field
            k="enc_estado_final"
            label="Estado final do EEG e do TELL"
            multiline
            rows={2}
            className="mt-3"
          />
        </CheckGroupCard>
        <CheckGroupCard groupId="arq">
          <Notice icon={<Info size={18} />} className="mb-4">
            Informe nomes ou identificadores dos arquivos. Eles aparecem no resumo e na exportação.
          </Notice>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              k="arq_eeg"
              label="Arquivo(s) de EEG"
              multiline
              rows={2}
              placeholder="Nome e pasta"
            />
            <Field
              k="arq_tell"
              label="Registro(s) do TELL"
              multiline
              rows={2}
              placeholder="Identificadores"
            />
            <Field k="arq_backup" label="Cópia de segurança" placeholder="Local ou referência" />
            <Field k="arq_outros" label="Outros arquivos" />
          </div>
        </CheckGroupCard>
        <CheckGroupCard groupId="pos">
          <Field
            k="pos_providencias"
            label="Intercorrências e providências após a coleta"
            multiline
            rows={2}
          />
        </CheckGroupCard>
      </div>
    </>
  );
}
