// ---------------------------------------------------------------------------
// Password Strength Evaluation
// ---------------------------------------------------------------------------
// Wraps @zxcvbn-ts/core for realistic password strength estimation.
// Uses the async variant so the heavy computation doesn't block the main thread.
// ---------------------------------------------------------------------------

import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 0=very weak, 4=very strong
  label: string;
  crackTime: string;
  color: string; // tailwind text color class
  barColor: string; // tailwind bg color class for the strength bar segments
}

// ---------------------------------------------------------------------------
// Score metadata
// ---------------------------------------------------------------------------

interface ScoreMeta {
  label: string;
  color: string;
  barColor: string;
}

const SCORE_META: Record<number, ScoreMeta> = {
  0: { label: "Very Weak", color: "text-red-400", barColor: "bg-red-500" },
  1: { label: "Weak", color: "text-orange-400", barColor: "bg-orange-500" },
  2: { label: "Fair", color: "text-yellow-400", barColor: "bg-yellow-500" },
  3: { label: "Strong", color: "text-green-400", barColor: "bg-green-500" },
  4: {
    label: "Very Strong",
    color: "text-emerald-400",
    barColor: "bg-emerald-500",
  },
};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let initialized = false;

/**
 * Load dictionaries into zxcvbn. Safe to call multiple times; only the first
 * call has any effect.
 */
export function initPasswordStrength(): void {
  if (initialized) return;

  const options = {
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
    translations: zxcvbnEnPackage.translations,
  };

  zxcvbnOptions.setOptions(options);
  initialized = true;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate the strength of a password string. Returns a score (0-4) with
 * human-readable labels, a crack-time estimate, and Tailwind color classes.
 *
 * If the password is empty, returns a score of 0 immediately.
 */
export async function evaluateStrength(
  password: string,
): Promise<StrengthResult> {
  if (!initialized) {
    initPasswordStrength();
  }

  if (!password) {
    return {
      score: 0,
      label: SCORE_META[0].label,
      crackTime: "",
      color: SCORE_META[0].color,
      barColor: SCORE_META[0].barColor,
    };
  }

  const result = await zxcvbnAsync(password);
  const score = result.score as 0 | 1 | 2 | 3 | 4;
  const meta = SCORE_META[score];

  // Pick the "offline slow hashing" scenario as the most relevant for a
  // password manager context.
  const crackTime =
    result.crackTimesDisplay.offlineSlowHashing1e4PerSecond as string;

  return {
    score,
    label: meta.label,
    crackTime,
    color: meta.color,
    barColor: meta.barColor,
  };
}
