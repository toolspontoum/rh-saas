export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRules = {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  special: boolean;
};

export function analyzePassword(password: string): {
  rules: PasswordRules;
  metCount: number;
  strength: "fraca" | "media" | "forte";
} {
  const rules: PasswordRules = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  const metCount = Object.values(rules).filter(Boolean).length;
  let strength: "fraca" | "media" | "forte";
  if (metCount <= 2) strength = "fraca";
  else if (metCount <= 4) strength = "media";
  else strength = "forte";
  return { rules, metCount, strength };
}

export function passwordMeetsPolicy(password: string): boolean {
  const { rules } = analyzePassword(password);
  return Object.values(rules).every(Boolean);
}

/** Mensagem para o utilizador quando a política não é atendida (senha não vazia). */
export function passwordPolicyHint(password: string): string | null {
  if (!password) return null;
  if (passwordMeetsPolicy(password)) return null;
  const { rules } = analyzePassword(password);
  const parts: string[] = [];
  if (!rules.minLength) parts.push(`pelo menos ${PASSWORD_MIN_LENGTH} caracteres`);
  if (!rules.lowercase) parts.push("uma letra minúscula");
  if (!rules.uppercase) parts.push("uma letra maiúscula");
  if (!rules.digit) parts.push("um número");
  if (!rules.special) parts.push("um caractere especial");
  return `A nova senha deve ter ${parts.join(", ")}.`;
}
