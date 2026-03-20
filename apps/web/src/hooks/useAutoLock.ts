import { useEffect, useRef, useCallback } from "react";
import { CRYPTO_CONFIG } from "@my-one-password/shared";
import { useAuthStore } from "../stores/auth-store";

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
];

/**
 * Automatically locks the vault after a period of user inactivity.
 *
 * - Listens for mouse, keyboard, touch, and scroll events to detect activity.
 * - Resets the inactivity timer on every detected event.
 * - Uses `CRYPTO_CONFIG.AUTO_LOCK_TIMEOUT` (15 minutes) as the threshold.
 * - Only active when the vault is unlocked.
 * - Optionally locks when the page visibility changes to hidden.
 *
 * @param lockOnHidden  If `true`, lock the vault when the tab becomes hidden.
 *                      Defaults to `false`.
 */
export function useAutoLock(lockOnHidden = false): void {
  const status = useAuthStore((s) => s.status);
  const lockVault = useAuthStore((s) => s.lock);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      lockVault();
    }, CRYPTO_CONFIG.AUTO_LOCK_TIMEOUT);
  }, [lockVault]);

  useEffect(() => {
    if (status !== "unlocked") {
      // Clear any running timer when the vault is not unlocked.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start the inactivity timer.
    resetTimer();

    // Reset on user activity.
    const onActivity = () => {
      resetTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { passive: true });
    }

    // Optionally lock when page is hidden.
    const onVisibilityChange = () => {
      if (lockOnHidden && document.hidden) {
        lockVault();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, resetTimer, lockOnHidden, lockVault]);
}
