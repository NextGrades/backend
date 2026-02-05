import { PermanentError } from 'src/common/errors/error';

// classify.ts
export type FailureType =
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER'
  | 'CLIENT'
  | 'TRANSIENT'
  | 'UNKNOWN'
  | 'PERMANENT';

/* ------------------ Type Guards ------------------ */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasName(err: unknown): err is { name: string } {
  return isObject(err) && typeof err.name === 'string';
}

function hasCode(err: unknown): err is { code: string } {
  return isObject(err) && typeof err.code === 'string';
}

function hasResponse(err: unknown): err is {
  response: { status: number };
} {
  return (
    isObject(err) &&
    isObject(err.response) &&
    typeof err.response.status === 'number'
  );
}

/* ------------------ Classifier ------------------ */

export function classifyError(err: unknown, durationMs: number): FailureType {
  console.log(err);

  if (err instanceof PermanentError) {
    return 'PERMANENT';
  }

  // AbortController timeout
  if (hasName(err) && err.name === 'AbortError') {
    return 'TIMEOUT';
  }

  // Axios / HTTP-style errors
  if (hasResponse(err)) {
    const status = err.response.status;

    if (status === 429) return 'RATE_LIMIT';
    if (status >= 500) return 'SERVER';
    if (status >= 400) return 'CLIENT';
  }

  // Node.js network errors
  if (hasCode(err)) {
    if (['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'].includes(err.code)) {
      return 'NETWORK';
    }
  }

  // Behavioral fallback
  if (durationMs > 50_000) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN';
}
