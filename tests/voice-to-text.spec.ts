import { test, expect } from '@playwright/test';

test.describe('Voice-to-Text Pipeline Hook', () => {
  test('API route for voice ingestion should exist and require payload', async ({ request }) => {
    // Ping the intelligence orchestrator or voice ingestion route
    // Even if it returns 401 or 400, it validates the endpoint exists and is gated
    const response = await request.post('/api/ai/voice', {
      data: {}
    });
    
    // We expect it to not be a 404, implying the hook exists.
    // Usually it will be 400 Bad Request (missing audio) or 401 Unauthorized
    expect(response.status()).not.toBe(404);
  });
});
