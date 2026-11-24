import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AuthActionType } from '../hooks/useAuth';
import type { SignUpResult } from '../services/authService';
import type { ThemeMode } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

export type AuthScreenMode = 'login' | 'signup' | 'forgot' | 'recovery';

interface AuthViewProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  authError: string | null;
  actionLoading: AuthActionType;
  isSupabaseConfigured: boolean;
  passwordRecoveryPending: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<SignUpResult>;
  onResendVerification: (email: string) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onUpdatePassword: (newPassword: string, confirmPassword: string) => Promise<void>;
  onSignOutRecovery: () => Promise<void>;
  onOpenSqlSetup: () => void;
  onDismissError: () => void;
}

export function AuthView({
  theme,
  onThemeChange,
  authError,
  actionLoading,
  isSupabaseConfigured,
  passwordRecoveryPending,
  onSignIn,
  onSignUp,
  onResendVerification,
  onSendPasswordReset,
  onUpdatePassword,
  onSignOutRecovery,
  onOpenSqlSetup,
  onDismissError,
}: AuthViewProps) {
  const [mode, setMode] = useState<AuthScreenMode>(
    passwordRecoveryPending ? 'recovery' : 'login'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationEmailTarget, setVerificationEmailTarget] = useState<string | null>(null);

  useEffect(() => {
    if (passwordRecoveryPending) {
      setMode('recovery');
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
      setSuccessMessage(null);
    }
  }, [passwordRecoveryPending]);

  const switchMode = (nextMode: AuthScreenMode) => {
    setMode(nextMode);
    setLocalError(null);
    setSuccessMessage(null);
    setVerificationEmailTarget(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onDismissError();
  };

  const activeError = localError || authError;
  const isBusy = actionLoading !== null;

  const isVerificationError = Boolean(
    activeError &&
      (activeError.toLowerCase().includes('verification') ||
        activeError.toLowerCase().includes('verify your email') ||
        activeError.toLowerCase().includes('expired'))
  );

  const showResendBox =
    mode !== 'recovery' &&
    mode !== 'forgot' &&
    (Boolean(verificationEmailTarget) || isVerificationError);

  const handleResendClick = async () => {
    const target = (verificationEmailTarget || email).trim();
    setLocalError(null);
    setSuccessMessage(null);
    onDismissError();

    if (!target) {
      setLocalError('Enter your email address above so we can send a new verification link.');
      return;
    }

    try {
      await onResendVerification(target);
      setVerificationEmailTarget(target);
      setSuccessMessage(
        `A new verification email was sent to ${target}. Open the link in your inbox to verify and sign in.`
      );
    } catch {
      // Handled via authError state
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    onDismissError();

    if (!isSupabaseConfigured) {
      setLocalError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to authenticate.'
      );
      return;
    }

    try {
      if (mode === 'login') {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
          setLocalError('Please enter your email address.');
          return;
        }
        if (!password) {
          setLocalError('Please enter your password.');
          return;
        }
        await onSignIn(trimmedEmail, password);
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setLocalError('Please enter your full name.');
          return;
        }
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
          setLocalError('Please enter your email address.');
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setLocalError('Passwords do not match. Please check and try again.');
          return;
        }
        const res = await onSignUp({
          fullName: fullName.trim(),
          email: trimmedEmail,
          password,
          confirmPassword,
        });
        if (res.requiresEmailConfirmation) {
          setVerificationEmailTarget(trimmedEmail);
          setSuccessMessage(
            `Account created! We sent a verification link to ${trimmedEmail}. Click the link in your email to verify and open TaskFlow.`
          );
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot') {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
          setLocalError('Please enter your email address.');
          return;
        }
        await onSendPasswordReset(trimmedEmail);
        setSuccessMessage(
          `Password reset link sent to ${trimmedEmail}. Check your inbox and follow the link to set a new password.`
        );
      } else if (mode === 'recovery') {
        if (password.length < 6) {
          setLocalError('New password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setLocalError('Passwords do not match. Please re-enter them.');
          return;
        }
        await onUpdatePassword(password, confirmPassword);
      }
    } catch {
      // Error surfaced cleanly via authError state
    }
  };

  const titleText =
    mode === 'login'
      ? 'Sign in to TaskFlow'
      : mode === 'signup'
      ? 'Create your TaskFlow account'
      : mode === 'forgot'
      ? 'Reset your password'
      : 'Set a new password';

  const subtitleText =
    mode === 'login'
      ? 'Enter your email and password to access your workspace.'
      : mode === 'signup'
      ? 'Start organizing your tasks, projects, and calendar.'
      : mode === 'forgot'
      ? 'Enter your account email and we will send a reset link.'
      : 'Choose a strong password of at least 6 characters.';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      <header className="w-full px-5 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-display font-bold text-sm">
            T
          </span>
          <span className="font-display font-semibold text-base tracking-tight text-slate-900 dark:text-slate-100">
            TaskFlow
          </span>
        </div>
        <ThemeSwitcher theme={theme} onChange={onThemeChange} compact />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-sm"
        >
          <div className="text-center">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-display font-bold text-lg flex items-center justify-center mx-auto shadow-xs">
              T
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-display">
              {titleText}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitleText}</p>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mt-6 grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`h-8 text-xs font-medium rounded-lg transition-colors ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => switchMode('signup')}
                className={`h-8 text-xs font-medium rounded-lg transition-colors ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {activeError && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-800 dark:text-red-200 flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{activeError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  onDismissError();
                }}
                aria-label="Dismiss error"
                className="p-0.5 rounded text-red-500 hover:text-red-700 dark:hover:text-red-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
              <p className="leading-relaxed">
                Supabase connection details are missing. Add{' '}
                <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to enable authentication
                and workspace persistence.
              </p>
              <button
                type="button"
                onClick={onOpenSqlSetup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 font-medium hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span>View SQL Schema & Setup</span>
              </button>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-5 space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-full-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-full-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {mode !== 'recovery' && (
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'recovery') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {mode === 'recovery' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
                    className="w-full h-10 pl-9 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'signup' || mode === 'recovery') && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full h-10 pl-9 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy || !isSupabaseConfigured}
              className="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {isBusy && actionLoading !== 'resend' && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login'
                  ? actionLoading === 'login'
                    ? 'Signing in...'
                    : 'Sign In'
                  : mode === 'signup'
                  ? actionLoading === 'signup'
                    ? 'Creating account...'
                    : 'Create Account'
                  : mode === 'forgot'
                  ? actionLoading === 'reset'
                    ? 'Sending reset link...'
                    : 'Send Reset Link'
                  : actionLoading === 'updatePassword'
                  ? 'Updating password...'
                  : 'Update Password'}
              </span>
            </button>
          </form>

          {showResendBox && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-2.5">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Didn&apos;t receive the email or need a fresh verification link?
              </p>
              <button
                type="button"
                disabled={isBusy || !isSupabaseConfigured}
                onClick={() => void handleResendClick()}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'resend' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>
                  {actionLoading === 'resend'
                    ? 'Sending verification email...'
                    : 'Resend verification email'}
                </span>
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mt-4 w-full h-9 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          )}

          {mode === 'recovery' && (
            <button
              type="button"
              onClick={() => void onSignOutRecovery()}
              className="mt-4 w-full h-9 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel &amp; return to sign in</span>
            </button>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Secured with Supabase Authentication &amp; Row-Level Security.</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
