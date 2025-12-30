import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Subject } from './subject.entity';

import { ClassLevel } from 'src/curriculum/entities/class-level.entity';
import { SubTheme } from 'src/curriculum/entities/sub-theme.entity';

@Entity({ name: 'themes' })
@Unique(['subject', 'classLevel', 'name'])
export class Theme {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subject, (subject: Subject) => subject.themes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @ManyToOne(() => ClassLevel, (classLevel: ClassLevel) => classLevel.themes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'class_level_id' })
  classLevel: ClassLevel;

  @Column()
  name: string;

  @OneToMany(() => SubTheme, (subTheme: SubTheme) => subTheme.theme)
  subThemes: SubTheme[];
}
