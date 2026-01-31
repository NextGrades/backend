// src/database/data-source.ts
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from 'src/academics/entities/course.entity';
import { CourseSubtopic } from 'src/academics/entities/course-subtopic.entity';
import { Field } from 'src/academics/entities/field.entity';
import { EducationStandard } from 'src/academics/entities/edu-standard.entity';

// Load .env for CLI usage
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Course, CourseSubtopic, Field, EducationStandard],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
