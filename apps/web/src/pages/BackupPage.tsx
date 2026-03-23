import { useState, useRef } from "react";
import {
  ArrowLeft,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import { useTranslation } from "../lib/i18n";
import { useAuthStore } from "../stores/auth-store";
import { useVaultStore } from "../stores/vault-store";
import { exportVault, importBackup, downloadBlob } from "../lib/backup";
import type { BackupData } from "../lib/backup";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupPageProps {
  onBack: () => void;
}

type ExportStatus = "idle" | "exporting" | "done" | "error";
type ImportStatus =
  | "idle"
  | "parsing"
  | "parsed"
  | "importing"
  | "done"
  | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackupPage({ onBack }: BackupPageProps) {
  const { t } = useTranslation();
  const items = useVaultStore((s) => s.items);
  const addItem = useVaultStore((s) => s.addItem);
  const vaultKey = useAuthStore((s) => s.vaultKey);

  // Export state
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  // Import state
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupData | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Export handler
  // -------------------------------------------------------------------------

  async function handleExport() {
    if (!vaultKey) return;

    setExportStatus("exporting");
    setExportError(null);

    try {
      const blob = await exportVault(items, vaultKey);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      downloadBlob(blob, `my-one-password-backup-${timestamp}.my1p`);
      setExportStatus("done");
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : t("auth.unexpectedError"),
      );
      setExportStatus("error");
    }
  }

  // -------------------------------------------------------------------------
  // Import handlers
  // -------------------------------------------------------------------------

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vaultKey) return;

    setImportStatus("parsing");
    setImportError(null);
    setBackupPreview(null);

    try {
      const data = await importBackup(file, vaultKey);
      setBackupPreview(data);
      setImportStatus("parsed");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : t("backup.invalidFile"),
      );
      setImportStatus("error");
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!backupPreview) return;

    setImportStatus("importing");
    setImportError(null);
    setImportedCount(0);

    try {
      for (const item of backupPreview.items) {
        await addItem(
          item.itemType as Parameters<typeof addItem>[0],
          item.data,
          item.favorite,
        );
        setImportedCount((prev) => prev + 1);
      }
      setImportStatus("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : t("auth.unexpectedError"),
      );
      setImportStatus("error");
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
        <h1 className="text-xl font-bold text-foreground">
          {t("backup.title")}
        </h1>
      </header>

      {/* Export section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5" />
            {t("backup.export")}
          </CardTitle>
          <CardDescription>{t("backup.exportDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={exportStatus === "exporting" || items.length === 0}
            className="w-full"
          >
            {exportStatus === "exporting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("backup.exporting")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("backup.export")} ({items.length} {t("backup.itemCount")})
              </>
            )}
          </Button>

          {exportStatus === "done" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="h-4 w-4" />
              {t("backup.exportSuccess")}
            </p>
          )}

          {exportError && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {exportError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            {t("backup.import")}
          </CardTitle>
          <CardDescription>{t("backup.importDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".my1p"
            onChange={handleFileSelect}
            className="hidden"
            aria-label={t("backup.selectFile")}
          />

          {importStatus !== "done" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus === "parsing" || importStatus === "importing"}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/30 px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {importStatus === "parsing" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("backup.importing")}
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  {t("backup.selectFile")}
                </>
              )}
            </button>
          )}

          {/* Preview */}
          {backupPreview && importStatus === "parsed" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">
                  {backupPreview.itemCount} {t("backup.itemCount")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("backup.exportedAt")}{" "}
                  {new Date(backupPreview.exportedAt).toLocaleString()}
                </p>
              </div>

              <Button
                onClick={handleImport}
                className="w-full"
                size="lg"
              >
                <Upload className="h-4 w-4" />
                {t("backup.confirmImport")} ({backupPreview.itemCount}{" "}
                {t("backup.itemCount")})
              </Button>
            </div>
          )}

          {/* Importing progress */}
          {importStatus === "importing" && backupPreview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("backup.importing")} {importedCount}/{backupPreview.itemCount}
            </div>
          )}

          {/* Success */}
          {importStatus === "done" && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-green-800 bg-green-900/30 p-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
              <p className="text-sm font-semibold text-green-300">
                {importedCount} {t("backup.importSuccess")}
              </p>
              <Button onClick={onBack} variant="secondary">
                {t("import.backToVault")}
              </Button>
            </div>
          )}

          {/* Error */}
          {importError && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {importError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
