import { Job } from 'bullmq';
import { FailureType } from 'src/common/errors/classify';
import { PermanentError } from 'src/common/errors/error';
import { JOB_MODE, JobMode } from 'src/common/types';
import z from 'zod';

// schema.ts
export interface BaseJobData {
  // your normal job fields here
  userId?: string;
  payload?: unknown;
  durationMs: string;
  mode: JobMode;

  __failure?: JobFailureEnvelope;
}

export type JobFailureEnvelope = {
  reason?: string;
  failureType: FailureType;
  code?: string;
  meta?: Record<string, any>;
  durationMs?: number;
};

export const JobGenCourseSchema = z.object({
  scope: z.object({
    userId: z.string().min(1),
    conversationId: z.string().min(1),
  }),

  topicId: z.string().min(1),

  mode: z.enum([JOB_MODE.INTERACTIVE, JOB_MODE.ASYNC]),
});

export function validateJob(job: Job) {
  //   console.log('Validating job data:', job.data);
  const result = JobGenCourseSchema.safeParse(job.data);

  if (!result.success) {
    const issue = result.error.issues[0];

    throw new PermanentError('Invalid job payload', {
      code: 'INVALID_PAYLOAD',
      meta: {
        field: issue.path.join('.'),
        rule: issue.message,
        jobId: job.id,
        queue: job.queueName,
      },
    });
  }

  return result.data;
}
