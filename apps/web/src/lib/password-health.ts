// ---------------------------------------------------------------------------
// Password Health Analysis
// ---------------------------------------------------------------------------
// Analyzes all login items in the vault and produces a health report covering
// password strength distribution and password reuse.
// ---------------------------------------------------------------------------

import type { DecryptedVaultItem, LoginItem } from "@my-one-password/shared";
import { evaluateStrength, initPasswordStrength } from "./password-strength";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PasswordHealthReport {
  totalLogins: number;
  weakPasswords: HealthItem[]; // score 0-1
  fairPasswords: HealthItem[]; // score 2
  strongPasswords: HealthItem[]; // score 3-4
  reusedPasswords: HealthGroup[]; // groups of items sharing same password
  overallScore: number; // 0-100
}

export interface HealthItem {
  id: string;
  title: string;
  url: string;
  username: string;
  score: number; // 0-4
  crackTime: string;
}

export interface HealthGroup {
  password: string; // first 2 chars + "***" for display
  items: { id: string; title: string; url: string }[];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze all login items in the vault and produce a health report.
 *
 * 1. Filters items to only login types
 * 2. Evaluates password strength for each login
 * 3. Categorizes into weak / fair / strong
 * 4. Detects reused passwords
 * 5. Computes an overall health score (0-100)
 */
export async function analyzePasswordHealth(
  items: DecryptedVaultItem[],
): Promise<PasswordHealthReport> {
  initPasswordStrength();

  // Filter to login items only
  const loginItems = items.filter(
    (item): item is DecryptedVaultItem & { data: LoginItem } =>
      item.itemType === "login" && item.data.type === "login",
  );

  const totalLogins = loginItems.length;

  if (totalLogins === 0) {
    return {
      totalLogins: 0,
      weakPasswords: [],
      fairPasswords: [],
      strongPasswords: [],
      reusedPasswords: [],
      overallScore: 100,
    };
  }

  // Evaluate strength for each login
  const evaluated = await Promise.all(
    loginItems.map(async (item) => {
      const data = item.data;
      const result = await evaluateStrength(data.password);
      return {
        id: item.id,
        title: data.title,
        url: data.url,
        username: data.username,
        password: data.password,
        score: result.score,
        crackTime: result.crackTime,
      };
    }),
  );

  // Categorize by strength
  const weakPasswords: HealthItem[] = [];
  const fairPasswords: HealthItem[] = [];
  const strongPasswords: HealthItem[] = [];

  for (const entry of evaluated) {
    const healthItem: HealthItem = {
      id: entry.id,
      title: entry.title,
      url: entry.url,
      username: entry.username,
      score: entry.score,
      crackTime: entry.crackTime,
    };

    if (entry.score <= 1) {
      weakPasswords.push(healthItem);
    } else if (entry.score === 2) {
      fairPasswords.push(healthItem);
    } else {
      strongPasswords.push(healthItem);
    }
  }

  // Detect reused passwords: group by exact password match
  const passwordGroups = new Map<
    string,
    { id: string; title: string; url: string }[]
  >();

  for (const entry of evaluated) {
    if (!entry.password) continue;
    const existing = passwordGroups.get(entry.password);
    const groupItem = { id: entry.id, title: entry.title, url: entry.url };
    if (existing) {
      existing.push(groupItem);
    } else {
      passwordGroups.set(entry.password, [groupItem]);
    }
  }

  // Only keep groups with 2+ items
  const reusedPasswords: HealthGroup[] = [];
  for (const [password, groupItems] of passwordGroups) {
    if (groupItems.length >= 2) {
      const masked =
        password.length >= 2
          ? password.slice(0, 2) + "***"
          : password + "***";
      reusedPasswords.push({
        password: masked,
        items: groupItems,
      });
    }
  }

  // Calculate overall score:
  // (strongCount * 100 + fairCount * 50) / totalLogins, minus 10 per reuse group
  const rawScore =
    (strongPasswords.length * 100 + fairPasswords.length * 50) / totalLogins;
  const penalty = reusedPasswords.length * 10;
  const overallScore = Math.round(
    Math.max(0, Math.min(100, rawScore - penalty)),
  );

  return {
    totalLogins,
    weakPasswords,
    fairPasswords,
    strongPasswords,
    reusedPasswords,
    overallScore,
  };
}
