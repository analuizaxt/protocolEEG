import { Info } from "lucide-react";
import { CheckGroupCard } from "@/components/Checklist";
import { Card, ClinicalField, Field, Notice, StageHeader } from "@/components/ui";

export function Stage2() {
  return (
    <>
      <StageHeader
        n={2}
        title="Conferência do participante"
        description="Confira o participante e registre as condições relevantes para a coleta."
      />
      <div className="grid gap-5">
        <CheckGroupCard groupId="part" />
        <Card title="Medicação" eyebrow="Registro informado">
          <Notice icon={<Info size={18} />} className="mb-5">
            O website apenas registra o que a equipe informar. Ele não deduz o estado ON/OFF pelo
            tempo desde a última dose e não orienta suspensão, atraso ou mudança de medicação.
          </Notice>
          <div className="grid gap-4">
            <ClinicalField k="med_relevantes" label="Medicações relevantes informadas" />
            <ClinicalField
              k="med_ultima"
              label="Dose e horário da última tomada"
              hint="Quando aplicável."
            />
            <ClinicalField
              k="med_estado"
              label="Estado medicamentoso registrado pela equipe"
              options={[
                { value: "ON", label: "ON" },
                { value: "OFF", label: "OFF" },
                { value: "outro", label: "Outro" },
              ]}
            />
          </div>
        </Card>
        <Card
          title="Condições observadas"
          eyebrow="Campos sem exigência definida aceitam “Não avaliado” ou “Não se aplica”"
        >
          <div className="grid gap-4">
            <ClinicalField k="cond_sono" label="Sono recente e sonolência atual" />
            <ClinicalField k="cond_fadiga" label="Fadiga, desconforto e dor" />
            <ClinicalField
              k="cond_motor"
              label="Tremor, discinesia ou outras manifestações motoras observadas"
            />
            <ClinicalField
              k="cond_fala"
              label="Dificuldades de fala, audição ou compreensão que interfiram na execução"
            />
          </div>
          <Field k="cond_outras" label="Outras observações" multiline className="mt-5" />
        </Card>
      </div>
    </>
  );
}
