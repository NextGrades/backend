// src/database/data-source.ts
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from 'src/academics/entities/course.entity';
import { CourseSubtopic } from 'src/academics/entities/course-subtopic.entity';

// Load .env for CLI usage
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Course, CourseSubtopic],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
