import { useState, useRef } from "react";
import type { ItemType, VaultItemData } from "@my-one-password/shared";

import type { ImportedItem } from "../lib/onepassword-import";

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
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-100">Import from 1Password</h1>
      </header>

      {/* Instructions */}
      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h2 className="text-sm font-semibold text-slate-200">How to export from 1Password</h2>
        <ol className="mt-2 space-y-1 text-sm text-slate-400">
          <li>1. Open 1Password desktop app</li>
          <li>2. File &rarr; Export &rarr; select vault</li>
          <li>3. Choose <span className="font-mono text-slate-300">.1pux</span> format</li>
          <li>4. Upload the exported file below</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Your data is processed entirely in the browser. The .1pux file is never sent to a server.
        </p>
      </div>

      {/* File upload */}
      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".1pux"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select .1pux file"
        />

        {parsedItems.length === 0 && status !== "done" && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "parsing"}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/30 px-6 py-10 text-sm text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {status === "parsing" ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing {fileName}...
              </>
            ) : (
              <>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Select .1pux file
              </>
            )}
          </button>
        )}
      </div>

      {/* Parse results */}
      {parsedItems.length > 0 && status !== "done" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Found {parsedItems.length} items in {fileName}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {counts.login && (
                <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-300">
                  {counts.login} Logins
                </span>
              )}
              {counts.card && (
                <span className="rounded-full bg-purple-900/50 px-3 py-1 text-xs font-medium text-purple-300">
                  {counts.card} Cards
                </span>
              )}
              {counts.note && (
                <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs font-medium text-green-300">
                  {counts.note} Notes
                </span>
              )}
              {counts.identity && (
                <span className="rounded-full bg-amber-900/50 px-3 py-1 text-xs font-medium text-amber-300">
                  {counts.identity} Identities
                </span>
              )}
            </div>
          </div>

          {/* Import button */}
          <button
            type="button"
            onClick={handleImport}
            disabled={status === "importing"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
          >
            {status === "importing" ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing {progress.current}/{progress.total}...
              </>
            ) : (
              `Import ${parsedItems.length} items`
            )}
          </button>

          {/* Progress bar */}
          {status === "importing" && (
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <div className="mt-6 rounded-lg border border-green-800 bg-green-900/30 p-6 text-center">
          <svg className="mx-auto h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="mt-3 text-sm font-semibold text-green-300">
            Successfully imported {progress.total} items!
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-600"
          >
            Back to Vault
          </button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-800 bg-amber-900/20 p-4">
          <h3 className="text-sm font-semibold text-amber-300">
            {status === "error" ? "Errors" : "Warnings"} ({errors.length})
          </h3>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-400">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
