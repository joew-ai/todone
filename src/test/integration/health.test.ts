import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { simulateLambda } from '../../../local-dev/lambdaSimulator';
import { handler as healthHandler } from '../../../lambdas/health/index';

function buildApp() {
  const app = express();
  app.get('/api/v1/health', async (req, res) => {
    await simulateLambda(healthHandler, req, res);
  });
  return app;
}

describe('GET /api/v1/health (integration, through the simulated API Gateway boundary)', () => {
  it('returns status ok with a no-store cache header', async () => {
    const response = await request(buildApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });
});
