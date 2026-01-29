import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { TeachAgentDto } from 'src/agent/dto/teach-agent.dto';
import { fail, ok } from 'src/common/http/response.helpers';
import {
  QuickExerciseDto,
  SubtopicsDto,
} from 'src/agent/dto/generate-agent.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    @InjectQueue('exercise') private exerciseQueue: Queue,
  ) {}

  @Post('teach')
  async teach(
    @Body()
    body: TeachAgentDto,
  ) {
    const jobId = await this.agentService.teachTopic(body.userId, body.topicId);
    return ok({ jobId }, 'Teaching job enqueued: poll the jobId for status');
  }

  @Get('teach/:jobId')
  async getTeachingStatus(@Param('jobId') jobId: string) {
    const job = await this.exerciseQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();

    if (state === 'completed') {
      return ok(job.returnvalue, 'Job completed successfully');
    }

    if (state === 'failed') {
      return fail(
        job.failedReason || 'Job failed',
        `${HttpStatus.FAILED_DEPENDENCY}`,
      );
    }

    return { status: state };
  }

  @Post('exercise')
  async exercise(
    @Body()
    body: TeachAgentDto,
  ) {
    const exercises =
      await this.agentService.generateExercisesFromTaughtContent(
        body.userId,
        body.topicId,
      );

    return ok(exercises);
  }

  @Post('exercise/quick')
  async quickExercise(
    @Body()
    body: QuickExerciseDto,
  ) {
    const jobId = await this.agentService.generateQuickExercise(
      body.exerciseType,
      body.count,
      {
        configurable: { thread_id: body.threadId || 'quick-exercise-thread' },
        context: { user_id: body.userId, class_level: body.classLevel },
      },
    );
    return ok(
      { jobId },
      'Quick exercise generation job enqueued: poll the jobId for status',
    );
  }

  @Get('exercise-status/:jobId')
  async getExerciseStatus(@Param('jobId') jobId: string) {
    const job = await this.exerciseQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();

    if (state === 'completed') {
      return ok(job.returnvalue, 'Job completed successfully');
    }

    if (state === 'failed') {
      return fail(
        job.failedReason || 'Job failed',
        `${HttpStatus.FAILED_DEPENDENCY}`,
      );
    }

    return { status: state };
  }

  @Post('courses/subtopics')
  async subTopics(
    @Body()
    body: SubtopicsDto,
  ) {
    const data = await this.agentService.generateSubTopics(body.courseCode, {
      configurable: {
        thread_id: body.threadId || 'subtopic-generation-thread',
      },
      context: { user_id: 'system', level: 0 },
    });
    return ok(
      data,
      `Subtopic generation for ${body.courseCode} completed successfully`,
    );
  }
}
