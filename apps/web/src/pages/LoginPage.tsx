import { useState } from "react";
import { Loader2, Lock, Globe } from "lucide-react";
import { signIn, signUp } from "../services/auth";
import { useTranslation } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

type AuthMode = "signin" | "signup";

export function LoginPage() {
  const { t, locale, setLocale } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && masterPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (masterPassword.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, masterPassword);
      } else {
        await signIn(email, masterPassword);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.unexpectedError");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Language toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
            className="text-muted-foreground"
          >
            <Globe className="mr-1.5 h-4 w-4" />
            {locale === "ko" ? "EN" : "한국어"}
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{t("app.title")}</CardTitle>
            <CardDescription>
              {isSignUp ? t("auth.signUpDescription") : t("auth.signInDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v as AuthMode);
                setError(null);
                setConfirmPassword("");
              }}
            >
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="signin" className="flex-1">
                  {t("auth.signIn")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  {t("auth.signUp")}
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4">
                <TabsContent value="signin">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-signin">{t("auth.email")}</Label>
                      <Input
                        id="email-signin"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signin">{t("auth.masterPassword")}</Label>
                      <Input
                        id="password-signin"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="signup">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">{t("auth.email")}</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">{t("auth.masterPassword")}</Label>
                      <Input
                        id="password-signup"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </TabsContent>

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
                      {isSignUp ? t("auth.creatingAccount") : t("auth.derivingKeys")}
                    </>
                  ) : isSignUp ? (
                    t("auth.signUp")
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
