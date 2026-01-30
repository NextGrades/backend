import { Job } from 'bullmq';
import { PermanentError } from 'src/common/errors/error';
import z from 'zod';

// schema.ts

export const JobGenCourseSchema = z.object({
  userId: z.string().min(1),
  threadId: z.string().min(1).optional(),
  topicId: z.string().min(1),
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
