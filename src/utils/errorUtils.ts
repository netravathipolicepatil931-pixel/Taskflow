interface ErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as ErrorLike;
    const msg = typeof e.message === 'string' ? e.message.trim() : '';
    const code = typeof e.code === 'string' ? e.code.trim() : '';
    const hint = typeof e.hint === 'string' ? e.hint.trim() : '';

    if (code === '42501') {
      return 'Permission denied by Row-Level Security. Please retry your session or check Supabase RLS policies.';
    }
    if (code === '42P01') {
      return 'Database table not found. Please run supabase/schema.sql in your Supabase SQL Editor.';
    }
    if (msg) {
      return hint ? `${msg} (${hint})` : msg;
    }
  }
  return fallback;
}

export function toReadableError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(getErrorMessage(err, fallback));
}
