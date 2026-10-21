import { describe, expect, it, vi } from 'vitest';
import { createSessionController, type SessionDependencies } from '../../session/sessionController';
function fixture(verify: () => Promise<{ kind: 'success' }>) {
  const credentials = {
    idToken: 'synthetic-id',
    accessToken: 'synthetic-access',
    expiresAt: new Date(Date.now() + 3600000),
  };
  const provider = {
    restore: vi.fn(async () => ({ kind: 'usable' as const, credentials })),
    renew: vi.fn(async () => ({
      kind: 'usable' as const,
      credentials: { ...credentials, idToken: 'renewed-proof-id' },
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
  const account = { verifyEmailAttribute: vi.fn(verify) } as unknown as NonNullable<
    SessionDependencies['account']
  >;
  const controller = createSessionController({
    provider,
    account,
    readContext: async () => ({ kind: 'error', failure: 'pending-activation' }),
  });
  return { provider, account, controller };
}
describe('pending verification lifecycle', () => {
  it('uses current access credentials and renews ID-token proof after verification', async () => {
    const f = fixture(async () => ({ kind: 'success' }));
    await f.controller.initialize();
    expect(await f.controller.verifyEmailAttribute('verification-code')).toEqual({
      kind: 'success',
    });
    expect(f.account.verifyEmailAttribute).toHaveBeenCalledWith(
      'synthetic-access',
      'verification-code',
    );
    expect(f.provider.renew).toHaveBeenCalledWith(true);
    expect(await f.controller.ensureUsableCredentials()).toBe('renewed-proof-id');
    f.controller.dispose();
  });
  it('ignores a late verification callback after sign-out without renewing or restoring the account', async () => {
    let finish!: () => void;
    const paused = new Promise<{ kind: 'success' }>((resolve) => {
      finish = () => resolve({ kind: 'success' });
    });
    const f = fixture(() => paused);
    await f.controller.initialize();
    const verification = f.controller.verifyEmailAttribute('verification-code');
    await vi.waitFor(() => expect(f.account.verifyEmailAttribute).toHaveBeenCalled());
    f.controller.signOut();
    finish();
    expect(await verification).toEqual({ kind: 'cancelled' });
    expect(f.provider.renew).not.toHaveBeenCalled();
    expect(f.controller.state.value.kind).toBe('signed-out');
    f.controller.dispose();
  });
});
