import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { simulateLambda } from '../../../local-dev/lambdaSimulator';
import { handler as sessionHandler } from '../../../lambdas/session/index';
import type { TokenVerifier } from '../../../lambdas/session/verifier';

function buildApp(verifier?: TokenVerifier) {
  const app = express();
  app.get('/api/v1/session', async (req, res) => {
    await simulateLambda((event) => sessionHandler(event, verifier), req, res);
  });
  return app;
}

const fakeValidVerifier: TokenVerifier = {
  async verify() {
    return { sub: 'sub-123', username: 'parent1', exp: Math.floor(Date.now() / 1000) + 3600 };
  },
};

const fakeRejectingVerifier: TokenVerifier = {
  async verify() {
    throw new Error('token verification failed');
  },
};

describe('GET /api/v1/session (integration, through the simulated API Gateway boundary)', () => {
  it('rejects a request with no Authorization header, with no session data', async () => {
    const response = await request(buildApp(fakeValidVerifier)).get('/api/v1/session');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects a malformed Authorization header, with no session data', async () => {
    const response = await request(buildApp(fakeValidVerifier))
      .get('/api/v1/session')
      .set('Authorization', 'not-a-bearer-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects a token that fails verification, with no session data', async () => {
    const response = await request(buildApp(fakeRejectingVerifier))
      .get('/api/v1/session')
      .set('Authorization', 'Bearer invalid-or-expired-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthorized' });
  });

  it('returns exactly sub, username, and expiresAt for a valid token', async () => {
    const response = await request(buildApp(fakeValidVerifier))
      .get('/api/v1/session')
      .set('Authorization', 'Bearer a-valid-token');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Object.keys(response.body).sort()).toEqual(['expiresAt', 'sub', 'username']);
    expect(response.body).toEqual({
      sub: 'sub-123',
      username: 'parent1',
      expiresAt: expect.any(String),
    });
  });

  it('returns identical bodies for missing and invalid tokens (no distinguishing signal)', async () => {
    const missing = await request(buildApp(fakeRejectingVerifier)).get('/api/v1/session');
    const invalid = await request(buildApp(fakeRejectingVerifier))
      .get('/api/v1/session')
      .set('Authorization', 'Bearer invalid');

    expect(missing.body).toEqual(invalid.body);
    expect(missing.status).toBe(invalid.status);
  });
});
