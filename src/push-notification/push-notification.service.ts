/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscriptionEntity } from '../push-subscription/entities/push-subscription.entity';
import * as webpush from 'web-push';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationService {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
    private readonly configSvc: ConfigService,
  ) {
    const mailTo = configSvc.get<string>(
      'MAIL_TO',
      'mailto:your-email@example.com',
    );

    const publicKey = configSvc.getOrThrow<string>('VAPID_PUBLIC_KEY');
    const privateKey = configSvc.getOrThrow<string>('VAPID_PRIVATE_KEY');
    // console.log('webpush', webpush);
    webpush.setVapidDetails(mailTo, publicKey, privateKey);
  }

  async notifyAll(payload: { message: string }): Promise<void> {
    const subscriptions = await this.repo.find();

    console.log(`🔔 Sending push to ${subscriptions.length} subscriptions`);
    console.log('Payload:', payload);
    const notification = JSON.stringify({
      title: 'Hello, Notifications!',
      body: payload.message,
    });

    const promises = subscriptions.map(async (sub) => {
      try {
        const response = await webpush.sendNotification(
          sub.subscription,
          notification,
        );

        console.log('✅ PUSH SENT');
        console.log('Endpoint:', sub.endpoint);
        console.log('Status:', response.statusCode);
        // console.log('Headers:', response.headers);
      } catch (err: any) {
        console.error('❌ PUSH FAILED');
        console.error('Endpoint:', sub.endpoint);

        if (err.statusCode) {
          console.error('Status code:', err.statusCode);
        }

        if (err.body) {
          console.error('Response body:', err.body);
        }

        console.error('Error:', err.message || err);
      }
    });

    await Promise.all(promises);
  }
}
