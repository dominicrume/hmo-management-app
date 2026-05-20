// Lightweight request validation — no external deps required.

export interface FieldDef {
  type?: 'string' | 'number' | 'boolean' | 'uuid';
  required?: boolean;
  /** For strings: minimum length */
  minLength?: number;
  /** For strings: maximum length */
  maxLength?: number;
  /** Allowed string values */
  enum?: readonly string[];
}

export type Schema<T> = { [K in keyof T]: FieldDef };

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validate<T extends Record<string, unknown>>(
  body: unknown,
  schema: Schema<T>,
): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }

  const data = body as Record<string, unknown>;

  for (const [field, def] of Object.entries(schema) as [string, FieldDef][]) {
    const val = data[field];
    const missing = val === undefined || val === null || val === '';

    if (def.required && missing) {
      errors.push(`'${field}' is required`);
      continue;
    }
    if (missing) continue;

    if (def.type === 'string' && typeof val !== 'string') {
      errors.push(`'${field}' must be a string`);
    } else if (def.type === 'number' && typeof val !== 'number') {
      errors.push(`'${field}' must be a number`);
    } else if (def.type === 'boolean' && typeof val !== 'boolean') {
      errors.push(`'${field}' must be a boolean`);
    } else if (def.type === 'uuid' && (typeof val !== 'string' || !UUID_RE.test(val))) {
      errors.push(`'${field}' must be a valid UUID`);
    }

    if (typeof val === 'string') {
      if (def.minLength !== undefined && val.length < def.minLength) {
        errors.push(`'${field}' must be at least ${def.minLength} characters`);
      }
      if (def.maxLength !== undefined && val.length > def.maxLength) {
        errors.push(`'${field}' must be at most ${def.maxLength} characters`);
      }
      if (def.enum && !def.enum.includes(val)) {
        errors.push(`'${field}' must be one of: ${def.enum.join(', ')}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Quick helper — returns first error message or null */
export function firstError(result: ValidationResult): string | null {
  return result.ok ? null : result.errors[0];
}
