import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createSession, reconcilePreparation } from "./session";
import type { SessionState } from "./types";

interface Store {
  s: SessionState;
  update: (fn: (s: SessionState) => SessionState) => void;
  replace: (s: SessionState) => void;
}

const Ctx = createContext<Store | null>(null);

/** Session data lives only in React memory: no localStorage, sessionStorage, IndexedDB or network. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<SessionState>(() => createSession());
  const update = useCallback(
    (fn: (s: SessionState) => SessionState) => setS((prev) => reconcilePreparation(prev, fn(prev))),
    [],
  );
  const replace = useCallback((next: SessionState) => setS(next), []);
  const value = useMemo(() => ({ s, update, replace }), [s, update, replace]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("SessionProvider ausente");
  return v;
}

export function useField(key: string): [string, (v: string) => void] {
  const { s, update } = useSession();
  const set = useCallback(
    (v: string) => update((p) => ({ ...p, fields: { ...p.fields, [key]: v } })),
    [key, update],
  );
  return [s.fields[key] ?? "", set];
}
