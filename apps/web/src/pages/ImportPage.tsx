import { useState, useRef } from "react";
import type { ItemType, VaultItemData } from "@my-one-password/shared";
import { ArrowLeft, Upload, Loader2, CheckCircle } from "lucide-react";

import type { ImportedItem } from "../lib/onepassword-import";
import { useTranslation } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportPageProps {
  onImport: (items: Array<{ itemType: ItemType; data: VaultItemData; favorite: boolean }>) => Promise<void>;
  onBack: () => void;
}

type ImportStatus = "idle" | "parsing" | "importing" | "done" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportPage({ onImport, onBack }: ImportPageProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parsedItems, setParsedItems] = useState<ImportedItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("parsing");
    setErrors([]);
    setParsedItems([]);

    try {
      const buffer = await file.arrayBuffer();
      // Dynamic import to avoid loading ZIP parser until needed
      const { parseOnePux } = await import("../lib/onepassword-import");
      const result = parseOnePux(buffer);

      setParsedItems(result.items);
      setErrors(result.errors);
      setStatus(result.items.length > 0 ? "idle" : "error");

      if (result.items.length === 0 && result.errors.length === 0) {
        setErrors(["No items found in the .1pux file."]);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Failed to parse file."]);
      setStatus("error");
    }
  }

  async function handleImport() {
    if (parsedItems.length === 0) return;

    setStatus("importing");
    setProgress({ current: 0, total: parsedItems.length });

    try {
      // Import in batches of 5 for progress feedback
      const batchSize = 5;
      for (let i = 0; i < parsedItems.length; i += batchSize) {
        const batch = parsedItems.slice(i, i + batchSize);
        await onImport(batch);
        setProgress({ current: Math.min(i + batchSize, parsedItems.length), total: parsedItems.length });
      }
      setStatus("done");
    } catch (err) {
      setErrors((prev) => [...prev, err instanceof Error ? err.message : "Import failed."]);
      setStatus("error");
    }
  }

  // Count by type
  const counts = parsedItems.reduce(
    (acc, item) => {
      acc[item.itemType] = (acc[item.itemType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("form.goBack")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{t("import.title")}</h1>
      </header>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("import.howTo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li>{t("import.step1")}</li>
            <li>{t("import.step2")}</li>
            <li>{t("import.step3")}</li>
            <li>{t("import.step4")}</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground/70">
            {t("import.privacy")}
          </p>
        </CardContent>
      </Card>

      {/* File upload */}
      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".1pux"
          onChange={handleFileSelect}
          className="hidden"
          aria-label={t("import.selectFile")}
        />

        {parsedItems.length === 0 && status !== "done" && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "parsing"}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/30 px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {status === "parsing" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("import.parsing")} {fileName}...
              </>
            ) : (
              <>
                <Upload className="h-6 w-6" />
                {t("import.selectFile")}
              </>
            )}
          </button>
        )}
      </div>

      {/* Parse results */}
      {parsedItems.length > 0 && status !== "done" && (
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {parsedItems.length} {t("import.found")} - {fileName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {counts.login && (
                  <Badge variant="secondary">
                    {counts.login} {t("vault.logins")}
                  </Badge>
                )}
                {counts.card && (
                  <Badge variant="secondary">
                    {counts.card} {t("vault.cards")}
                  </Badge>
                )}
                {counts.note && (
                  <Badge variant="secondary">
                    {counts.note} {t("vault.notes")}
                  </Badge>
                )}
                {counts.identity && (
                  <Badge variant="secondary">
                    {counts.identity} {t("vault.identities")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import button */}
          <Button
            onClick={handleImport}
            disabled={status === "importing"}
            className="w-full"
            size="lg"
          >
            {status === "importing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("import.importing")} {progress.current}/{progress.total}...
              </>
            ) : (
              `${parsedItems.length} ${t("import.importButton")}`
            )}
          </Button>

          {/* Progress bar */}
          {status === "importing" && (
            <Progress value={(progress.current / progress.total) * 100} />
          )}
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <Card className="mt-6 border-green-800 bg-green-900/30">
          <CardContent className="p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-green-400" />
            <p className="mt-3 text-sm font-semibold text-green-300">
              {progress.total} {t("import.success")}
            </p>
            <Button
              onClick={onBack}
              className="mt-4 bg-green-700 text-white hover:bg-green-600"
            >
              {t("import.backToVault")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="mt-4 border-amber-800 bg-amber-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-300">
              {status === "error" ? t("import.errors") : t("import.warnings")} ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-400">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
