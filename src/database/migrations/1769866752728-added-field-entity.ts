import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedFieldEntity1769866752728 implements MigrationInterface {
    name = 'AddedFieldEntity1769866752728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "fields" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text, CONSTRAINT "PK_ee7a215c6cd77a59e2cb3b59d41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_712fd1134fa6faf74e09b0bd75" ON "fields" ("name") `);
        await queryRunner.query(`CREATE TABLE "education_standards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "country" character varying, CONSTRAINT "PK_f9e83a58f5ed3f735f8a9f212e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_641e0c2847924abdb401cb3cbe" ON "education_standards" ("name") `);
        await queryRunner.query(`ALTER TABLE "courses" ADD "fieldId" integer`);
        await queryRunner.query(`ALTER TABLE "course_subtopics" ALTER COLUMN "prerequisites" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "courses" ADD CONSTRAINT "FK_6f6440e40d1dbcdde4f59155575" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "courses" DROP CONSTRAINT "FK_6f6440e40d1dbcdde4f59155575"`);
        await queryRunner.query(`ALTER TABLE "course_subtopics" ALTER COLUMN "prerequisites" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "fieldId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_641e0c2847924abdb401cb3cbe"`);
        await queryRunner.query(`DROP TABLE "education_standards"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_712fd1134fa6faf74e09b0bd75"`);
        await queryRunner.query(`DROP TABLE "fields"`);
    }

}
