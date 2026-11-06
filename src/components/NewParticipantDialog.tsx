import { Button, Modal } from "./ui";

export function NewParticipantDialog({
  open,
  onClose,
  onExportThenClear,
  onClear,
  exportRequested,
}: {
  open: boolean;
  onClose: () => void;
  onExportThenClear: () => void;
  onClear: () => void;
  exportRequested: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo participante"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onClear}>
            Limpar sem exportar
          </Button>
          <Button variant="primary" onClick={exportRequested ? onClear : onExportThenClear}>
            {exportRequested
              ? "Confirmei o arquivo — limpar sessão"
              : "Exportar resumo e depois limpar"}
          </Button>
        </>
      }
    >
      <p className="text-steel">
        Os dados desta sessão existem apenas nesta página e serão apagados. Uma nova sessão vazia
        será iniciada.
      </p>
      <p className="mt-3 text-[13px] text-ash">
        {exportRequested
          ? "O download foi solicitado. O navegador não confirma que o arquivo foi salvo. Verifique o resumo recebido antes de limpar. Os dados continuam disponíveis."
          : "Se a exportação falhar, nada será apagado. Após iniciar o download, confirme o recebimento do arquivo para limpar."}
      </p>
    </Modal>
  );
}
