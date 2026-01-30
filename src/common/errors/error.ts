// errors.ts
export interface PermanentErrorMeta {
  field?: string;
  rule?: string;
  jobId?: string;
  queue?: string;
}

export class PermanentError extends Error {
  public readonly code: string;
  public readonly meta?: PermanentErrorMeta;

  constructor(
    message: string,
    options?: {
      code?: string;
      meta?: PermanentErrorMeta;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'PermanentError';
    this.code = options?.code ?? 'PERMANENT_ERROR';
    this.meta = options?.meta;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class QueueError extends Error {
  public readonly code?: string;
  public readonly meta?: Record<string, any>;
  public readonly failureType?: string;
  public readonly durationMs?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      meta?: Record<string, any>;
      failureType?: string;
      durationMs?: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'QueueError';

    this.code = options?.code;
    this.meta = options?.meta;
    this.failureType = options?.failureType;
    this.durationMs = options?.durationMs;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
