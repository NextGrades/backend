import {
  Controller,
  Post,
  HttpCode,
  Body,
  Req,
  Delete,
  Get,
  Param,
} from '@nestjs/common';
import { CreatePushSubscriptionDto } from 'src/push-subscription/dto/create-push-subscription.dto';
import { PushSubscriptionService } from 'src/push-subscription/push-subscription.service';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('push-subscriptions')
export class PushSubscriptionController {
  constructor(
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  /**
   * Subscribe to push notifications
   * Works for anonymous AND authenticated users
   */
  @Post('subscribe')
  @HttpCode(200)
  async subscribe(
    @Body() dto: CreatePushSubscriptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.pushSubscriptionService.subscribe(dto, req.user);
  }

  /**
   * Unsubscribe from push notifications (by endpoint)
   */

  @Delete('unsubscribe/:endpoint')
  async unsubscribe(@Param('endpoint') endpoint: string) {
    await this.pushSubscriptionService.unsubscribeByEndpoint(endpoint);
  }
}

@Controller('admin/push-subscriptions')
export class PushSubscriptionAdminController {
  constructor(
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  @Get()
  async findAll() {
    return await this.pushSubscriptionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.pushSubscriptionService.findOne(+id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    return await this.pushSubscriptionService.remove(+id);
  }
}
