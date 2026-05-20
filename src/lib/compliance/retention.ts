// Data retention policies — GDPR Art. 5(1)(e): storage limitation.
//
// UK housing law requires 7 years for tenancy records.
// Audit logs are legally required and cannot be purged.
// AI/analytics data has shorter lives.

import { createServiceClient } from '@/lib/supabase/server';

export interface RetentionPolicy {
  table:       string;
  column:      string;          // timestamp column to measure age from
  maxAgeDays:  number;
  description: string;
  canPurge:    boolean;         // false = legal hold, never delete
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    table:       'audit_logs',
    column:      'stamped_at',
    maxAgeDays:  7 * 365,       // 7 years — UK housing law
    description: 'Audit logs — 7-year legal retention. Cannot be purged.',
    canPurge:    false,
  },
  {
    table:       'sessions',
    column:      'session_date',
    maxAgeDays:  7 * 365,
    description: 'Session notes — 7-year legal retention (housing support records).',
    canPurge:    false,
  },
  {
    table:       'service_charges',
    column:      'created_at',
    maxAgeDays:  7 * 365,
    description: 'Financial records — 7-year legal retention (HMRC).',
    canPurge:    false,
  },
  {
    table:       'ai_suggestions',
    column:      'created_at',
    maxAgeDays:  2 * 365,       // 2 years — reasonable for AI audit
    description: 'AI suggestion records — 2-year retention.',
    canPurge:    true,
  },
  {
    table:       'ai_memory',
    column:      'created_at',
    maxAgeDays:  90,            // 3 months — conversation memory
    description: 'AI conversation memory — 90-day retention.',
    canPurge:    true,
  },
  {
    table:       'api_metrics',
    column:      'created_at',
    maxAgeDays:  90,
    description: 'API performance metrics — 90-day retention.',
    canPurge:    true,
  },
  {
    table:       'system_logs',
    column:      'created_at',
    maxAgeDays:  180,           // 6 months for error logs
    description: 'System error logs — 6-month retention.',
    canPurge:    true,
  },
  {
    table:       'auth_nonces',
    column:      'expires_at',
    maxAgeDays:  0,             // DB-enforced TTL via expires_at
    description: 'Auth nonces — DB-enforced 5-minute expiry.',
    canPurge:    true,
  },
];

export interface PurgeResult {
  table:       string;
  deleted:     number;
  policy:      string;
  purged_at:   string;
}

/**
 * Runs all purgeable retention policies and returns a summary.
 * Safe to call as a cron job — skips tables with canPurge:false.
 */
export async function enforceRetentionPolicies(actorId?: string): Promise<PurgeResult[]> {
  const svc     = createServiceClient();
  const results: PurgeResult[] = [];

  for (const policy of RETENTION_POLICIES) {
    if (!policy.canPurge || policy.maxAgeDays === 0) continue;

    const cutoff = new Date(Date.now() - policy.maxAgeDays * 86400 * 1000).toISOString();

    const { count, error } = await svc
      .from(policy.table)
      .delete({ count: 'exact' })
      .lt(policy.column, cutoff);

    if (error) {
      console.error(`[retention] Failed to purge ${policy.table}:`, error.message);
      continue;
    }

    const deleted = count ?? 0;
    if (deleted > 0) {
      // Log the purge
      await svc.from('data_retention_log').insert({
        table_name:   policy.table,
        record_count: deleted,
        policy_name:  `${policy.table}_${policy.maxAgeDays}d`,
        purged_by:    actorId ?? null,
        auto_purge:   !actorId,
        notes:        policy.description,
      });
    }

    results.push({
      table:     policy.table,
      deleted,
      policy:    policy.description,
      purged_at: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Returns a human-readable summary of what data is held and for how long.
 * Used in the GDPR export package and the Manager compliance dashboard.
 */
export function getRetentionSummary(): Record<string, string> {
  return Object.fromEntries(
    RETENTION_POLICIES.map((p) => [
      p.table,
      p.canPurge ? `${p.maxAgeDays} days` : `Legal hold — ${p.description}`,
    ])
  );
}
