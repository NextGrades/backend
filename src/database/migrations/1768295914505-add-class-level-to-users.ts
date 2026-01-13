import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassLevelToUsers1768295914505 implements MigrationInterface {
  name = 'AddClassLevelToUsers1768295914505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "classLevel" integer NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "classLevel"`);
  }
}
