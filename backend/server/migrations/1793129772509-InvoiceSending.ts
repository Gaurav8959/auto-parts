import { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceSending1793129772509 implements MigrationInterface {
    name = 'InvoiceSending1793129772509'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`invoice_email\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`to_address\` varchar(255) NOT NULL, \`cc_address\` varchar(255) NULL, \`subject\` varchar(255) NOT NULL, \`status\` varchar(10) NOT NULL, \`error\` varchar(500) NULL, \`created_by\` int NULL, \`updated_by\` int NULL, \`invoice_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`logo\` mediumtext NULL`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`bank_name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`bank_account_name\` varchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`bank_account_number\` varchar(40) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`bank_ifsc\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD \`upi_id\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice\` ADD \`customer_email\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice\` ADD \`due_date\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`invoice_email\` ADD CONSTRAINT \`FK_3f5d2e72925e182e26a4a7177a9\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invoice_email\` ADD CONSTRAINT \`FK_bad747a7bbad9e535cd9651603e\` FOREIGN KEY (\`updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invoice_email\` ADD CONSTRAINT \`FK_390e9845a269c73c48f615b1d22\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoice\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`invoice_email\` DROP FOREIGN KEY \`FK_390e9845a269c73c48f615b1d22\``);
        await queryRunner.query(`ALTER TABLE \`invoice_email\` DROP FOREIGN KEY \`FK_bad747a7bbad9e535cd9651603e\``);
        await queryRunner.query(`ALTER TABLE \`invoice_email\` DROP FOREIGN KEY \`FK_3f5d2e72925e182e26a4a7177a9\``);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`due_date\``);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`customer_email\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`upi_id\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`bank_ifsc\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`bank_account_number\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`bank_account_name\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`bank_name\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP COLUMN \`logo\``);
        await queryRunner.query(`DROP TABLE \`invoice_email\``);
    }

}
