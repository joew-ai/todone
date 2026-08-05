import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from '../../config/authConfig';

describe('loadAuthConfig', () => {
  it('returns config when all variables are present', () => {
    const config = loadAuthConfig({
      VITE_COGNITO_USER_POOL_ID: 'pool-id',
      VITE_COGNITO_CLIENT_ID: 'client-id',
      VITE_COGNITO_REGION: 'us-east-1',
    } as ImportMetaEnv);

    expect(config).toEqual({ userPoolId: 'pool-id', clientId: 'client-id', region: 'us-east-1' });
  });

  it('throws listing every missing variable', () => {
    expect(() => loadAuthConfig({} as unknown as ImportMetaEnv)).toThrow(
      /VITE_COGNITO_USER_POOL_ID.*VITE_COGNITO_CLIENT_ID.*VITE_COGNITO_REGION/s,
    );
  });

  it('throws listing only the specific missing variable', () => {
    expect(() =>
      loadAuthConfig({
        VITE_COGNITO_USER_POOL_ID: 'pool-id',
        VITE_COGNITO_CLIENT_ID: 'client-id',
        VITE_COGNITO_REGION: '',
      } as ImportMetaEnv),
    ).toThrow(/VITE_COGNITO_REGION/);
  });
});
