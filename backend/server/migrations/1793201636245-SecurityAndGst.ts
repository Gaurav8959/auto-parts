import { MigrationInterface, QueryRunner } from "typeorm";

// - user.token_version: ends older sessions on password change / reset / "sign out other devices"
// - invoice_payment.type: refunds on cancelling are recorded as negative payments
// - invoice.place_of_supply / is_inter_state: IGST for inter-state supplies
//
// Existing invoices keep the CGST/SGST split they were printed with (is_inter_state = 0).
// Invoices cancelled before refunds were tracked get the refund the reports already assumed:
// a negative payment of what was paid, on the cancellation date, in the mode last used.
export class SecurityAndGst1793201636245 implements MigrationInterface {
    name = 'SecurityAndGst1793201636245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`token_version\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`invoice_payment\` ADD \`type\` varchar(10) NOT NULL DEFAULT 'PAYMENT'`);
        await queryRunner.query(`ALTER TABLE \`invoice\` ADD \`place_of_supply\` varchar(2) NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice\` ADD \`is_inter_state\` tinyint NOT NULL DEFAULT 0`);

        // timestamps are stored in UTC (see connectDatabase); the CLI session may not be
        await queryRunner.query(`
            INSERT INTO \`invoice_payment\` (\`invoice_id\`, \`type\`, \`amount\`, \`payment_mode\`, \`paid_at\`, \`note\`, \`created_by\`, \`updated_by\`, \`createdAt\`, \`updatedAt\`)
            SELECT i.\`id\`, 'REFUND', -i.\`paid_amount\`,
                   COALESCE((SELECT p.\`payment_mode\` FROM \`invoice_payment\` p WHERE p.\`invoice_id\` = i.\`id\` ORDER BY p.\`id\` DESC LIMIT 1), 'CASH'),
                   COALESCE(i.\`cancelled_at\`, UTC_TIMESTAMP()),
                   'Refunded on cancellation (recorded when refunds were added)',
                   i.\`cancelled_by\`, i.\`cancelled_by\`, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
            FROM \`invoice\` i
            WHERE i.\`status\` = 'CANCELLED' AND i.\`paid_amount\` > 0`);
        await queryRunner.query(`
            UPDATE \`invoice\` SET \`paid_amount\` = 0, \`payment_status\` = 'UNPAID'
            WHERE \`status\` = 'CANCELLED' AND \`paid_amount\` > 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`invoice\` i
            JOIN (SELECT \`invoice_id\`, -SUM(\`amount\`) AS refunded FROM \`invoice_payment\` WHERE \`type\` = 'REFUND' GROUP BY \`invoice_id\`) r
              ON r.\`invoice_id\` = i.\`id\`
            SET i.\`paid_amount\` = r.refunded,
                i.\`payment_status\` = IF(r.refunded >= i.\`grand_total\`, 'PAID', 'PARTIAL')`);
        await queryRunner.query(`DELETE FROM \`invoice_payment\` WHERE \`type\` = 'REFUND'`);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`is_inter_state\``);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`place_of_supply\``);
        await queryRunner.query(`ALTER TABLE \`invoice_payment\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`token_version\``);
    }

}
