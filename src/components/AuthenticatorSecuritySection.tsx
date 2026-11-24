import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
import type {
  AuthSessionUser,
  MfaStatus,
  MfaTotpEnrollment,
  ToastMessage,
} from '../types';
import { formatTimestampDisplay } from '../utils/dateUtils';
import { getErrorMessage } from '../utils/errorUtils';

interface AuthenticatorSecuritySectionProps {
  user: AuthSessionUser | null;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export function AuthenticatorSecuritySection({
  user,
  showToast,
}: AuthenticatorSecuritySectionProps) {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>({
    verifiedFactors: [],
    currentLevel: null,
    nextLevel: null,
  });
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [enrollment, setEnrollment] = useState<MfaTotpEnrollment | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadMfaStatus = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setMfaStatus({ verifiedFactors: [], currentLevel: null, nextLevel: null });
      return;
    }

    setLoadingStatus(true);
    try {
      const status = await authService.getMfaStatus();
      setMfaStatus(status);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Unable to fetch authenticator status.'));
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMfaStatus();
  }, [loadMfaStatus]);

  const activeFactor = mfaStatus.verifiedFactors[0] ?? null;
  const isMfaEnabled = Boolean(activeFactor);

  const handleEnableAuthenticator = async () => {
    if (!isSupabaseConfigured || !user || enrolling) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setEnrolling(true);
    try {
      const result = await authService.enrollTotpFactor('TaskFlow Authenticator');
      setEnrollment(result);
      setVerifyCode('');
      setShowSecret(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to start authenticator enrollment.');
      setErrorMsg(msg);
      showToast({ type: 'error', title: 'Authenticator setup failed', description: msg });
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (!enrollment || verifying) return;
    const pendingId = enrollment.factorId;
    setEnrollment(null);
    setVerifyCode('');
    setShowSecret(false);
    setErrorMsg(null);
    try {
      await authService.cancelTotpEnrollment(pendingId);
    } catch {
      // Ignore cleanup failure on cancel
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment || verifying) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setVerifying(true);
    try {
      await authService.verifyTotpEnrollment(enrollment.factorId, verifyCode);
      setEnrollment(null);
      setVerifyCode('');
      setShowSecret(false);
      await loadMfaStatus();
      const msg = 'Two-factor authentication (TOTP) is now enabled on your account.';
      setSuccessMsg(msg);
      showToast({ type: 'success', title: 'Authenticator enabled', description: msg });
    } catch (err) {
      const msg = getErrorMessage(err, 'Verification failed. Please check your 6-digit code.');
      setErrorMsg(msg);
      showToast({ type: 'error', title: 'Verification failed', description: msg });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopiedSecret(true);
      window.setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDisableAuthenticator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFactor || disabling) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setDisabling(true);
    try {
      await authService.verifyAndDisableTotpFactor(activeFactor.id, disableCode);
      setDisableModalOpen(false);
      setDisableCode('');
      await loadMfaStatus();
      const msg = 'Authenticator two-factor authentication has been disabled.';
      setSuccessMsg(msg);
      showToast({ type: 'success', title: 'Authenticator disabled', description: msg });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not verify code to disable authenticator.');
      setErrorMsg(msg);
      showToast({ type: 'error', title: 'Disable failed', description: msg });
    } finally {
      setDisabling(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Authenticator Security
          </h2>
        </div>

        {loadingStatus ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Checking status...</span>
          </span>
        ) : isMfaEnabled ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enabled (TOTP)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>Not Enabled</span>
          </span>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 flex items-start gap-2 text-xs text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* State 1: Not Enabled and Not Currently Enrolling */}
      {!isMfaEnabled && !enrollment && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Two-Factor Authentication (TOTP)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Pair Google Authenticator or Microsoft Authenticator to verify your identity with a
              6-digit time-based code.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnableAuthenticator}
            disabled={!isSupabaseConfigured || !user || enrolling}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0 whitespace-nowrap"
          >
            {enrolling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{enrolling ? 'Generating QR Code...' : 'Enable Authenticator'}</span>
          </button>
        </div>
      )}

      {/* State 2: Enrollment Active (Scan QR Code + Verify 6-digit Code) */}
      {!isMfaEnabled && enrollment && (
        <div className="space-y-5 pt-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shrink-0 shadow-xs">
                <img
                  src={enrollment.qrCode}
                  alt="Supabase TOTP Authenticator QR Code"
                  className="w-40 h-40 block"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    1. Scan QR Code
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Open <strong>Google Authenticator</strong> or{' '}
                    <strong>Microsoft Authenticator</strong> on your phone and scan this QR code to
                    add your TaskFlow key.
                  </p>
                </div>

                <div className="pt-1">
                  <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Can&apos;t scan? Enter setup key manually:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      readOnly
                      value={enrollment.secret}
                      aria-label="Manual TOTP setup secret"
                      className="flex-1 h-8 px-2.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      aria-label={showSecret ? 'Hide setup key' : 'Show setup key'}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      aria-label="Copy setup key"
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      {copiedSecret ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerifyAndEnable} className="space-y-3">
            <div>
              <label
                htmlFor="totp-verify-code"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                2. Enter 6-Digit Verification Code
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <input
                  id="totp-verify-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full sm:w-44 h-9 px-3 text-sm font-mono tracking-[0.25em] text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={verifying || verifyCode.length !== 6}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{verifying ? 'Verifying...' : 'Verify & Enable'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={handleCancelEnrollment}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* State 3: MFA Enabled (Show Status + Verified Disable Flow) */}
      {isMfaEnabled && activeFactor && (
        <div className="space-y-4 pt-1">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {activeFactor.friendlyName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                Active since {formatTimestampDisplay(activeFactor.createdAt, 'MMM d, yyyy')}
                {mfaStatus.currentLevel ? ` · Assurance level: ${mfaStatus.currentLevel.toUpperCase()}` : ''}
              </p>
            </div>

            {!disableModalOpen && (
              <button
                type="button"
                onClick={() => {
                  setDisableModalOpen(true);
                  setDisableCode('');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
              >
                Disable Authenticator
              </button>
            )}
          </div>

          {disableModalOpen && (
            <form
              onSubmit={handleDisableAuthenticator}
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 p-4 space-y-3"
            >
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Verify to Disable Authenticator
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Enter the current 6-digit code from your authenticator app to confirm disabling
                  2FA.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  aria-label="Verification code to disable authenticator"
                  className="w-full sm:w-44 h-9 px-3 text-sm font-mono tracking-[0.25em] text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-600"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={disabling || disableCode.length !== 6}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {disabling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{disabling ? 'Verifying...' : 'Confirm Disable'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={disabling}
                    onClick={() => {
                      setDisableModalOpen(false);
                      setDisableCode('');
                      setErrorMsg(null);
                    }}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
