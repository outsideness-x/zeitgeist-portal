export const oauthErrorMessageMap = {
  oauth_access_denied: 'Вход через Google был отменен.',
  oauth_invalid_request: 'Не удалось обработать запрос авторизации. Попробуйте снова.',
  oauth_state_invalid: 'Сессия входа устарела или повреждена. Запустите вход снова.',
  oauth_exchange_failed: 'Не удалось завершить вход через Google. Попробуйте повторить.',
  oauth_email_not_verified: 'Для входа через Google нужна подтвержденная почта в Google-аккаунте.',
  '2fa_delivery_failed': 'Не удалось отправить код подтверждения. Попробуйте позже.',
} as const;

export type OAuthErrorCode = keyof typeof oauthErrorMessageMap;

const knownOAuthErrors = new Set<OAuthErrorCode>(Object.keys(oauthErrorMessageMap) as OAuthErrorCode[]);

export const mapOAuthErrorCodeToMessage = (code: string | null | undefined): string | null => {
  if (!code) {
    return null;
  }

  if (knownOAuthErrors.has(code as OAuthErrorCode)) {
    return oauthErrorMessageMap[code as OAuthErrorCode];
  }

  return 'Не удалось завершить авторизацию. Попробуйте снова.';
};

export const buildAuthCallbackPath = (pathname: string, search: string): string => {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/';
  }

  if (!search) {
    return pathname;
  }

  const raw = search.startsWith('?') ? search.slice(1) : search;
  const query = new URLSearchParams(raw);
  query.delete('auth');
  query.delete('auth_error');
  query.delete('auth_debug_code');

  const serialized = query.toString();
  return serialized.length > 0 ? `${pathname}?${serialized}` : pathname;
};
