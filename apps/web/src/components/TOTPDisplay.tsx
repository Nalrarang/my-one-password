import { useState, useEffect, useCallback, useRef } from "react";
import { generateTOTP, getRemainingSeconds } from "../lib/totp";
import { copyToClipboard } from "../lib/clipboard";
import { CRYPTO_CONFIG } from "@my-one-password/shared";

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
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">One-Time Password</p>
      <div className="mt-2 flex items-center gap-4">
        {/* Code display — clickable to copy */}
        <button
          type="button"
          onClick={handleCopy}
          className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/50"
          aria-label="Copy OTP code"
        >
          <span
            className={`font-mono text-2xl font-bold tracking-widest ${
              isWarning ? "text-amber-400" : "text-slate-100"
            }`}
          >
            {formattedCode}
          </span>
          {copied ? (
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
          ) : (
            <svg
              className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-300"
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
          className="text-slate-700"
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
            warning ? "text-amber-400" : "text-blue-400"
          }`}
        />
      </svg>
      <span
        className={`absolute text-xs font-bold ${
          warning ? "text-amber-400" : "text-slate-300"
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}
