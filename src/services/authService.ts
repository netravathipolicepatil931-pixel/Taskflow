import type { AuthChangeEvent, EmailOtpType, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { MfaFactorSummary, MfaStatus, MfaTotpEnrollment } from '../types';
import { toReadableError } from '../utils/errorUtils';
import {
  cleanAuthParamsFromUrl,
  formatAuthCallbackError,
  getAuthRedirectUrl,
  readAuthCallbackState,
} from '../utils/urlUtils';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect.'
    );
  }
  return supabase;
}

export interface RestoreSessionResult {
  session: Session | null;
  callbackError: string | null;
  isRecovery: boolean;
  emailJustVerified: boolean;
}

export interface SignUpResult {
  session: Session | null;
  requiresEmailConfirmation: boolean;
}

let inFlightSessionRestore: Promise<RestoreSessionResult> | null = null;

function isInvalidSessionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 401 || e.status === 403) return true;
  const msg = (e.message ?? '').toLowerCase();
  return (
    msg.includes('invalid jwt') ||
    msg.includes('user from sub claim') ||
    msg.includes('session_not_found') ||
    msg.includes('refresh_token_not_found')
  );
}

export function isAnonymousUser(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}

function validateEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('Please enter your email address.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Please enter a valid email address.');
  }
  return trimmed;
}

function validateNewPassword(password: string, confirmPassword: string): string {
  if (!password) {
    throw new Error('Please enter a password.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match. Please re-enter them.');
  }
  return password;
}

function formatEmailAuthError(err: unknown, fallback: string): Error {
  const base = toReadableError(err, fallback);
  const lower = base.message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return new Error('Incorrect email or password. Please check your credentials and try again.');
  }
  if (lower.includes('email not confirmed')) {
    return new Error(
      'Please verify your email address before signing in. Check your inbox or request a new verification link below.'
    );
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return new Error(
      'An account with this email already exists. Please sign in or reset your password.'
    );
  }
  if (lower.includes('password should be at least') || lower.includes('weak_password')) {
    return new Error('Password must be at least 6 characters long.');
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return new Error('Too many authentication attempts. Please wait a moment and try again.');
  }
  if (lower.includes('email logins are disabled')) {
    return new Error(
      'Email/Password sign-in is disabled in Supabase. Enable the Email provider under Authentication → Providers.'
    );
  }
  if (lower.includes('expired') || lower.includes('otp_expired') || lower.includes('token')) {
    return new Error(
      'This email verification link is invalid or has expired. Please request a new verification email.'
    );
  }

  return base;
}

function validateTotpCode(code: string): string {
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) {
    throw new Error('Please enter a valid 6-digit verification code.');
  }
  return cleaned;
}

function formatMfaError(err: unknown, fallback: string): Error {
  const base = toReadableError(err, fallback);
  const lower = base.message.toLowerCase();
  if (lower.includes('invalid totp') || lower.includes('verification failed') || lower.includes('expired')) {
    return new Error(
      'Invalid or expired 6-digit verification code. Please check your authenticator app and try again.'
    );
  }
  return base;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw toReadableError(error, 'Failed to inspect Supabase session.');
    return data.session;
  },

  /**
   * Completes Supabase implicit URL callback initialization (email verification / password recovery),
   * handles token_hash verification templates if present, surfaces initialization errors instead of
   * silently dropping them, and restores any valid authenticated session.
   */
  async restoreSession(): Promise<RestoreSessionResult> {
    if (inFlightSessionRestore) {
      return inFlightSessionRestore;
    }

    inFlightSessionRestore = (async () => {
      const client = requireSupabase();
      const callbackState = readAuthCallbackState();
      let callbackError = formatAuthCallbackError(callbackState);
      let emailJustVerified = false;

      try {
        // Ensure Supabase client initialization completes and inspect any URL callback error
        const initResult = await client.auth.initialize();
        if (initResult?.error && !callbackError) {
          callbackError = formatEmailAuthError(
            initResult.error,
            'Email verification could not be completed. Please request a new verification email.'
          ).message;
        }

        // Support custom Supabase email templates that pass ?token_hash=...&type=...
        if (callbackState.tokenHash && callbackState.verificationType && !callbackError) {
          const { data: otpData, error: otpErr } = await client.auth.verifyOtp({
            token_hash: callbackState.tokenHash,
            type: callbackState.verificationType as EmailOtpType,
          });
          if (otpErr) {
            callbackError = formatEmailAuthError(
              otpErr,
              'This verification link is invalid or has expired. Please request a new verification email.'
            ).message;
          } else if (otpData.session?.user) {
            emailJustVerified = callbackState.isSignupVerification;
          }
        }

        const { data: existing, error: sessionErr } = await client.auth.getSession();
        if (sessionErr) {
          throw toReadableError(sessionErr, 'Unable to read Supabase session.');
        }

        if (existing.session?.user) {
          const { data: userCheck, error: userErr } = await client.auth.getUser();
          if (!userErr && userCheck.user) {
            if (isAnonymousUser(userCheck.user)) {
              await client.auth.signOut({ scope: 'local' });
              return {
                session: null,
                callbackError,
                isRecovery: false,
                emailJustVerified: false,
              };
            }
            return {
              session: { ...existing.session, user: userCheck.user },
              callbackError,
              isRecovery: callbackState.isRecovery,
              emailJustVerified:
                emailJustVerified || (callbackState.isSignupVerification && !callbackError),
            };
          }
          if (userErr && !isInvalidSessionError(userErr)) {
            throw toReadableError(userErr, 'Unable to verify existing Supabase session.');
          }
          await client.auth.signOut({ scope: 'local' });
        }

        return {
          session: null,
          callbackError,
          isRecovery: false,
          emailJustVerified: false,
        };
      } finally {
        if (callbackState.hasCallbackParams) {
          cleanAuthParamsFromUrl();
        }
      }
    })();

    try {
      return await inFlightSessionRestore;
    } finally {
      inFlightSessionRestore = null;
    }
  },

  async signInWithPassword(email: string, password: string): Promise<Session> {
    const client = requireSupabase();
    const validEmail = validateEmail(email);
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: validEmail,
      password,
    });

    if (error) {
      throw formatEmailAuthError(error, 'Unable to sign in.');
    }
    if (!data.session?.user) {
      throw new Error('Sign in did not return an active session.');
    }
    return data.session;
  },

  async signUp(input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<SignUpResult> {
    const client = requireSupabase();
    const fullName = input.fullName.trim();
    if (!fullName) {
      throw new Error('Please enter your full name.');
    }
    const validEmail = validateEmail(input.email);
    const validPassword = validateNewPassword(input.password, input.confirmPassword);

    const { data, error } = await client.auth.signUp({
      email: validEmail,
      password: validPassword,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      throw formatEmailAuthError(error, 'Unable to create your account.');
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error(
        'An account with this email already exists. Please sign in or reset your password.'
      );
    }

    return {
      session: data.session,
      requiresEmailConfirmation: !data.session,
    };
  },

  async resendVerificationEmail(email: string): Promise<void> {
    const client = requireSupabase();
    const validEmail = validateEmail(email);

    const { error } = await client.auth.resend({
      type: 'signup',
      email: validEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      throw formatEmailAuthError(error, 'Unable to resend verification email.');
    }
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    const client = requireSupabase();
    const validEmail = validateEmail(email);

    const { error } = await client.auth.resetPasswordForEmail(validEmail, {
      redirectTo: getAuthRedirectUrl(),
    });

    if (error) {
      throw formatEmailAuthError(error, 'Unable to send password reset email.');
    }
  },

  async updatePassword(newPassword: string, confirmPassword: string): Promise<User> {
    const client = requireSupabase();
    const validPassword = validateNewPassword(newPassword, confirmPassword);

    const { data, error } = await client.auth.updateUser({
      password: validPassword,
    });

    if (error) {
      throw formatEmailAuthError(error, 'Unable to update password.');
    }
    if (!data.user) {
      throw new Error('Password update did not return user details.');
    }
    return data.user;
  },

  async signOut(): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) {
      throw toReadableError(error, 'Unable to sign out right now.');
    }
  },

  async getMfaStatus(): Promise<MfaStatus> {
    const client = requireSupabase();
    const { data: factorsData, error: factorsError } = await client.auth.mfa.listFactors();
    if (factorsError) {
      throw toReadableError(factorsError, 'Unable to load authenticator status.');
    }

    const { data: aalData, error: aalError } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      throw toReadableError(aalError, 'Unable to inspect authenticator assurance level.');
    }

    const verifiedFactors: MfaFactorSummary[] = (factorsData?.totp ?? []).map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name || 'TaskFlow Authenticator',
      factorType: factor.factor_type,
      status: factor.status,
      createdAt: factor.created_at,
    }));

    return {
      verifiedFactors,
      currentLevel: aalData?.currentLevel ?? null,
      nextLevel: aalData?.nextLevel ?? null,
    };
  },

  async enrollTotpFactor(friendlyName = 'TaskFlow Authenticator'): Promise<MfaTotpEnrollment> {
    const client = requireSupabase();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) {
      throw new Error('Your workspace session is unavailable. Please retry connecting.');
    }

    const { data: existingFactors, error: listError } = await client.auth.mfa.listFactors();
    if (listError) {
      throw formatMfaError(listError, 'Unable to check existing authenticator factors.');
    }

    const verifiedTotp = existingFactors?.totp ?? [];
    if (verifiedTotp.length > 0) {
      throw new Error('An authenticator app is already enabled for this account.');
    }

    const staleUnverified = (existingFactors?.all ?? []).filter(
      (f) => f.factor_type === 'totp' && f.status === 'unverified'
    );
    for (const stale of staleUnverified) {
      await client.auth.mfa.unenroll({ factorId: stale.id });
    }

    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
      issuer: 'TaskFlow',
    });

    if (error) {
      throw formatMfaError(error, 'Failed to generate authenticator QR code.');
    }
    if (!data?.id || !data.totp?.qr_code || !data.totp?.secret) {
      throw new Error('Supabase MFA did not return a valid TOTP QR code.');
    }

    const qrCode = data.totp.qr_code.startsWith('data:')
      ? data.totp.qr_code
      : `data:image/svg+xml;utf-8,${data.totp.qr_code}`;

    return {
      factorId: data.id,
      qrCode,
      secret: data.totp.secret,
    };
  },

  async verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
    const client = requireSupabase();
    const cleanedCode = validateTotpCode(code);

    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: cleanedCode,
    });

    if (error) {
      throw formatMfaError(error, 'Verification code is invalid or expired.');
    }
  },

  async cancelTotpEnrollment(factorId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.auth.mfa.unenroll({ factorId });
    if (error) {
      throw toReadableError(error, 'Unable to cancel pending authenticator setup.');
    }
  },

  async verifyAndDisableTotpFactor(factorId: string, code: string): Promise<void> {
    const client = requireSupabase();
    const cleanedCode = validateTotpCode(code);

    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: cleanedCode,
    });
    if (verifyError) {
      throw formatMfaError(verifyError, 'Verification code is invalid or expired.');
    }

    const { error: unenrollError } = await client.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      throw formatMfaError(unenrollError, 'Unable to disable authenticator.');
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured || !supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
