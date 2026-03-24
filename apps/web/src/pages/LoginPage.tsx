import { useState } from "react";
import { Loader2, Lock, Globe, Download } from "lucide-react";
import { signIn, signUp, completeSignUp } from "../services/auth";
import { hasSecretKey } from "../lib/secret-key";
import { useTranslation } from "../lib/i18n";
import { downloadEmergencyKit } from "../lib/emergency-kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type AuthMode = "signin" | "signup";

export function LoginPage() {
  const { t, locale, setLocale } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState<string | null>(null);
  const [signUpResult, setSignUpResult] = useState<{
    vaultKey: Uint8Array; sessionToken: string; userId: string; salt: Uint8Array;
  } | null>(null);
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const needsSecretKey = mode === "signin" && !hasSecretKey();

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
        const result = await signUp(email, masterPassword, inviteCode || undefined);
        setShowSecretKey(result.secretKey);
        setSignUpResult(result);
        return; // Don't navigate yet — user must see the secret key first.
      } else {
        await signIn(
          email,
          masterPassword,
          needsSecretKey ? secretKeyInput : undefined,
        );
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
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6">
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
                    {needsSecretKey && (
                      <div className="space-y-2">
                        <Label htmlFor="secret-key">{t("secretKey.label")}</Label>
                        <Input
                          id="secret-key"
                          type="text"
                          required
                          value={secretKeyInput}
                          onChange={(e) => setSecretKeyInput(e.target.value)}
                          disabled={loading}
                          placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("secretKey.hint")}
                        </p>
                      </div>
                    )}
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
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">{t("auth.inviteCode")}</Label>
                      <Input
                        id="invite-code"
                        type="text"
                        required
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={loading}
                        placeholder={t("auth.inviteCodePlaceholder")}
                        className="font-mono"
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

      {/* Secret Key display dialog — shown once after sign-up */}
      <Dialog open={!!showSecretKey} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("secretKey.title")}</DialogTitle>
            <DialogDescription>{t("secretKey.description")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="font-mono text-lg tracking-wider text-foreground break-all">
              {showSecretKey}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t("secretKey.warning")}</p>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(showSecretKey!);
              }}
              variant="outline"
            >
              {t("secretKey.copy")}
            </Button>
            <Button
              onClick={() => downloadEmergencyKit(showSecretKey!, email, locale)}
              variant="outline"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {t("secretKey.downloadKit")}
            </Button>
            <Button onClick={() => {
              if (signUpResult) {
                completeSignUp(signUpResult, email);
              }
              setShowSecretKey(null);
            }}>
              {t("secretKey.saved")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
