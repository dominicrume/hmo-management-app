// Client-safe password utilities — no server imports.
// Used by login page, reset-password page, and any client component.

export interface PasswordStrength {
  valid: boolean;
  score: number; // 0-4
  errors: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8)  score++; else errors.push('At least 8 characters');
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; else errors.push('At least one uppercase letter');
  if (/[a-z]/.test(password)) score++; else errors.push('At least one lowercase letter');
  if (/[0-9]/.test(password)) score++; else errors.push('At least one number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else errors.push('At least one special character');

  return {
    valid: errors.length === 0 && password.length >= 8,
    score: Math.min(4, Math.floor(score * (4 / 6))),
    errors,
  };
}
