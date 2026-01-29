import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseSchema1769281769545 implements MigrationInterface {
  name = 'AddCourseSchema1769281769545';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."courses_type_enum" AS ENUM('core', 'elective')`,
    );
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "title" character varying NOT NULL, "canonical_title" character varying, "level" integer NOT NULL, "credit_units" integer NOT NULL, "type" "public"."courses_type_enum" NOT NULL DEFAULT 'core', "syllabus" jsonb NOT NULL, "syllabus_structured" jsonb, "semester" integer, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`,
    );
    // Add FTS index on raw text syllabus
    await queryRunner.query(`
      CREATE INDEX courses_syllabus_fts
      ON courses
      USING GIN (to_tsvector('english', syllabus));
    `);

    // Optional: GIN index on jsonb structured syllabus
    await queryRunner.query(`
      CREATE INDEX courses_syllabus_structured_gin
      ON courses
      USING GIN (syllabus_structured);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS courses_syllabus_fts`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS courses_syllabus_structured_gin`,
    );
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TYPE "public"."courses_type_enum"`);
  }
}
