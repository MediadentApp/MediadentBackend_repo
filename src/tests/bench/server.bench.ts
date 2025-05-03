import { describe, it, expect, bench } from 'vitest';
import request from 'supertest';
import { app } from '#src/app.js';

describe('Server', () => {
  describe('Health check', () => {
    bench(
      'Should return 200 for /health',
      async () => {
        const response = await request(app).get('/health');
      },
      { iterations: 10000 }
    );
  });
});