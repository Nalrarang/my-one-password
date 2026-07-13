import { useState, useEffect, useCallback, useRef } from "react";

interface NativeUpdaterState {
  updateAvailable: boolean;
  version: string | null;
  installing: boolean;
  install: () => void;
  dismiss: () => void;
}

/** True only inside the Tauri native shell (window.isTauri is injected there). */
function isTauri(): boolean {
  return typeof window !== "undefined" && "isTauri" in window && Boolean((window as { isTauri?: boolean }).isTauri);
}

/**
 * Checks for a native app update via the Tauri updater (desktop only).
 *
 * No-op in the browser/PWA — there the service worker handles updates
 * (see {@link usePWA}). The updater downloads and verifies signed artifacts
 * in the Rust layer, so it is unaffected by the webview CSP.
 */
export function useNativeUpdater(): NativeUpdaterState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  // Holds the pending Update handle returned by check().
  const updateRef = useRef<{ version: string; downloadAndInstall: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!cancelled && update) {
          updateRef.current = update;
          setVersion(update.version);
          setUpdateAvailable(true);
        }
      } catch {
        // Updater unavailable (dev, unsupported platform, offline) — ignore.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const install = useCallback(() => {
    const update = updateRef.current;
    if (!update) return;
    setInstalling(true);
    (async () => {
      try {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch {
        // Install failed — let the user retry rather than leaving a stuck spinner.
        setInstalling(false);
      }
    })();
  }, []);

  const dismiss = useCallback(() => setUpdateAvailable(false), []);

  return { updateAvailable, version, installing, install, dismiss };
}
