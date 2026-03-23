import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  Loader2,
} from "lucide-react";

import { useTranslation } from "../lib/i18n";
import { useVaultStore } from "../stores/vault-store";
import { analyzePasswordHealth } from "../lib/password-health";
import type { PasswordHealthReport } from "../lib/password-health";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PasswordHealthPageProps {
  onBack: () => void;
  onSelectItem: (itemId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreLabel(score: number, t: (key: string) => string): string {
  if (score >= 80) return t("health.excellent");
  if (score >= 70) return t("health.good");
  if (score >= 40) return t("health.fair");
  return t("health.poor");
}

function scoreBadgeClass(score: number): string {
  if (score >= 70) return "border-green-700 bg-green-900/40 text-green-300";
  if (score >= 40) return "border-amber-700 bg-amber-900/40 text-amber-300";
  return "border-red-700 bg-red-900/40 text-red-300";
}

function strengthBadge(
  itemScore: number,
  t: (key: string) => string,
): { label: string; className: string } {
  if (itemScore <= 1) {
    return {
      label: t("strength." + itemScore),
      className: "border-red-700 bg-red-900/40 text-red-300",
    };
  }
  if (itemScore === 2) {
    return {
      label: t("strength.2"),
      className: "border-amber-700 bg-amber-900/40 text-amber-300",
    };
  }
  return {
    label: t("strength." + itemScore),
    className: "border-green-700 bg-green-900/40 text-green-300",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PasswordHealthPage({
  onBack,
  onSelectItem,
}: PasswordHealthPageProps) {
  const { t } = useTranslation();
  const items = useVaultStore((s) => s.items);
  const [report, setReport] = useState<PasswordHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const result = await analyzePasswordHealth(items);
      if (!cancelled) {
        setReport(result);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Loading state
  if (loading || !report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
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
            {t("health.title")}
          </h1>
        </header>
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">{t("health.analyzing")}</p>
        </div>
      </div>
    );
  }

  const totalReused = report.reusedPasswords.reduce(
    (sum, g) => sum + g.items.length,
    0,
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
        <h1 className="text-xl font-bold text-foreground">
          {t("health.title")}
        </h1>
      </header>

      {/* Overall Score Card */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            {/* Circular score display */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${report.overallScore * 2.64} 264`}
                  className={scoreColor(report.overallScore)}
                />
              </svg>
              <div className="flex flex-col items-center">
                <span
                  className={`text-3xl font-bold ${scoreColor(report.overallScore)}`}
                >
                  {report.overallScore}
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("health.overallScore")}
              </p>
              <Badge
                variant="outline"
                className={`mt-1 ${scoreBadgeClass(report.overallScore)}`}
              >
                {scoreLabel(report.overallScore, t)}
              </Badge>
            </div>

            <Progress value={report.overallScore} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {/* Weak */}
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-2xl font-bold text-foreground">
              {report.weakPasswords.length}
            </span>
            <span className="text-center text-xs text-muted-foreground">
              {t("health.weakPasswords")}
            </span>
          </CardContent>
        </Card>

        {/* Reused */}
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <Copy className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-bold text-foreground">
              {totalReused}
            </span>
            <span className="text-center text-xs text-muted-foreground">
              {t("health.reusedPasswords")}
            </span>
          </CardContent>
        </Card>

        {/* Strong */}
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-bold text-foreground">
              {report.strongPasswords.length}
            </span>
            <span className="text-center text-xs text-muted-foreground">
              {t("health.strongPasswords")}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* No issues message */}
      {report.weakPasswords.length === 0 &&
        report.reusedPasswords.length === 0 && (
          <Card className="mt-6 border-green-800 bg-green-900/30">
            <CardContent className="flex items-center justify-center gap-2 p-6">
              <Shield className="h-5 w-5 text-green-400" />
              <p className="text-sm font-medium text-green-300">
                {t("health.noIssues")}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Weak Passwords Section */}
      {report.weakPasswords.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            {t("health.weakPasswords")} ({report.weakPasswords.length})
          </h2>
          <div className="mt-2 space-y-2">
            {report.weakPasswords.map((item) => {
              const badge = strengthBadge(item.score, t);
              return (
                <Card key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-xl"
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.url || item.username}
                        </p>
                        {item.crackTime && (
                          <p className="mt-0.5 text-xs text-muted-foreground/70">
                            {t("health.crackTime")} {item.crackTime}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-3 shrink-0 ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </CardContent>
                  </button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Reused Passwords Section */}
      {report.reusedPasswords.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Copy className="h-4 w-4 text-amber-400" />
            {t("health.reusedPasswords")} ({report.reusedPasswords.length})
          </h2>
          <div className="mt-2 space-y-3">
            {report.reusedPasswords.map((group, groupIdx) => (
              <Card key={groupIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {group.password}
                    </code>
                    <span className="text-xs font-normal text-amber-400">
                      {group.items.length} {t("health.itemsSharing")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelectItem(item.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <span className="truncate font-medium">
                            {item.title}
                          </span>
                          {item.url && (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.url}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
