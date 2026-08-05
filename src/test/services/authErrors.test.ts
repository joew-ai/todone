import { describe, expect, it } from 'vitest';
import { mapAuthError } from '../../services/authErrors';

describe('mapAuthError', () => {
  it.each([
    'NotAuthorizedException',
    'UserNotFoundException',
    'UserNotConfirmedException',
    'InvalidPasswordException',
  ])('maps %s (via .code) to the generic invalid-credentials message', (code) => {
    const result = mapAuthError({ code });
    expect(result).toEqual({ message: 'Incorrect username or password.', recoverable: true });
  });

  it.each(['NotAuthorizedException', 'InvalidPasswordException'])(
    'maps %s (via .name, as thrown by the AWS SDK v3 client used for local development) to the same generic message',
    (name) => {
      const result = mapAuthError({ name });
      expect(result).toEqual({ message: 'Incorrect username or password.', recoverable: true });
    },
  );

  it('prefers .code over .name when both are present', () => {
    const result = mapAuthError({ code: 'NotAuthorizedException', name: 'SomeOtherName' });
    expect(result).toEqual({ message: 'Incorrect username or password.', recoverable: true });
  });

  it('maps a network failure to a recoverable network message', () => {
    const result = mapAuthError({ code: 'NetworkError' });
    expect(result.recoverable).toBe(true);
    expect(result.message).toMatch(/connection/i);
  });

  it('maps unknown errors to a generic recoverable message without leaking details', () => {
    const result = mapAuthError(new Error('some internal detail with secret@example.com'));
    expect(result.message).not.toContain('secret@example.com');
    expect(result.recoverable).toBe(true);
  });

  it('handles non-object and missing errors safely', () => {
    expect(() => mapAuthError('a string error')).not.toThrow();
    expect(() => mapAuthError(undefined)).not.toThrow();
    expect(() => mapAuthError(null)).not.toThrow();
  });
});
