import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { unlock, logOut } from "../services/auth";
import { useTranslation } from "../lib/i18n";

export function UnlockPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("auth.failedUnlock"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-[40px_36px] shadow-[var(--shadow)]"
      >
        <div className="mb-[26px] flex flex-col items-center gap-1.5">
          <div className="mb-1.5 grid h-[60px] w-[60px] place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Lock className="h-[26px] w-[26px]" strokeWidth={1.8} />
          </div>
          <div className="text-[22px] font-bold text-[var(--text)]">{t("auth.vaultLocked")}</div>
          <div className="text-center text-[13px] text-[var(--text-2)]">{t("auth.unlockDescription")}</div>
        </div>

        <label className="mb-2 block text-xs font-semibold text-[var(--text-2)]">{t("auth.masterPassword")}</label>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          disabled={loading}
          placeholder={t("auth.masterPassword")}
          className="h-12 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--field)] px-3.5 text-[15px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
        />

        {error && <div className="mt-3 text-center text-xs text-[var(--neg)]">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] text-[15px] font-semibold text-white transition-[filter] hover:brightness-95 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t("auth.unlocking") : t("auth.unlock")}
        </button>

        <div className="mt-[18px] text-center">
          <button
            type="button"
            onClick={() => logOut()}
            className="text-[13px] text-[var(--text-3)] transition-colors hover:text-[var(--text-2)]"
          >
            {t("auth.signOut")}
          </button>
        </div>
      </form>
    </div>
  );
}
