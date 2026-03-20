/**
 * Copy text to the clipboard and optionally clear it after a timeout.
 *
 * Uses the Clipboard API which requires a secure context (HTTPS or localhost).
 * The auto-clear writes an empty string to the clipboard after the given delay,
 * preventing sensitive values (passwords, CVVs) from lingering.
 */
export async function copyToClipboard(
  text: string,
  autoClearMs?: number,
): Promise<void> {
  await navigator.clipboard.writeText(text);

  if (autoClearMs != null && autoClearMs > 0) {
    setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {
        // Best-effort clear -- ignore errors (e.g. page no longer focused).
      });
    }, autoClearMs);
  }
}
