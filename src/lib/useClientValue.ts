import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a value that can only be computed on the client (e.g. from `window`)
 * in a hydration-safe way. Returns `serverFallback` during SSR and the first
 * client render, then the real client value — without calling setState inside
 * an effect.
 */
export function useClientValue<T>(getClientSnapshot: () => T, serverFallback: T): T {
  return useSyncExternalStore(noopSubscribe, getClientSnapshot, () => serverFallback);
}
