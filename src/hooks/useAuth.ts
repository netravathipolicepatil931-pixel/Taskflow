import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { authService, isAnonymousUser, type SignUpResult } from '../services/authService';
import type { AuthSessionUser } from '../types';
import { getErrorMessage } from '../utils/errorUtils';
import { sanitizeHttpUrl } from '../utils/urlUtils';

export type AuthActionType =
  | 'login'
  | 'signup'
  | 'resend'
  | 'reset'
  | 'updatePassword'
  | 'signout'
  | null;

function mapSessionUser(session: Session | null): AuthSessionUser | null {
  if (!session?.user) return null;
  const u = session.user;

  if (isAnonymousUser(u)) {
    return null;
  }

  const metaName =
    (typeof u.user_metadata?.full_name === 'string' && u.user_metadata.full_name.trim()) ||
    (typeof u.user_metadata?.name === 'string' && u.user_metadata.name.trim()) ||
    '';

  const email = u.email ?? '';
  const emailName = email ? email.split('@')[0] : '';

  const avatarUrl =
    sanitizeHttpUrl(u.user_metadata?.avatar_url) ||
    sanitizeHttpUrl(u.user_metadata?.picture);

  return {
    id: u.id,
    email,
    full_name: metaName || emailName || 'Workspace User',
    avatarUrl,
    authMethod: 'email',
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [actionLoading, setActionLoading] = useState<AuthActionType>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState<boolean>(false);
  const [justVerifiedEmail, setJustVerifiedEmail] = useState<boolean>(false);

  const initInFlightRef = useRef<boolean>(false);

  const initSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setAuthError(
        'Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured.'
      );
      return;
    }

    initInFlightRef.current = true;
    setLoading(true);
    setAuthError(null);
    try {
      const { session, callbackError, isRecovery, emailJustVerified } =
        await authService.restoreSession();
      setUser(mapSessionUser(session));
      if (isRecovery && session?.user) {
        setPasswordRecoveryPending(true);
      }
      if (emailJustVerified && session?.user) {
        setJustVerifiedEmail(true);
      }
      if (callbackError) {
        setAuthError(callbackError);
      }
    } catch (err) {
      setAuthError(getErrorMessage(err, 'Unable to restore Supabase session.'));
      setUser(null);
    } finally {
      initInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data } = authService.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setPasswordRecoveryPending(false);
        setJustVerifiedEmail(false);
        setLoading(false);
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setUser(mapSessionUser(session));
        setPasswordRecoveryPending(true);
        setLoading(false);
        return;
      }
      if (event === 'INITIAL_SESSION' && !session && initInFlightRef.current) {
        return;
      }
      const mapped = mapSessionUser(session);
      setUser(mapped);
      if (mapped) {
        setAuthError(null);
        setLoading(false);
      }
    });

    void initSession();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [initSession]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setActionLoading('login');
    try {
      const session = await authService.signInWithPassword(email, password);
      setUser(mapSessionUser(session));
      setPasswordRecoveryPending(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to sign in.');
      setAuthError(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const signUp = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }): Promise<SignUpResult> => {
      setAuthError(null);
      setActionLoading('signup');
      try {
        const result = await authService.signUp(input);
        if (result.session) {
          setUser(mapSessionUser(result.session));
        }
        return result;
      } catch (err) {
        const msg = getErrorMessage(err, 'Unable to create your account.');
        setAuthError(msg);
        throw err instanceof Error ? err : new Error(msg);
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const resendVerificationEmail = useCallback(async (email: string) => {
    setAuthError(null);
    setActionLoading('resend');
    try {
      await authService.resendVerificationEmail(email);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to resend verification email.');
      setAuthError(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthError(null);
    setActionLoading('reset');
    try {
      await authService.resetPasswordForEmail(email);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to send password reset email.');
      setAuthError(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string, confirmPassword: string) => {
    setAuthError(null);
    setActionLoading('updatePassword');
    try {
      await authService.updatePassword(newPassword, confirmPassword);
      setPasswordRecoveryPending(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to update password.');
      setAuthError(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    setActionLoading('signout');
    try {
      await authService.signOut();
      setUser(null);
      setPasswordRecoveryPending(false);
      setJustVerifiedEmail(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to sign out.');
      setAuthError(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearJustVerifiedEmail = useCallback(() => {
    setJustVerifiedEmail(false);
  }, []);

  return {
    user,
    loading,
    actionLoading,
    authError,
    passwordRecoveryPending,
    justVerifiedEmail,
    isSupabaseConfigured,
    signInWithPassword,
    signUp,
    resendVerificationEmail,
    sendPasswordReset,
    updatePassword,
    signOut,
    retrySession: initSession,
    clearAuthError,
    clearJustVerifiedEmail,
  };
}
