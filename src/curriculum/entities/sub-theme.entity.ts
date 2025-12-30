import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Theme } from 'src/curriculum/entities/theme.entity';
import { Topic } from 'src/curriculum/entities/topic.entity';

@Entity({ name: 'sub_themes' })
@Unique(['theme', 'name'])
export class SubTheme {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Theme, (theme) => theme.subThemes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'theme_id' })
  theme: Theme;

  @Column()
  name: string;

  @OneToMany(() => Topic, (topic) => topic.subTheme)
  topics: Topic[];
}
