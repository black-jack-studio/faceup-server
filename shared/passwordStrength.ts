export type PasswordStrength = "weak" | "medium" | "strong";

// Four character categories — lowercase, uppercase, digit, symbol. Strength is judged on
// length plus how many of these a password actually mixes, not on length alone: "aaaaaaaa" is
// 8 characters but still trivial, while a shorter mix across categories is harder to guess.
const CATEGORY_PATTERNS = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

function categoryCount(password: string): number {
  return CATEGORY_PATTERNS.reduce((count, pattern) => count + (pattern.test(password) ? 1 : 0), 0);
}

export function getPasswordStrength(password: string): PasswordStrength {
  const categories = categoryCount(password);
  if (password.length >= 8 && categories >= 3) return "strong";
  if (password.length >= 6 && categories >= 2) return "medium";
  return "weak";
}

// The register screen's explicit checklist (length / digit / special character), shown
// alongside the strength bar above with its own per-rule check/cross. This is also the actual
// gate on account creation (see insertUserSchema in shared/schema.ts) — simpler and more
// predictable for a signing-up user to satisfy than the strength bar's "3 of 4 categories"
// heuristic, which the bar still uses for its own weak/medium/strong readout.
export interface PasswordRequirements {
  minLength: boolean;
  hasDigit: boolean;
  hasSpecialChar: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasDigit: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };
}

export function meetsPasswordRequirements(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.minLength && requirements.hasDigit && requirements.hasSpecialChar;
}
