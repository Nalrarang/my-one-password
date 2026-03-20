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
              i <= strength.score ? strength.barColor : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      {/* Label + crack time */}
      <div className="flex items-center justify-between text-xs">
        <span className={strength.color}>{strength.label}</span>
        {strength.crackTime && (
          <span className="text-slate-500">
            Crack time: {strength.crackTime}
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
    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      {/* Generated password display */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={generated}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:outline-none"
          aria-label="Generated password"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-600 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
          aria-label={copied ? "Copied" : "Copy password"}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
        <button
          type="button"
          onClick={regenerate}
          className="rounded-lg border border-slate-600 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
          aria-label="Regenerate password"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Strength meter */}
      <StrengthMeter strength={strength} />

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-slate-700 p-0.5" role="tablist" aria-label="Generator mode">
        <ModeTab
          label="Password"
          active={mode === "password"}
          onClick={() => setMode("password")}
        />
        <ModeTab
          label="Passphrase"
          active={mode === "passphrase"}
          onClick={() => setMode("passphrase")}
        />
      </div>

      {/* Password mode controls */}
      {mode === "password" && (
        <div className="space-y-3">
          {/* Length slider */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="pw-length" className="text-slate-300">
                Length
              </label>
              <span className="tabular-nums text-slate-400">
                {pwOptions.length}
              </span>
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
              className="mt-1 w-full accent-blue-500"
            />
          </div>

          {/* Character set checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            <Checkbox
              id="pw-upper"
              label="Uppercase (A-Z)"
              checked={pwOptions.uppercase}
              onChange={(v) => updatePwOption("uppercase", v)}
            />
            <Checkbox
              id="pw-lower"
              label="Lowercase (a-z)"
              checked={pwOptions.lowercase}
              onChange={(v) => updatePwOption("lowercase", v)}
            />
            <Checkbox
              id="pw-digits"
              label="Numbers (0-9)"
              checked={pwOptions.digits}
              onChange={(v) => updatePwOption("digits", v)}
            />
            <Checkbox
              id="pw-symbols"
              label="Symbols (!@#$...)"
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
              <label htmlFor="pp-words" className="text-slate-300">
                Words
              </label>
              <span className="tabular-nums text-slate-400">
                {ppOptions.wordCount}
              </span>
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
              className="mt-1 w-full accent-blue-500"
            />
          </div>

          {/* Separator */}
          <div>
            <label htmlFor="pp-separator" className="text-sm text-slate-300">
              Separator
            </label>
            <input
              id="pp-separator"
              type="text"
              maxLength={4}
              value={ppOptions.separator}
              onChange={(e) =>
                setPpOptions({ ...ppOptions, separator: e.target.value })
              }
              className="mt-1 block w-20 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-center text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            <Checkbox
              id="pp-caps"
              label="Capitalize words"
              checked={ppOptions.capitalize}
              onChange={(v) =>
                setPpOptions({ ...ppOptions, capitalize: v })
              }
            />
            <Checkbox
              id="pp-number"
              label="Include number"
              checked={ppOptions.includeNumber}
              onChange={(v) =>
                setPpOptions({ ...ppOptions, includeNumber: v })
              }
            />
          </div>
        </div>
      )}

      {/* Use button */}
      <button
        type="button"
        onClick={handleUse}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Use This Password
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-600 text-slate-100"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

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
      className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ClipboardIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
      />
    </svg>
  );
}
