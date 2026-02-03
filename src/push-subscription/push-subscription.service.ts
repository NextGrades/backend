import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PushSubscriptionService {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
  ) {}

  async subscribe(dto: CreatePushSubscriptionDto, user?: User): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .values({
        endpoint: dto.endpoint,
        subscription: {
          endpoint: dto.endpoint,
          keys: dto.keys,
        },
        user: user ?? null,
      })
      .orIgnore()
      .execute();
  }

  async unsubscribeByEndpoint(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }

  // ---- admin/debug ----

  async findAll(): Promise<PushSubscriptionEntity[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<PushSubscriptionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
