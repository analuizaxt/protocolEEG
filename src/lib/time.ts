const pad = (n: number, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");

export function fmtClock(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtDate(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${fmtDate(ms)} ${fmtClock(ms)}`;
}

export function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/** Time with seconds; adds the date when it differs from the reference day (e.g. after midnight). */
export function fmtClockRef(ms: number | null | undefined, ref: number): string {
  if (ms == null) return "—";
  return sameDay(ms, ref) ? fmtClock(ms) : `${fmtClock(ms)} (${fmtDate(ms).slice(0, 5)})`;
}

export function fmtDur(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return neg ? `−${body}` : body;
}

export function fmtDiff(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (Math.abs(ms) < 1000) return "00:00";
  return ms > 0 ? `+${fmtDur(ms)}` : fmtDur(ms);
}

export function utcOffset(ms: number): string {
  const off = -new Date(ms).getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

/** ISO 8601 local time with explicit UTC offset, e.g. 2025-03-04T14:05:09.120-03:00 */
export function isoLocal(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}${utcOffset(ms)}`;
}

export function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateTimeInput(ms: number): string {
  const d = new Date(ms);
  return `${toDateInput(ms)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fromDateTimeInput(v: string): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

export function timeZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "desconhecido";
  } catch {
    return "desconhecido";
  }
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
