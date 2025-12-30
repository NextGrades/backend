import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SubTheme } from './sub-theme.entity';

@Entity({ name: 'topics' })
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SubTheme, (subTheme) => subTheme.topics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sub_theme_id' })
  subTheme: SubTheme;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  performanceObjectives: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  content: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  teacherActivities: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  pupilActivities: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  materials: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evaluationGuide: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
