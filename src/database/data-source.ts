// src/database/data-source.ts
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

// Load .env for CLI usage
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
