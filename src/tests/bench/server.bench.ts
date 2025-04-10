import { describe, it, expect, bench } from 'vitest';
import request from 'supertest';
import { app } from '#src/app.js';

describe('Server', () => {
  describe.sequential('Health check', () => {
    bench(
      'Should return 200 for /health',
      async () => {
        const response = await request(app).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('ok');
      },
      { iterations: 10000 }
    );
  });
});
