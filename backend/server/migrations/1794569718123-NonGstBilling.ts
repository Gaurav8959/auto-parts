import { MigrationInterface, QueryRunner } from "typeorm";

// Purchases and sales with or without GST, all against the same stock.
// - purchase.is_gst / invoice.is_gst: 1 = with GST (every existing record), 0 = without GST
// - shop.non_gst_prefix: bills without GST are numbered in their own series (BILL-00001 …)
export class NonGstBilling1794569718123 implements MigrationInterface {
  name = "NonGstBilling1794569718123";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`shop\` ADD \`non_gst_prefix\` varchar(10) NOT NULL DEFAULT 'BILL'`);
    await queryRunner.query(`ALTER TABLE \`purchase\` ADD \`is_gst\` tinyint NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE \`invoice\` ADD \`is_gst\` tinyint NOT NULL DEFAULT 1`);

    // Until now a supplier bill without GST could only be entered with every line at 0%
    await queryRunner.query(`UPDATE \`purchase\` SET \`is_gst\` = 0 WHERE \`tax_total\` = 0`);

    // a shop whose GST invoices already use BILL keeps its numbers apart
    await queryRunner.query(`UPDATE \`shop\` SET \`non_gst_prefix\` = 'NOGST' WHERE \`invoice_prefix\` = 'BILL'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`is_gst\``);
    await queryRunner.query(`ALTER TABLE \`purchase\` DROP COLUMN \`is_gst\``);
    await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`non_gst_prefix\``);
  }
}
