import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

@Entity('push_subscriptions')
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'json' })
  subscription: PushSubscriptionPayload;

  @ManyToOne(() => User, (user) => user.pushSubscriptions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  user?: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
