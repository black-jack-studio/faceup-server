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
