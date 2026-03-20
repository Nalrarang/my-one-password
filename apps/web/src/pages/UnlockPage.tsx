import { useState } from "react";
import { unlock, logOut } from "../services/auth";

export function UnlockPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await unlock(masterPassword);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlock vault.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logOut();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
            Vault Locked
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your master password to unlock.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="unlock-password"
              className="block text-sm font-medium text-slate-300"
            >
              Master Password
            </label>
            <input
              id="unlock-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Enter your master password"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Unlocking...
              </>
            ) : (
              "Unlock"
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-slate-400 hover:text-slate-300"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
