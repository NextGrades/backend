import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';

@Controller('push-notifications')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('test')
  @HttpCode(204)
  async sendTest(@Body('message') message: string) {
    await this.pushNotificationService.notifyAll({ message });
  }
}
