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

interface ErrorWithResponse {
  response?: {
    status: number;
  };
}

interface ErrorWithCode {
  code?: string;
}

interface ErrorWithName {
  name?: string;
}

type ClassifiableError = ErrorWithResponse & ErrorWithCode & ErrorWithName;

export function classifyError(err: unknown, durationMs: number): FailureType {
  console.log(err);
  const error = err as ClassifiableError;
  if (error instanceof PermanentError) return 'PERMANENT';

  // AbortController timeout
  if (error.name === 'AbortError') {
    return 'TIMEOUT';
  }

  // Axios-style HTTP errors
  if (error.response) {
    const status = error.response.status;
    if (status === 429) return 'RATE_LIMIT';
    if (status >= 500) return 'SERVER';
    if (status >= 400) return 'CLIENT';
  }

  // Node network errors
  if (error.code) {
    if (['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
      return 'NETWORK';
    }
  }

  // Behavioral fallback
  if (durationMs > 20_000) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN';
}
