import { ShieldAlert } from "lucide-react";
import { Card, Field, Notice, StageHeader } from "@/components/ui";
import { useSession } from "@/lib/store";

const CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;

export function Stage1() {
  const { s } = useSession();
  const code = s.fields.codigo_participante ?? "";
  const looksDirect = CPF.test(code) || /^[A-Za-zÀ-ú]+\s+[A-Za-zÀ-ú]+/.test(code.trim());

  return (
    <>
      <StageHeader
        n={1}
        title="Identificação da sessão"
        description="Use somente códigos pseudonimizados. Evite nome completo, CPF, endereço ou outros identificadores diretos."
      />
      <div className="grid gap-5">
        <Card title="Identificação da sessão" eyebrow="Pseudonimizada">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              k="codigo_participante"
              label="Código pseudonimizado do participante"
              placeholder="Ex.: PD-014"
            />
            <Field k="codigo_sessao" label="Código ou número da sessão" placeholder="Ex.: S01" />
            <Field
              k="data_coleta"
              label="Data da coleta"
              type="date"
              hint="Preenchida pelo dispositivo; editável."
            />
            <Field k="pesquisador" label="Pesquisador responsável" />
            <Field k="local" label="Local ou sala" />
            <Field
              k="operador_eeg"
              label="Operador do EEG"
              hint="Quando diferente do responsável."
            />
            <Field
              k="operador_tell"
              label="Operador do TELL"
              hint="Quando diferente do responsável."
            />
            <Field
              k="versao_protocolo"
              label="Versão do protocolo"
              placeholder="Ex.: v1.2 aprovada em …"
            />
          </div>
          {looksDirect && (
            <Notice tone="alert" icon={<ShieldAlert size={18} />} className="mt-4">
              O código informado parece conter um identificador direto (nome ou CPF). Use o código
              pseudonimizado do estudo.
            </Notice>
          )}
          <Field k="obs_iniciais" label="Observações iniciais" multiline className="mt-4" />
        </Card>
      </div>
    </>
  );
}
