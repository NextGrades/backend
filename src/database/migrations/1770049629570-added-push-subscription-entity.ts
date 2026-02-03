import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedPushSubscriptionEntity1770049629570 implements MigrationInterface {
    name = 'AddedPushSubscriptionEntity1770049629570'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "push_subscriptions" ("id" SERIAL NOT NULL, "endpoint" text NOT NULL, "subscription" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0008bdfd174e533a3f98bf9af1" ON "push_subscriptions" ("endpoint") `);
        await queryRunner.query(`ALTER TABLE "course_subtopics" ALTER COLUMN "prerequisites" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_4cc061875e9eecc311a94b3e431" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_4cc061875e9eecc311a94b3e431"`);
        await queryRunner.query(`ALTER TABLE "course_subtopics" ALTER COLUMN "prerequisites" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0008bdfd174e533a3f98bf9af1"`);
        await queryRunner.query(`DROP TABLE "push_subscriptions"`);
    }

}
