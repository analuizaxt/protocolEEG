import { STEP_COLORS, CONDITION_LABEL } from "@/lib/protocol";
import type { StepDef } from "@/lib/types";

export function ColorDot({ step, size = 12 }: { step: StepDef; size?: number }) {
  const c = STEP_COLORS[step.color];
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: c.swatch }}
    />
  );
}

export function SequenceList({ steps }: { steps: StepDef[] }) {
  const total = steps.reduce((a, s) => a + s.minutes, 0);
  return (
    <div>
      <ol className="overflow-hidden rounded-[18px] border border-hair">
        {steps.map((st, i) => (
          <li
            key={st.key}
            className="flex items-center gap-3 border-t border-hair px-4 py-2.5 first:border-t-0"
          >
            <span className="tabular w-6 shrink-0 text-[13px] text-steel">{i + 1}</span>
            <ColorDot step={st} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-snug">
                {st.name}
                {st.detail && <span className="text-steel"> — {st.detail}</span>}
              </p>
              <p className="text-[12px] text-ash">
                {CONDITION_LABEL[st.condition]} · {STEP_COLORS[st.color].label}
              </p>
            </div>
            <span className="tabular shrink-0 text-[13px] text-steel">{st.minutes} min</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[13px] text-steel">
        Total planejado: <span className="tabular text-ink">{total} minutos</span> — sem preparação,
        transições ou interrupções.
      </p>
    </div>
  );
}
