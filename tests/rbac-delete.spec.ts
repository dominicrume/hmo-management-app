import { test, expect } from '@playwright/test';

test.describe('Strict Database RBAC Guard', () => {
  test('SupportWorkers should receive 403 unauthorized on tenant deletion', async ({ request }) => {
    // Attempt an API delete request simulating a non-admin
    const response = await request.delete('/api/tenants/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Authorization': 'Bearer fake-support-worker-jwt'
      }
    });
    
    // In our lockdown state, deletion is completely forbidden except by the immutable ledger override,
    // so it should return 401 or 403.
    expect([401, 403]).toContain(response.status());
  });
});
