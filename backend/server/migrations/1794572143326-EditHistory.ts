import { MigrationInterface, QueryRunner } from "typeorm";

// Edit history for invoices and purchases: one row per edit (who, when, what changed, the document before)

export class EditHistory1794572143326 implements MigrationInterface {
    name = 'EditHistory1794572143326'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`document_revision\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`document_type\` varchar(20) NOT NULL, \`document_id\` int NOT NULL, \`changes\` json NOT NULL, \`before\` json NOT NULL, \`created_by\` int NULL, \`updated_by\` int NULL, \`shop_id\` int NOT NULL, INDEX \`idx_revision_document\` (\`document_type\`, \`document_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`document_revision\` ADD CONSTRAINT \`FK_79d4745c4153a556f61eb9a4eda\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`document_revision\` ADD CONSTRAINT \`FK_86d04a23f721bd4370f75b08674\` FOREIGN KEY (\`updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`document_revision\` ADD CONSTRAINT \`FK_e57c9368ab08c4f94494c67a1f6\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`document_revision\` DROP FOREIGN KEY \`FK_e57c9368ab08c4f94494c67a1f6\``);
        await queryRunner.query(`ALTER TABLE \`document_revision\` DROP FOREIGN KEY \`FK_86d04a23f721bd4370f75b08674\``);
        await queryRunner.query(`ALTER TABLE \`document_revision\` DROP FOREIGN KEY \`FK_79d4745c4153a556f61eb9a4eda\``);
        await queryRunner.query(`DROP INDEX \`idx_revision_document\` ON \`document_revision\``);
        await queryRunner.query(`DROP TABLE \`document_revision\``);
    }

}
