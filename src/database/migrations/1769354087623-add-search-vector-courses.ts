import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchVectorCourses1769354087623 implements MigrationInterface {
  name = 'AddSearchVectorCourses1769354087623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop obsolete indexes from initial schema
    await queryRunner.query(`
      DROP INDEX IF EXISTS courses_syllabus_fts
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS courses_syllabus_structured_gin
    `);

    // Add weighted search vector
    await queryRunner.query(`
      ALTER TABLE courses
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(code, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(canonical_title, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(syllabus::text, '')), 'C')
      ) STORED
    `);

    // Create GIN index for FTS
    await queryRunner.query(`
      CREATE INDEX courses_search_vector_idx
      ON courses
      USING GIN (search_vector)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new FTS index + column
    await queryRunner.query(`
      DROP INDEX IF EXISTS courses_search_vector_idx
    `);

    await queryRunner.query(`
      ALTER TABLE courses DROP COLUMN IF EXISTS search_vector
    `);

    // Restore old indexes (rollback safety)
    await queryRunner.query(`
      CREATE INDEX courses_syllabus_fts
      ON courses
      USING GIN (to_tsvector('english', syllabus))
    `);

    await queryRunner.query(`
      CREATE INDEX courses_syllabus_structured_gin
      ON courses
      USING GIN (syllabus_structured)
    `);
  }
}
