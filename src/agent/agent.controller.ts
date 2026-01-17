import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { TeachAgentDto } from 'src/agent/dto/teach-agent.dto';
import { ok } from 'src/common/http/response.helpers';
import { QuickExerciseDto } from 'src/agent/dto/generate-agent.dto';
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
    const content = await this.agentService.teachTopic(
      body.prompt,
      body.userId,
    );
    return ok(content);
  }

  @Post('exercise')
  async exercise(
    @Body()
    body: TeachAgentDto,
  ) {
    return this.agentService.generateExercises(body.prompt, body.userId);
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
      return fail(job.failedReason || 'Job failed');
    }

    return { status: state };
  }
}
