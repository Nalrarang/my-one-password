import { Loader2 } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { Button } from "./ui/button";

interface NativeUpdatePromptProps {
  updateAvailable: boolean;
  version: string | null;
  installing: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/**
 * Bottom-right prompt shown when the Tauri native app has an update ready.
 * Mirrors {@link PWAUpdatePrompt} styling; reuses the pwa.* strings.
 */
export function NativeUpdatePrompt({
  updateAvailable,
  version,
  installing,
  onInstall,
  onDismiss,
}: NativeUpdatePromptProps) {
  const { t } = useTranslation();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="space-y-3">
        <p className="text-sm text-card-foreground">
          {t("pwa.newVersion")}
          {version ? ` (v${version})` : ""}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onInstall} disabled={installing}>
            {installing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("pwa.update")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={installing}>
            {t("pwa.later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
