import { Module } from '@nestjs/common';
import { PushSubscriptionService } from './push-subscription.service';
import {
  PushSubscriptionAdminController,
  PushSubscriptionController,
} from './push-subscription.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { PushSubscriptionEntity } from 'src/push-subscription/entities/push-subscription.entity';

@Module({
  imports: [LoggerModule, TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushSubscriptionController, PushSubscriptionAdminController],
  providers: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
