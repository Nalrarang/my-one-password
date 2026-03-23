import { useState, useEffect, useCallback, useRef } from "react";
import { generateTOTP, getRemainingSeconds } from "../lib/totp";
import { copyToClipboard } from "../lib/clipboard";
import { CRYPTO_CONFIG } from "@my-one-password/shared";
import { useTranslation } from "../lib/i18n";
import { Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TOTPDisplayProps {
  secret: string;
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  digits?: 6 | 8;
  period?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TOTPDisplay({
  secret,
  algorithm = "SHA1",
  digits = 6,
  period = 30,
}: TOTPDisplayProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>("");
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(period));
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCode = useCallback(async () => {
    try {
      const newCode = await generateTOTP({ secret, algorithm, digits, period });
      setCode(newCode);
    } catch {
      setCode("------");
    }
  }, [secret, algorithm, digits, period]);

  useEffect(() => {
    // Generate initial code.
    refreshCode();

    intervalRef.current = setInterval(() => {
      const secs = getRemainingSeconds(period);
      setRemaining(secs);

      // When the period rolls over, regenerate the code.
      if (secs === period) {
        refreshCode();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshCode, period]);

  async function handleCopy() {
    if (!code || code === "------") return;
    await copyToClipboard(code, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Format code with space in middle: "123 456" or "1234 5678"
  const half = Math.floor(code.length / 2);
  const formattedCode = code
    ? `${code.slice(0, half)} ${code.slice(half)}`
    : "--- ---";

  // Countdown ring
  const fraction = remaining / period;
  const isWarning = remaining <= 5;

  return (
    <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{t("detail.otp")}</p>
      <div className="mt-2 flex items-center gap-4">
        {/* Code display — clickable to copy */}
        <button
          type="button"
          onClick={handleCopy}
          className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent/50"
          aria-label={`${t("detail.copy")} OTP`}
        >
          <span
            className={`font-mono text-2xl font-bold tracking-widest ${
              isWarning ? "text-amber-400" : "text-foreground"
            }`}
          >
            {formattedCode}
          </span>
          {copied ? (
            <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
          )}
        </button>

        {/* Countdown ring */}
        <CountdownRing
          fraction={fraction}
          seconds={remaining}
          warning={isWarning}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown ring
// ---------------------------------------------------------------------------

function CountdownRing({
  fraction,
  seconds,
  warning,
}: {
  fraction: number;
  seconds: number;
  warning: boolean;
}) {
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-linear ${
            warning ? "text-amber-400" : "text-primary"
          }`}
        />
      </svg>
      <span
        className={`absolute text-xs font-bold ${
          warning ? "text-amber-400" : "text-muted-foreground"
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}
