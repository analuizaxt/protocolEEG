import { useState } from "react";
import { fmtDateTime, fromDateTimeInput, toDateTimeInput } from "@/lib/time";
import { Button, Modal, TextInput } from "./ui";

export function CorrectionModal({
  open,
  onClose,
  target,
  original,
  onConfirm,
  validate,
}: {
  open: boolean;
  onClose: () => void;
  target: string;
  original: number | null;
  onConfirm: (value: number, justification: string) => void;
  validate?: (value: number) => string | null;
}) {
  const [value, setValue] = useState(() => toDateTimeInput(original ?? Date.now()));
  const [just, setJust] = useState("");
  const parsed = fromDateTimeInput(value);
  const error = parsed != null ? validate?.(parsed) : null;
  const ok = parsed != null && !error && just.trim().length > 2;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Corrigir horário"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!ok}
            onClick={() => {
              if (parsed != null) onConfirm(parsed, just.trim());
              onClose();
            }}
          >
            Registrar correção
          </Button>
        </>
      }
    >
      <p className="text-steel">
        {target}. O valor original é preservado na linha do tempo e na exportação, junto com o novo
        valor e a justificativa.
      </p>
      <p className="mt-3 text-[14px]">
        Valor atual: <span className="tabular">{fmtDateTime(original)}</span>
      </p>
      <div className="mt-4 grid gap-3">
        <TextInput
          label="Novo horário (com segundos)"
          type="datetime-local"
          step={1}
          value={value}
          onChange={setValue}
        />
        <TextInput
          label="Justificativa (obrigatória)"
          multiline
          rows={2}
          value={just}
          onChange={setJust}
          placeholder="Ex.: horário anotado no EEG difere do registrado aqui"
        />
        {error && (
          <p role="alert" className="text-[13px] text-alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
