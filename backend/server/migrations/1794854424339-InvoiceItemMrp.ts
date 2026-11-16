import { MigrationInterface, QueryRunner } from "typeorm";

// MRP and its discount on each invoice line, as they stood when billed (shown to staff, never printed).
// Lines billed before this take their product's current values: the closest record there is.

export class InvoiceItemMrp1794854424339 implements MigrationInterface {
    name = 'InvoiceItemMrp1794854424339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`invoice_item\` ADD \`mrp\` decimal(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice_item\` ADD \`mrp_discount_type\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice_item\` ADD \`mrp_discount_value\` decimal(12,2) NULL`);
        await queryRunner.query(
            `UPDATE \`invoice_item\` ii JOIN \`product\` p ON p.\`id\` = ii.\`product_id\`
             SET ii.\`mrp\` = NULLIF(p.\`mrp\`, 0),
                 ii.\`mrp_discount_type\` = IF(p.\`mrp\` > 0 AND p.\`mrp_discount_value\` > 0, p.\`mrp_discount_type\`, NULL),
                 ii.\`mrp_discount_value\` = IF(p.\`mrp\` > 0 AND p.\`mrp_discount_value\` > 0, p.\`mrp_discount_value\`, NULL)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`invoice_item\` DROP COLUMN \`mrp_discount_value\``);
        await queryRunner.query(`ALTER TABLE \`invoice_item\` DROP COLUMN \`mrp_discount_type\``);
        await queryRunner.query(`ALTER TABLE \`invoice_item\` DROP COLUMN \`mrp\``);
    }

}
