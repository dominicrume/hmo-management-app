// Security module barrel — import everything from '@/lib/security'

export { validateServerEnv, validateClientEnv, COOKIE_OPTIONS } from './env';
export { checkRateLimit, RATE_LIMITS, type RateLimitResult } from './rate-limit';
export {
  hasPermission,
  getApiAuthContext,
  requirePermission,
  requireManager,
  createStaffUser,
  type Permission,
  type AuthContext,
  type CreateUserPayload,
} from './rbac';
export {
  isSessionFresh,
  auditLogin,
  forceSignOut,
  checkPasswordStrength,
  type PasswordStrength,
} from './session';
