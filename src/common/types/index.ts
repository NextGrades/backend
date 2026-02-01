export const JOB_MODE = {
  INTERACTIVE: 'INTERACTIVE',
  ASYNC: 'ASYNC',
} as const;

export type JobMode = (typeof JOB_MODE)[keyof typeof JOB_MODE];
