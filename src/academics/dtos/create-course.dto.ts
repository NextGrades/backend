import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
  Max,
  IsArray,
} from 'class-validator';
import { CourseType } from '../entities/course.entity';
import { ExamFrequency } from 'src/academics/entities/course-subtopic.entity';

export class CreateCourseDto {
  /**
   * School-specific course code (e.g. CSC 201, CMP 202)
   */
  @IsString()
  @MaxLength(20)
  code: string;

  /**
   * Official course title
   */
  @IsString()
  title: string;

  /**
   * Normalized / canonical title
   */
  @IsOptional()
  @IsString()
  canonicalTitle?: string;

  /**
   * Level (100–500)
   */
  @IsInt()
  @Min(100)
  @Max(500)
  level: number;

  /**
   * Credit units (e.g. 1–10)
   */
  @IsInt()
  @Min(1)
  @Max(10)
  creditUnits: number;

  /**
   * Core or Elective
   */
  @IsEnum(CourseType)
  @IsOptional()
  type?: CourseType;

  /**
   * Semester hint (1 or 2)
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  semester?: number;

  @IsString()
  syllabus: string;

  /**
   * Analytics / visibility flag
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCourseSubtopicDto {
  @IsString()
  courseId: string;
  @IsString()
  courseCode: string;

  @IsString()
  syllabusReference: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  teachingOrder: number;

  @IsOptional()
  @IsEnum(ExamFrequency)
  examFrequency?: ExamFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}

import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class BulkCreateCourseSubtopicsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSubtopicDto)
  subtopics: CreateCourseSubtopicDto[];
}
