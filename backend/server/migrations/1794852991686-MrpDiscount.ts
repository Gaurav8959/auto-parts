import { MigrationInterface, QueryRunner } from "typeorm";

// Discount off MRP on a product, as a percent or a flat amount: shown while billing, never on the invoice

export class MrpDiscount1794852991686 implements MigrationInterface {
    name = 'MrpDiscount1794852991686'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`mrp_discount_type\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`mrp_discount_value\` decimal(12,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`mrp_discount_value\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`mrp_discount_type\``);
    }

}
