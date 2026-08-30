import { describe, expect, it } from 'vitest';
import { localCognitoClient } from '../../../lambdas/cognito/runtime';

describe('local Cognito administration runtime', () => {
  it('does not enable local Cognito merely because an endpoint is present', () => {
    expect(localCognitoClient({ COGNITO_LOCAL_ENDPOINT: 'http://localhost:9229' })).toBeUndefined();
  });

  it('requires an explicit local-development flag and a loopback endpoint', () => {
    expect(() => localCognitoClient({ TODONE_LOCAL_DEVELOPMENT: 'true' })).toThrow(
      'COGNITO_LOCAL_ENDPOINT is required',
    );
    expect(() =>
      localCognitoClient({
        TODONE_LOCAL_DEVELOPMENT: 'true',
        COGNITO_LOCAL_ENDPOINT: 'https://cognito.example.test',
      }),
    ).toThrow('loopback host');
  });

  it('creates a local-only client for an explicit loopback endpoint', () => {
    expect(
      localCognitoClient({
        TODONE_LOCAL_DEVELOPMENT: 'true',
        COGNITO_LOCAL_ENDPOINT: 'http://127.0.0.1:9229',
      }),
    ).toBeDefined();
  });
});
