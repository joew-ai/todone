#!/usr/bin/env node
/**
 * Build the production PWA with real Cognito configuration -- read from
 * Terraform outputs, never hardcoded or copied from `.env.local` -- and
 * publish the hashed build to the frontend S3 bucket, then invalidate
 * CloudFront so the new `index.html` is served immediately.
 *
 * This is a PRODUCTION ARTIFACT PUBLISH (docs/operations/deployment-rollback.md
 * "Deployment sequence" step 6). Running it is the human authorization for
 * this specific action. It does not touch Terraform state, apply
 * infrastructure, or affect the Lambda/API side of the stack.
 *
 * Usage:
 *   npm run deploy:frontend
 */
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TERRAFORM_DIR = join(process.cwd(), 'terraform');
const DIST_DIR = join(process.cwd(), 'dist');

// Matches terraform/backend.tf's `provider "aws" { region = ... }`.
const REGION = 'us-east-1';

interface TerraformOutputs {
  cognitoUserPoolId: string;
  pwaClientId: string;
  staticSiteUrl: string;
  staticDistributionId: string;
  staticBucketName: string;
}

function readTerraformOutputs(): TerraformOutputs {
  const raw = execFileSync('terraform', ['output', '-json'], {
    cwd: TERRAFORM_DIR,
    encoding: 'utf-8',
  });
  const parsed = JSON.parse(raw) as Record<string, { value: unknown }>;

  const get = (key: string): string => {
    const value = parsed[key]?.value;
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `Missing Terraform output "${key}". Has \`terraform apply\` completed in terraform/?`,
      );
    }
    return value;
  };

  return {
    cognitoUserPoolId: get('cognito_user_pool_id'),
    pwaClientId: get('pwa_client_id'),
    staticSiteUrl: get('static_site_url'),
    staticDistributionId: get('static_distribution_id'),
    staticBucketName: get('static_bucket_name'),
  };
}

function buildFrontend(outputs: TerraformOutputs): void {
  console.log('Building production frontend...');
  execSync('npm run build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_COGNITO_USER_POOL_ID: outputs.cognitoUserPoolId,
      VITE_COGNITO_CLIENT_ID: outputs.pwaClientId,
      VITE_COGNITO_REGION: REGION,
      // Deliberately no VITE_COGNITO_LOCAL_ENDPOINT: production always uses
      // real Cognito SRP, never cognito-local's USER_PASSWORD_AUTH.
      VITE_COGNITO_LOCAL_ENDPOINT: '',
    },
  });
}

function publish(outputs: TerraformOutputs): void {
  const bucket = `s3://${outputs.staticBucketName}`;

  // Two scoped `sync` calls (not a same-bucket `cp --metadata-directive
  // REPLACE`) so the AWS CLI infers each file's real Content-Type from its
  // local extension every time. An S3-to-S3 copy with REPLACE does NOT
  // re-derive Content-Type from the key's extension -- it silently defaults
  // to `binary/octet-stream` for everything, which breaks module scripts
  // and stylesheets in the browser. Learned this the hard way in production.
  console.log(`Syncing hashed assets to ${bucket}/assets (immutable, long-lived cache)...`);
  execSync(
    `aws s3 sync "${DIST_DIR}" "${bucket}" --delete ` +
      `--cache-control "public, max-age=31536000, immutable" ` +
      `--exclude "*" --include "assets/*"`,
    { stdio: 'inherit' },
  );

  console.log(`Syncing the app shell to ${bucket} (no-cache, revalidate every load)...`);
  execSync(
    `aws s3 sync "${DIST_DIR}" "${bucket}" --delete --cache-control "no-cache" --exclude "assets/*"`,
    { stdio: 'inherit' },
  );

  console.log(`Invalidating CloudFront distribution ${outputs.staticDistributionId}...`);
  execSync(
    `aws cloudfront create-invalidation --distribution-id "${outputs.staticDistributionId}" --paths "/*"`,
    { stdio: 'inherit' },
  );
}

function summarize(): { fileCount: number; totalBytes: number } {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }
    }
  }
  walk(DIST_DIR);

  const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
  return { fileCount: files.length, totalBytes };
}

function main(): void {
  const outputs = readTerraformOutputs();
  buildFrontend(outputs);
  publish(outputs);
  const { fileCount, totalBytes } = summarize();

  console.log(`\nPublished ${fileCount} files, ${totalBytes} bytes total.`);
  console.log(`Production PWA: ${outputs.staticSiteUrl}`);
  console.log('Record the deployed source commit and this URL in the release record.');
}

main();
