import * as fs from "fs";
import { join } from "path";
import { MigrationInterface, QueryRunner } from "typeorm";

export class nullableOwner1640632347115 implements MigrationInterface {
  private readonly migrationId = "1640632347115-nullable-owner";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(fs.readFileSync(join(__dirname, `${this.migrationId}-up.sql`)).toString());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(fs.readFileSync(join(__dirname, `${this.migrationId}-down.sql`)).toString());
  }
}
