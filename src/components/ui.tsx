import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { useField } from "@/lib/store";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* --------------------------------- layout ---------------------------------- */

export function Card({
  eyebrow,
  title,
  description,
  right,
  children,
  className,
  id,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cx(
        "rounded-[var(--radius-card)] border border-hair bg-panel p-5 sm:p-7 lg:p-8",
        className,
      )}
    >
      {(title || eyebrow || right) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[12px] text-ash">{eyebrow}</p>}
            {title && <h2 className="text-[20px] leading-tight sm:text-[22px]">{title}</h2>}
            {description && (
              <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-steel">
                {description}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function StageHeader({
  n,
  title,
  description,
  right,
}: {
  n: number;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <p className="text-[12px] text-ash">Etapa {n} de 7</p>
        <h1 className="mt-1 text-[26px] leading-[1.15] sm:text-[32px]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-steel">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}

/* --------------------------------- buttons --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-panel hover:bg-black disabled:bg-ash/50 disabled:text-panel",
  secondary: "bg-wash text-ink-2 hover:bg-wash-2 disabled:text-ash",
  ghost: "text-ink hover:bg-wash disabled:text-ash",
  danger: "border border-alert/60 text-alert bg-panel hover:bg-alert-soft disabled:opacity-50",
  outline:
    "border border-signal/70 text-signal bg-transparent hover:bg-signal/5 disabled:opacity-50",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-pill)] text-center font-normal transition-colors disabled:cursor-not-allowed",
        size === "sm" && "min-h-9 px-3.5 text-[13px]",
        size === "md" && "min-h-11 px-4.5 text-[14px]",
        size === "lg" && "min-h-14 px-6 text-[16px]",
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: "neutral" | "blue" | "alert" | "ink" | "muted";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-wash text-ink",
    blue: "border border-signal/70 text-signal",
    alert: "border border-alert/50 text-alert bg-alert-soft/60",
    ink: "bg-ink text-panel",
    muted: "border border-hair text-steel",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] leading-5",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Notice({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: "neutral" | "blue" | "alert";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex gap-3 rounded-[18px] px-4 py-3 text-[14px] leading-relaxed",
        tone === "neutral" && "bg-wash text-steel",
        tone === "blue" && "border border-signal/40 text-ink",
        tone === "alert" && "border border-alert/40 bg-alert-soft/60 text-ink",
        className,
      )}
    >
      {icon && (
        <span
          className={cx(
            "mt-0.5 shrink-0",
            tone === "alert" ? "text-alert" : tone === "blue" ? "text-signal" : "text-steel",
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* --------------------------------- inputs ---------------------------------- */

export const inputCls =
  "w-full min-h-12 rounded-[14px] border border-black/10 bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ash outline-none transition-colors focus:border-signal disabled:bg-canvas disabled:text-steel";

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-[14px] text-ink">
        {children}
      </label>
      {hint && <p className="mt-0.5 text-[12px] leading-snug text-ash">{hint}</p>}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  className,
  multiline,
  rows = 3,
  ...rest
}: {
  label?: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
  step?: number;
  id?: string;
}) {
  const gen = useId();
  const id = rest.id ?? gen;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
      )}
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cx(inputCls, "resize-y leading-relaxed")}
          placeholder={rest.placeholder}
          disabled={rest.disabled}
          autoFocus={rest.autoFocus}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          {...rest}
        />
      )}
    </div>
  );
}

/** Text field bound to `session.fields[k]`. */
export function Field(props: {
  k: string;
  label: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [v, set] = useField(props.k);
  return <TextInput {...props} value={v} onChange={set} />;
}

export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className} role="radiogroup" aria-labelledby={label ? id : undefined}>
      {label && (
        <div className="mb-1.5">
          <p id={id} className="text-[14px] text-ink">
            {label}
          </p>
          {hint && <p className="mt-0.5 text-[12px] leading-snug text-ash">{hint}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cx(
                "min-h-10 rounded-full px-3.5 text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                on
                  ? "bg-ink text-panel"
                  : "border border-black/10 bg-white text-ink hover:border-black/25",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Field bound to the store with explicit "não avaliado" / "não se aplica" options. Empty is never treated as normal. */
export function ClinicalField({
  k,
  label,
  hint,
  options,
}: {
  k: string;
  label: string;
  hint?: string;
  options?: { value: string; label: string }[];
}) {
  const [state, setState] = useField(`${k}__estado`);
  const [text, setText] = useField(k);
  const opts = options ?? [{ value: "registrado", label: "Registrar" }];
  const all = [
    ...opts,
    { value: "nao_avaliado", label: "Não avaliado" },
    { value: "nao_se_aplica", label: "Não se aplica" },
  ];
  const showText = state !== "" && state !== "nao_avaliado" && state !== "nao_se_aplica";
  return (
    <div className="border-t border-hair pt-4 first:border-t-0 first:pt-0">
      <Segmented label={label} hint={hint} value={state} options={all} onChange={setState} />
      {state === "" && <p className="mt-1.5 text-[12px] text-ash">Sem informação registrada.</p>}
      {showText && (
        <TextInput
          className="mt-2.5"
          value={text}
          onChange={setText}
          multiline
          rows={2}
          placeholder="Descrição registrada pela equipe"
        />
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[14px] text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-ash">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-ink" : "bg-black/15",
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
        <span className="sr-only">{checked ? "Ativado" : "Desativado"}</span>
      </button>
    </div>
  );
}

/* --------------------------------- modal ----------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Depends only on `open`: parents re-render every second (clock), which must not steal focus.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(
        "[autofocus], textarea, input, select, button:not([data-close])",
      );
      el?.focus();
    }, 10);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cx(
          "flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-panel sm:rounded-[28px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 className="text-[20px] leading-tight">{title}</h2>
          <button
            data-close
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-steel hover:bg-wash"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-[15px] leading-relaxed">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-hair px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-hair py-2.5 first:border-t-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[13px] text-steel sm:w-56">{k}</dt>
      <dd className="min-w-0 break-words text-[14px] text-ink">
        {v || <span className="text-ash">Não informado</span>}
      </dd>
    </div>
  );
}
