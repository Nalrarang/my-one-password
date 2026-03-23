import { useState, useEffect, useCallback, useRef } from "react";
import {
  generatePassword,
  generatePassphrase,
  DEFAULT_PASSWORD_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
} from "../lib/password-generator";
import type { PasswordOptions, PassphraseOptions } from "../lib/password-generator";
import {
  evaluateStrength,
  initPasswordStrength,
} from "../lib/password-strength";
import type { StrengthResult } from "../lib/password-strength";
import { copyToClipboard } from "../lib/clipboard";
import { useTranslation } from "../lib/i18n";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PasswordGeneratorProps {
  onSelect: (password: string) => void;
  initialPassword?: string;
}

type GeneratorMode = "password" | "passphrase";

// ---------------------------------------------------------------------------
// Strength meter (reusable)
// ---------------------------------------------------------------------------

export function StrengthMeter({ strength }: { strength: StrengthResult | null }) {
  const { t } = useTranslation();

  if (!strength) return null;

  const segments = 5;

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="flex gap-1" role="meter" aria-label="Password strength" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i <= strength.score ? strength.barColor : "bg-muted"
            }`}
          />
        ))}
      </div>
      {/* Label + crack time */}
      <div className="flex items-center justify-between text-xs">
        <span className={strength.color}>{t(`strength.${strength.score}`)}</span>
        {strength.crackTime && (
          <span className="text-muted-foreground">
            {t("generator.crackTime")} {strength.crackTime}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PasswordGenerator({
  onSelect,
  initialPassword,
}: PasswordGeneratorProps) {
  const { t } = useTranslation();

  // --- Generator mode ---
  const [mode, setMode] = useState<GeneratorMode>("password");

  // --- Password options ---
  const [pwOptions, setPwOptions] = useState<PasswordOptions>({
    ...DEFAULT_PASSWORD_OPTIONS,
  });

  // --- Passphrase options ---
  const [ppOptions, setPpOptions] = useState<PassphraseOptions>({
    ...DEFAULT_PASSPHRASE_OPTIONS,
  });

  // --- Generated value ---
  const [generated, setGenerated] = useState("");

  // --- Strength ---
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const strengthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Clipboard feedback ---
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize zxcvbn dictionaries on mount.
  useEffect(() => {
    initPasswordStrength();
  }, []);

  // --- Generate helper ---
  const regenerate = useCallback(() => {
    const value =
      mode === "password"
        ? generatePassword(pwOptions)
        : generatePassphrase(ppOptions);
    setGenerated(value);
  }, [mode, pwOptions, ppOptions]);

  // Auto-generate on mount and whenever options change.
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  // If an initial password is provided and nothing has been generated yet,
  // evaluate its strength immediately.
  useEffect(() => {
    if (initialPassword && !generated) {
      setGenerated(initialPassword);
    }
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced strength evaluation.
  useEffect(() => {
    if (strengthTimer.current) clearTimeout(strengthTimer.current);
    if (!generated) {
      setStrength(null);
      return;
    }
    strengthTimer.current = setTimeout(() => {
      evaluateStrength(generated).then(setStrength);
    }, 300);
    return () => {
      if (strengthTimer.current) clearTimeout(strengthTimer.current);
    };
  }, [generated]);

  // --- Handlers ---
  function handleCopy() {
    copyToClipboard(generated, 30_000).then(() => {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleUse() {
    onSelect(generated);
  }

  // Ensure at least one character category is always enabled.
  function updatePwOption<K extends keyof PasswordOptions>(
    key: K,
    value: PasswordOptions[K],
  ) {
    const next = { ...pwOptions, [key]: value };
    // Don't allow disabling all character sets.
    if (!next.uppercase && !next.lowercase && !next.digits && !next.symbols) {
      return;
    }
    setPwOptions(next);
  }

  // --- Render ---
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card/60 p-4">
      {/* Generated password display */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={generated}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:outline-none"
          aria-label={t("generator.title")}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label={copied ? t("detail.copied") : t("generator.copy")}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={regenerate}
          aria-label={t("generator.regenerate")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Strength meter */}
      <StrengthMeter strength={strength} />

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Generator mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          onClick={() => setMode("password")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "password"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("generator.password")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "passphrase"}
          onClick={() => setMode("passphrase")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "passphrase"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("generator.passphrase")}
        </button>
      </div>

      {/* Password mode controls */}
      {mode === "password" && (
        <div className="space-y-3">
          {/* Length slider */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="pw-length" className="text-muted-foreground">
                {t("generator.length")}
              </label>
              <Badge variant="secondary" className="tabular-nums">
                {pwOptions.length}
              </Badge>
            </div>
            <input
              id="pw-length"
              type="range"
              min={8}
              max={128}
              value={pwOptions.length}
              onChange={(e) =>
                updatePwOption("length", Number(e.target.value))
              }
              className="mt-1 w-full accent-primary"
            />
          </div>

          {/* Character set checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            <Checkbox
              id="pw-upper"
              label={t("generator.uppercase")}
              checked={pwOptions.uppercase}
              onChange={(v) => updatePwOption("uppercase", v)}
            />
            <Checkbox
              id="pw-lower"
              label={t("generator.lowercase")}
              checked={pwOptions.lowercase}
              onChange={(v) => updatePwOption("lowercase", v)}
            />
            <Checkbox
              id="pw-digits"
              label={t("generator.numbers")}
              checked={pwOptions.digits}
              onChange={(v) => updatePwOption("digits", v)}
            />
            <Checkbox
              id="pw-symbols"
              label={t("generator.symbols")}
              checked={pwOptions.symbols}
              onChange={(v) => updatePwOption("symbols", v)}
            />
          </div>
        </div>
      )}

      {/* Passphrase mode controls */}
      {mode === "passphrase" && (
        <div className="space-y-3">
          {/* Word count slider */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="pp-words" className="text-muted-foreground">
                {t("generator.words")}
              </label>
              <Badge variant="secondary" className="tabular-nums">
                {ppOptions.wordCount}
              </Badge>
            </div>
            <input
              id="pp-words"
              type="range"
              min={3}
              max={10}
              value={ppOptions.wordCount}
              onChange={(e) =>
                setPpOptions({
                  ...ppOptions,
                  wordCount: Number(e.target.value),
                })
              }
              className="mt-1 w-full accent-primary"
            />
          </div>

          {/* Separator */}
          <div>
            <label htmlFor="pp-separator" className="text-sm text-muted-foreground">
              {t("generator.separator")}
            </label>
            <input
              id="pp-separator"
              type="text"
              maxLength={4}
              value={ppOptions.separator}
              onChange={(e) =>
                setPpOptions({ ...ppOptions, separator: e.target.value })
              }
              className="mt-1 block w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            <Checkbox
              id="pp-caps"
              label={t("generator.capitalize")}
              checked={ppOptions.capitalize}
              onChange={(v) =>
                setPpOptions({ ...ppOptions, capitalize: v })
              }
            />
            <Checkbox
              id="pp-number"
              label={t("generator.includeNumber")}
              checked={ppOptions.includeNumber}
              onChange={(v) =>
                setPpOptions({ ...ppOptions, includeNumber: v })
              }
            />
          </div>
        </div>
      )}

      {/* Use button */}
      <Button
        type="button"
        onClick={handleUse}
        className="w-full"
      >
        {t("generator.useThis")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border bg-background text-primary accent-primary"
      />
      {label}
    </label>
  );
}
