import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { unlock, logOut } from "../services/auth";
import { useTranslation } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

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
      const message =
        err instanceof Error ? err.message : t("auth.failedUnlock");
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
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">{t("auth.vaultLocked")}</CardTitle>
            <CardDescription>{t("auth.unlockDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlock-password">{t("auth.masterPassword")}</Label>
                <Input
                  id="unlock-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.unlocking")}
                  </>
                ) : (
                  t("auth.unlock")
                )}
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={handleLogout} className="text-muted-foreground">
                  {t("auth.signOut")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
