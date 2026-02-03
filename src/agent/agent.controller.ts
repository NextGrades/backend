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
import { ok } from 'src/common/http/response.helpers';
import { SubtopicsDto } from 'src/agent/dto/generate-agent.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiRequestError } from 'src/common/http/api-response';

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
      throw new ApiRequestError({
        message: job.failedReason || 'Job failed',
        statusCode: HttpStatus.FAILED_DEPENDENCY,
      });
    }

    return ok({ status: state }, 'this job is still getting processed');
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
