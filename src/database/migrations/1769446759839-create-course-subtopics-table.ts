import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseSubtopicsTable1769446759839 implements MigrationInterface {
  name = 'CreateCourseSubtopicsTable1769446759839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."courses_search_vector_idx"`);
    await queryRunner.query(
      `CREATE TYPE "public"."course_subtopics_exam_frequency_enum" AS ENUM('high', 'medium', 'low')`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_subtopics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "syllabus_reference" character varying NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "teaching_order" integer NOT NULL, "exam_frequency" "public"."course_subtopics_exam_frequency_enum" NOT NULL DEFAULT 'medium', "prerequisites" text array NOT NULL DEFAULT ARRAY[]::text[], "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid, CONSTRAINT "PK_5ddf3a44783f074da0f65108ee2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fcccb59c7088348116bffd2978" ON "course_subtopics" ("courseId", "title") `,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP COLUMN "search_vector"`,
    );
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`,
      ['GENERATED_COLUMN', 'search_vector', 'neondb', 'public', 'courses'],
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "syllabus_structured" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_subtopics" ADD CONSTRAINT "FK_a1e24c697ec7f37c147cfcb77d3" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_subtopics" DROP CONSTRAINT "FK_a1e24c697ec7f37c147cfcb77d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "syllabus_structured" DROP NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
      ['neondb', 'public', 'courses', 'GENERATED_COLUMN', 'search_vector', ''],
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "search_vector" tsvector`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fcccb59c7088348116bffd2978"`,
    );
    await queryRunner.query(`DROP TABLE "course_subtopics"`);
    await queryRunner.query(
      `DROP TYPE "public"."course_subtopics_exam_frequency_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "courses_search_vector_idx" ON "courses" ("search_vector") `,
    );
  }
}
