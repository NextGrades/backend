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
import { AskAgentDto, TeachAgentDto } from 'src/agent/dto/teach-agent.dto';
import { fail, ok } from 'src/common/http/response.helpers';
import { SubtopicsDto } from 'src/agent/dto/generate-agent.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SkipThrottle } from '@nestjs/throttler';

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
    const data = await this.agentService.teachTopic(body.userId, body.topicId);
    return ok(data, 'Teaching job enqueued: poll the jobId for status');
  }

  @Post('ask')
  async ask(
    @Body()
    body: AskAgentDto,
  ) {
    const result = await this.agentService.askFollowUp(
      body.userId,
      body.conversationId,
      body.question,
    );
    return ok(result);
  }

  @SkipThrottle()
  @Get('exercise-queue/:jobId')
  async getJobsInExerciseQueueStatus(@Param('jobId') jobId: string) {
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
    const data = await this.agentService.generateSubTopics(
      'system',
      body.courseCode,
    );
    return ok(
      data,
      `Subtopic generation for ${body.courseCode} completed successfully`,
    );
  }
}
