import { useState, useEffect, useCallback, useRef } from "react";

interface PWAState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
  close: () => void;
}

/**
 * Hook for managing PWA lifecycle — update prompts and offline readiness.
 *
 * Uses the `prompt` registration type so the user controls when the new
 * service worker activates (avoids unexpected reloads during vault operations).
 */
export function usePWA(): PWAState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function register() {
      try {
        const { registerSW } = await import("virtual:pwa-register");

        const updateSW = registerSW({
          immediate: true,
          onOfflineReady() {
            setOfflineReady(true);
          },
          onNeedRefresh() {
            setNeedRefresh(true);
          },
        });

        updateSWRef.current = updateSW;
      } catch {
        // SW registration may fail in dev or unsupported contexts.
      }
    }

    register();
  }, []);

  const updateServiceWorker = useCallback(() => {
    updateSWRef.current?.(true);
    setNeedRefresh(false);
  }, []);

  const close = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  return { needRefresh, offlineReady, updateServiceWorker, close };
}
