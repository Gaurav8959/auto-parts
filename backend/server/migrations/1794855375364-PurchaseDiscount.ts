import { MigrationInterface, QueryRunner } from "typeorm";

// A discount on each purchase line (a percent or a flat amount, before GST) and the bill's discount total.
// Purchases recorded before this had no discount, so every existing row starts at 0.

export class PurchaseDiscount1794855375364 implements MigrationInterface {
    name = 'PurchaseDiscount1794855375364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`purchase_item\` ADD \`discount_type\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`purchase_item\` ADD \`discount_value\` decimal(12,2) NOT NULL DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE \`purchase_item\` ADD \`discount_amount\` decimal(12,2) NOT NULL DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE \`purchase\` ADD \`discount_total\` decimal(12,2) NOT NULL DEFAULT '0.00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`purchase\` DROP COLUMN \`discount_total\``);
        await queryRunner.query(`ALTER TABLE \`purchase_item\` DROP COLUMN \`discount_amount\``);
        await queryRunner.query(`ALTER TABLE \`purchase_item\` DROP COLUMN \`discount_value\``);
        await queryRunner.query(`ALTER TABLE \`purchase_item\` DROP COLUMN \`discount_type\``);
    }

}
