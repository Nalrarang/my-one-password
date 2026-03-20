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
  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-lg">
      {offlineReady && (
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 shrink-0 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="text-sm text-slate-300">App ready to work offline.</p>
          <button
            onClick={onClose}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300"
          >
            Close
          </button>
        </div>
      )}

      {needRefresh && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            A new version is available.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onUpdate}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Update now
            </button>
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
