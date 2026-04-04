import { describe, expect, it } from 'vitest';
import { buildAuthCallbackPath, mapOAuthErrorCodeToMessage } from '../../services/auth/oauth.ts';

describe('frontend oauth helpers', () => {
  it('removes auth control params from callback path', () => {
    const callbackPath = buildAuthCallbackPath('/account', '?tab=security&auth=2fa&auth_error=oauth_state_invalid&auth_debug_code=123456');
    expect(callbackPath).toBe('/account?tab=security');
  });

  it('normalizes unsafe callback paths to root', () => {
    expect(buildAuthCallbackPath('https://evil.example', '?auth=2fa')).toBe('/');
    expect(buildAuthCallbackPath('//evil', '?next=/admin')).toBe('/');
  });

  it('returns localized oauth error messages with safe fallback', () => {
    expect(mapOAuthErrorCodeToMessage('oauth_access_denied')).toBe('Вход через Google был отменен.');
    expect(mapOAuthErrorCodeToMessage('oauth_exchange_failed')).toBe('Не удалось завершить вход через Google. Попробуйте повторить.');
    expect(mapOAuthErrorCodeToMessage('unknown')).toBe('Не удалось завершить авторизацию. Попробуйте снова.');
    expect(mapOAuthErrorCodeToMessage(null)).toBeNull();
  });
});
