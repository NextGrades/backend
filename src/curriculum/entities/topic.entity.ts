import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SubTheme } from './sub-theme.entity';

@Entity({ name: 'topics' })
@Index('idx_topics_sub_theme', ['subTheme'])
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SubTheme, (subTheme) => subTheme.topics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sub_theme_id' })
  subTheme: SubTheme;

  @Column({ type: 'text' })
  name: string;

  @Column({
    name: 'performance_objectives',
    type: 'jsonb',
    default: () => "'[]'",
  })
  performanceObjectives: any[];

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
  })
  content: any[];

  @Column({
    name: 'teacher_activities',
    type: 'jsonb',
    default: () => "'[]'",
  })
  teacherActivities: any[];

  @Column({
    name: 'pupil_activities',
    type: 'jsonb',
    default: () => "'[]'",
  })
  pupilActivities: any[];

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
  })
  materials: any[];

  @Column({
    name: 'evaluation_guide',
    type: 'jsonb',
    default: () => "'[]'",
  })
  evaluationGuide: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
