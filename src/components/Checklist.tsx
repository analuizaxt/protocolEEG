import { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { CHECK_GROUPS, type CheckDef } from "@/lib/protocol";
import { getCheck, isRequired, setCheckMeta, setCheckStatus } from "@/lib/session";
import { useSession } from "@/lib/store";
import { fmtClockRef } from "@/lib/time";
import type { CheckStatus } from "@/lib/types";
import { Badge, Card, Segmented, TextInput, Toggle, cx } from "./ui";

export function CheckItem({ def, children }: { def: CheckDef; children?: React.ReactNode }) {
  const { s, update } = useSession();
  const st = getCheck(s, def.id);
  const [open, setOpen] = useState(false);
  const req = isRequired(s, def);
  const setStatus = (status: CheckStatus) =>
    update((p) => setCheckStatus(p, def.id, status, Date.now()));
  const done = st.status === "concluido";
  const na = st.status === "na";
  return (
    <li className="border-t border-hair first:border-t-0">
      <div className="flex items-start gap-3 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${def.text} — ${done ? "concluído" : na ? "não se aplica" : "pendente"}`}
          onClick={() => setStatus(done ? "pendente" : "concluido")}
          className={cx(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors",
            done && "border-ink bg-ink text-panel",
            na && "border-dashed border-ash bg-canvas text-steel",
            !done && !na && "border-black/25 bg-white hover:border-ink",
          )}
        >
          {done ? <Check size={16} strokeWidth={2.2} /> : na ? <Minus size={14} /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cx(
              "text-[15px] leading-snug",
              na && "text-steel line-through decoration-ash/60",
            )}
          >
            {def.text}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {def.critical ? (
              <Badge tone="blue">Crítico</Badge>
            ) : req ? (
              <Badge tone="muted">Obrigatório nesta sessão</Badge>
            ) : (
              <Badge tone="muted">Complementar</Badge>
            )}
            <span className="text-[12px] text-steel">
              {done
                ? `Concluído às ${fmtClockRef(st.completedAt, s.createdAt)}`
                : na
                  ? "Não se aplica"
                  : "Pendente"}
              {st.responsible && ` · ${st.responsible}`}
            </span>
            {st.note && <span className="text-[12px] text-ash">· com observação</span>}
          </div>
          {def.hint && <p className="mt-1 text-[12px] text-ash">{def.hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-steel hover:bg-wash"
          aria-label={open ? "Ocultar detalhes do item" : "Detalhes do item"}
        >
          <ChevronDown size={18} className={cx("transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {children && (
        <fieldset disabled={na} className="mb-5 ml-11 grid min-w-0 gap-4">
          {children}
        </fieldset>
      )}
      {open && (
        <div className="mb-4 ml-11 grid gap-3 rounded-[18px] bg-canvas p-4">
          <Segmented
            label="Estado"
            value={st.status}
            onChange={setStatus}
            options={[
              { value: "pendente", label: "Pendente" },
              { value: "concluido", label: "Concluído" },
              ...(def.critical ? [] : [{ value: "na" as const, label: "Não se aplica" }]),
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Responsável"
              value={st.responsible}
              onChange={(v) => update((p) => setCheckMeta(p, def.id, { responsible: v }))}
              placeholder="Opcional"
            />
            <TextInput
              label="Observação"
              value={st.note}
              onChange={(v) => update((p) => setCheckMeta(p, def.id, { note: v }))}
              placeholder="Opcional"
            />
          </div>
          {!def.critical && (
            <Toggle
              label="Obrigatório nesta sessão"
              hint="Itens complementares não bloqueiam o início, mas ficam visíveis no resumo."
              checked={req}
              onChange={(v) => update((p) => setCheckMeta(p, def.id, { required: v }))}
            />
          )}
          {def.critical && (
            <p className="text-[12px] text-steel">
              Item crítico: não pode ser marcado como “não se aplica”.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function CheckGroupCard({
  groupId,
  eyebrow,
  description,
  children,
  fields,
}: {
  groupId: string;
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
  fields?: Record<string, React.ReactNode>;
}) {
  const { s } = useSession();
  const g = CHECK_GROUPS.find((x) => x.id === groupId)!;
  const applicable = g.items.filter((i) => getCheck(s, i.id).status !== "na");
  const done = applicable.filter((i) => getCheck(s, i.id).status === "concluido").length;
  return (
    <Card
      eyebrow={eyebrow}
      title={g.title}
      description={description}
      right={
        <span className="tabular rounded-full bg-wash px-3 py-1 text-[13px] text-steel">
          {done}/{applicable.length} checks
        </span>
      }
    >
      <ul>
        {g.items.map((d) => (
          <CheckItem key={d.id} def={d}>
            {fields?.[d.id]}
          </CheckItem>
        ))}
      </ul>
      {children && <div className="mt-5 border-t border-hair pt-5">{children}</div>}
    </Card>
  );
}
