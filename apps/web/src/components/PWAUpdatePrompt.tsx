import { CheckCircle } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { Button } from "./ui/button";

interface PWAUpdatePromptProps {
  needRefresh: boolean;
  offlineReady: boolean;
  onUpdate: () => void;
  onClose: () => void;
}

export function PWAUpdatePrompt({
  needRefresh,
  offlineReady,
  onUpdate,
  onClose,
}: PWAUpdatePromptProps) {
  const { t } = useTranslation();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      {offlineReady && (
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-400" />
          <p className="text-sm text-card-foreground">{t("pwa.offlineReady")}</p>
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            {t("common.close")}
          </Button>
        </div>
      )}

      {needRefresh && (
        <div className="space-y-3">
          <p className="text-sm text-card-foreground">{t("pwa.newVersion")}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onUpdate}>
              {t("pwa.update")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("pwa.later")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
