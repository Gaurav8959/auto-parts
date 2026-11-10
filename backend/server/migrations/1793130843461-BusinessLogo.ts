import { MigrationInterface, QueryRunner } from "typeorm";

export class BusinessLogo1793130843461 implements MigrationInterface {
    name = 'BusinessLogo1793130843461'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`logo\` mediumtext NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`logo\``);
    }

}
