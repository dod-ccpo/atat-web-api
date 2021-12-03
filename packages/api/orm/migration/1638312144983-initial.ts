import * as fs from "fs";
import { join } from "path";
import { MigrationInterface, QueryRunner } from "typeorm";

export class initial1638312144983 implements MigrationInterface {
  private readonly migrationId = "1638312144983-initial";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(fs.readFileSync(join(__dirname, `${this.migrationId}-up.sql`)).toString());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(fs.readFileSync(join(__dirname, `${this.migrationId}-down.sql`)).toString());
  }
}
