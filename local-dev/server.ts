import dotenv from 'dotenv';

// Load .env.local FIRST so COGNITO_* server-side env vars (written by
// scripts/setup-local-cognito.ts) are available before anything else runs.
dotenv.config({ path: '.env.local' });

import express from 'express';
import { simulateLambda } from './lambdaSimulator';
import { handler as healthHandler } from '../lambdas/health/index';
import { handler as sessionHandler } from '../lambdas/session/index';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.get('/api/v1/health', async (req, res) => {
  await simulateLambda(healthHandler, req, res);
});

app.get('/api/v1/session', async (req, res) => {
  await simulateLambda(sessionHandler, req, res);
});

app.listen(PORT, () => {
  console.log(`Todone local API simulator running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/v1/health');
  console.log('  GET /api/v1/session');
});
