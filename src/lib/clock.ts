import { useSyncExternalStore } from "react";

let current = Date.now();
const listeners = new Set<() => void>();
let lastWall = Date.now();
let lastPerf = performance.now();
let driftHandler: ((driftMs: number, at: number) => void) | null = null;

/** Single ticker for the whole app. Durations are always computed from timestamps, never by counting ticks. */
setInterval(() => {
  const wall = Date.now();
  const perf = performance.now();
  // Compare the civil clock against the monotonic clock to detect clock adjustments.
  const drift = wall - lastWall - (perf - lastPerf);
  lastWall = wall;
  lastPerf = perf;
  if (Math.abs(drift) > 3000 && driftHandler) driftHandler(drift, wall);
  if (Math.floor(wall / 1000) !== Math.floor(current / 1000)) {
    current = wall;
    listeners.forEach((l) => l());
  }
}, 250);

export function onClockDrift(fn: ((driftMs: number, at: number) => void) | null) {
  driftHandler = fn;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => current);
}
