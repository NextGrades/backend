import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum CourseType {
  CORE = 'core',
  ELECTIVE = 'elective',
}

@Entity({ name: 'courses' })
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * School-specific course code (e.g. CSC 201, CMP 202)
   */
  @Column({ name: 'code', length: 20 })
  code: string;

  /**
   * Official course title used by the school
   */
  @Column({ name: 'title' })
  title: string;

  /**
   * Normalized / canonical title (e.g. "Data Structures")
   * Helps with cross-school mapping
   */
  @Column({ name: 'canonical_title', nullable: true })
  canonicalTitle?: string;

  /**
   * Level the course is typically taken (100–500)
   */
  @Column({ name: 'level', type: 'int' })
  level: number;

  /**
   * Credit unit value (impact on CGPA)
   */
  @Column({ name: 'credit_units', type: 'int' })
  creditUnits: number;

  /**
   * Core or Elective
   */
  @Column({
    name: 'type',
    type: 'enum',
    enum: CourseType,
    default: CourseType.CORE,
  })
  type: CourseType;

  /**
   * Raw official syllabus (human-readable)
   */
  @Column({ name: 'syllabus', type: 'jsonb' })
  syllabus: string;

  /**
   * Structured / machine-friendly syllabus
   */
  @Column({
    name: 'syllabus_structured',
    type: 'jsonb',
  })
  syllabusStructured: string[];

  /**
   * Optional semester hint (1 or 2)
   */
  @Column({ name: 'semester', type: 'int', nullable: true })
  semester?: number;

  /**
   * Used for analytics (difficulty, pass rate, etc.)
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
