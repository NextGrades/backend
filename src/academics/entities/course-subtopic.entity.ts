import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from './course.entity';

export enum ExamFrequency {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Entity({ name: 'course_subtopics' })
@Index(['course', 'title'], { unique: true })
export class CourseSubtopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Parent course (e.g. EEE 211)
   */
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  course: Course;

  /**
   * High-level syllabus line this subtopic was derived from
   * e.g. "Basic Circuit Laws and Theorems"
   */
  @Column({ name: 'syllabus_reference' })
  syllabusReference: string;

  /**
   * Subtopic title
   * e.g. "Kirchhoff’s Voltage Law"
   */
  @Column()
  title: string;

  /**
   * Short academic description of the subtopic
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Typical teaching order in the semester
   * Used for sequencing lessons
   */
  @Column({ type: 'int', name: 'teaching_order' })
  teachingOrder: number;

  /**
   * How often this topic appears in exams
   * Used by exam engine & revision prioritization
   */
  @Column({
    type: 'enum',
    enum: ExamFrequency,
    name: 'exam_frequency',
    default: ExamFrequency.MEDIUM,
  })
  examFrequency: ExamFrequency;

  /**
   * Prerequisite subtopics or concepts
   * Stored as plain text to avoid tight coupling
   */
  @Column({
    type: 'text',
    array: true,
    name: 'prerequisites',
    default: () => 'ARRAY[]::text[]',
  })
  prerequisites: string[];

  /**
   * Whether this subtopic is active
   * Allows lecturers/admins to disable without deleting
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
