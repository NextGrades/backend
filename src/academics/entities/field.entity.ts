import { Course } from 'src/academics/entities/course.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  Column,
  OneToMany,
} from 'typeorm';

@Entity('fields')
export class Field {
  @PrimaryGeneratedColumn()
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Course, (course) => course.field)
  courses: Course[];
}
