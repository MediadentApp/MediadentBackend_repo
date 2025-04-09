import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '#src/app.js';

describe.skip('Server', () => {
  it('Should return 200 for /health', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
