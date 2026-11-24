export interface AuthCallbackState {
  hasCallbackParams: boolean;
  isRecovery: boolean;
  isSignupVerification: boolean;
  tokenHash: string | null;
  verificationType: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

const AUTH_PARAM_KEYS = [
  'code',
  'state',
  'token_hash',
  'error',
  'error_code',
  'error_description',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
];

export function sanitizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function readAuthCallbackState(): AuthCallbackState {
  if (typeof window === 'undefined') {
    return {
      hasCallbackParams: false,
      isRecovery: false,
      isSignupVerification: false,
      tokenHash: null,
      verificationType: null,
      error: null,
      errorCode: null,
      errorDescription: null,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(rawHash);

  const readParam = (key: string) => searchParams.get(key) ?? hashParams.get(key);

  const hasCallbackParams = AUTH_PARAM_KEYS.some(
    (key) => searchParams.has(key) || hashParams.has(key)
  );
  const verificationType = readParam('type');

  return {
    hasCallbackParams,
    isRecovery: verificationType === 'recovery',
    isSignupVerification: verificationType === 'signup' || verificationType === 'email',
    tokenHash: searchParams.get('token_hash'),
    verificationType,
    error: readParam('error'),
    errorCode: readParam('error_code'),
    errorDescription: readParam('error_description'),
  };
}

export function formatAuthCallbackError(state: AuthCallbackState): string | null {
  if (!state.error && !state.errorCode && !state.errorDescription) {
    return null;
  }

  const code = (state.errorCode ?? '').toLowerCase();
  const err = (state.error ?? '').toLowerCase();
  const desc = (state.errorDescription ?? '').replace(/\+/g, ' ').trim();
  const descLower = desc.toLowerCase();

  if (
    code === 'otp_expired' ||
    descLower.includes('expired') ||
    descLower.includes('invalid or has expired')
  ) {
    return 'This email verification or password reset link is invalid or has expired. Please request a new link below.';
  }

  if (err === 'access_denied' || code === 'access_denied') {
    return desc || 'Email verification was denied or expired. Please request a new verification email.';
  }

  return desc || 'Email verification could not be completed. Please request a new verification link.';
}

export function cleanAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of AUTH_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (url.hash) {
    const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(rawHash);
    let hashChanged = false;
    for (const key of AUTH_PARAM_KEYS) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        hashChanged = true;
      }
    }
    if (hashChanged) {
      const remainingHash = hashParams.toString();
      url.hash = remainingHash ? `#${remainingHash}` : '';
      changed = true;
    }
  }

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, '', nextUrl || '/');
  }
}
