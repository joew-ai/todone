import express from 'express';
import { simulateLambda } from './lambdaSimulator';
import { handler as healthHandler } from '../lambdas/health/index';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.get('/api/v1/health', async (req, res) => {
  await simulateLambda(healthHandler, req, res);
});

app.listen(PORT, () => {
  console.log(`Todone local API simulator running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/v1/health');
});
