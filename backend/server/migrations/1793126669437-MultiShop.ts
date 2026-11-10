import { MigrationInterface, QueryRunner } from "typeorm";

export class MultiShop1793126669437 implements MigrationInterface {
    name = 'MultiShop1793126669437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Moves a single-shop database to the multi-shop model without losing data:
        // existing stock, customers, purchases and invoices become the first shop's.
        await queryRunner.query(`DROP INDEX \`IDX_4763c61264d54673ee262accbe\` ON \`purchase\``);
        await queryRunner.query(`DROP INDEX \`IDX_c7ec75a1a4068196ea74b920df\` ON \`invoice\``);
        await queryRunner.query(`CREATE TABLE \`shop\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`name\` varchar(150) NOT NULL, \`code\` varchar(10) NOT NULL, \`tagline\` varchar(150) NULL, \`address\` text NULL, \`phone\` varchar(30) NULL, \`email\` varchar(100) NULL, \`gstin\` varchar(20) NULL, \`invoice_terms\` text NULL, \`invoice_prefix\` varchar(10) NOT NULL, \`purchase_prefix\` varchar(10) NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NULL, \`updated_by\` int NULL, UNIQUE INDEX \`IDX_93c27a003c9f8986eec610c35c\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`shop_stock\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`quantity\` decimal(12,2) NOT NULL DEFAULT '0.00', \`reorder_level\` decimal(12,2) NOT NULL DEFAULT '5.00', \`rack_location\` varchar(50) NULL, \`avg_cost\` decimal(12,2) NOT NULL DEFAULT '0.00', \`shop_id\` int NOT NULL, \`product_id\` int NOT NULL, UNIQUE INDEX \`uq_shop_stock\` (\`shop_id\`, \`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // 1. the first shop, built from the old shop settings (only if there is data to own)
        const [{ hasData }] = await queryRunner.query(
            `SELECT (SELECT COUNT(*) FROM product) + (SELECT COUNT(*) FROM customer) + (SELECT COUNT(*) FROM invoice) + (SELECT COUNT(*) FROM purchase) AS hasData`
        );
        let shopId: number | null = null;
        if (Number(hasData) > 0) {
            const [invoiceSeq] = await queryRunner.query(`SELECT prefix FROM sequence WHERE name = 'INVOICE_NUMBER'`);
            const [purchaseSeq] = await queryRunner.query(`SELECT prefix FROM sequence WHERE name = 'PURCHASE_NUMBER'`);
            const inserted = await queryRunner.query(
                `INSERT INTO shop (name, code, tagline, address, phone, email, gstin, invoice_terms, invoice_prefix, purchase_prefix, is_active)
                 SELECT COALESCE(shop_name, 'Main Shop'), 'MAIN', tagline, address, phone, email, gstin, invoice_terms, ?, ?, 1 FROM shop_setting WHERE id = 1`,
                [invoiceSeq?.prefix || "INV", purchaseSeq?.prefix || "PUR"]
            );
            if (!inserted.affectedRows) {
                await queryRunner.query(
                    `INSERT INTO shop (name, code, invoice_prefix, purchase_prefix) VALUES ('Main Shop', 'MAIN', ?, ?)`,
                    [invoiceSeq?.prefix || "INV", purchaseSeq?.prefix || "PUR"]
                );
            }
            const [{ id }] = await queryRunner.query(`SELECT id FROM shop WHERE code = 'MAIN'`);
            shopId = Number(id);

            // 2. product stock becomes this shop's stock
            await queryRunner.query(
                `INSERT INTO shop_stock (shop_id, product_id, quantity, reorder_level, rack_location, avg_cost)
                 SELECT ?, id, stock_quantity, reorder_level, rack_location, purchase_price FROM product`,
                [shopId]
            );

            // 3. document numbering carries on per shop
            await queryRunner.query(`UPDATE sequence SET name = CONCAT(name, ':', ?) WHERE name IN ('INVOICE_NUMBER', 'PURCHASE_NUMBER')`, [shopId]);
        }

        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`tagline\``);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`address\``);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`phone\``);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`gstin\``);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` DROP COLUMN \`invoice_terms\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`stock_quantity\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`rack_location\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`shop_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_f8ccf35fe3e1b328839cd8e239\` (\`shop_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f8ccf35fe3e1b328839cd8e239\` ON \`user\` (\`shop_id\`)`);

        // 4. existing records belong to the first shop; the column is filled before it becomes NOT NULL
        for (const table of ["purchase", "customer", "invoice", "stock_transaction"]) {
            await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`shop_id\` int NULL`);
            if (shopId) await queryRunner.query(`UPDATE \`${table}\` SET shop_id = ?`, [shopId]);
            await queryRunner.query(`ALTER TABLE \`${table}\` MODIFY \`shop_id\` int NOT NULL`);
        }

        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_purchase_shop_number\` ON \`purchase\` (\`shop_id\`, \`purchase_number\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_invoice_shop_number\` ON \`invoice\` (\`shop_id\`, \`invoice_number\`)`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD CONSTRAINT \`FK_4b904835d318a98b64f1eb5308e\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shop\` ADD CONSTRAINT \`FK_27020689a0ed9b67c9d40a35e6b\` FOREIGN KEY (\`updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_f8ccf35fe3e1b328839cd8e2395\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`purchase\` ADD CONSTRAINT \`FK_5896eb37ddc2302927d13a26e14\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`customer\` ADD CONSTRAINT \`FK_561fe80ab7b151f18c4a6f74403\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invoice\` ADD CONSTRAINT \`FK_5f5c24c473283e48c166dc90566\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stock_transaction\` ADD CONSTRAINT \`FK_fc91912a6d4ec71b081e164ea13\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shop_stock\` ADD CONSTRAINT \`FK_8ff0916aa741752ffceade6bfc7\` FOREIGN KEY (\`shop_id\`) REFERENCES \`shop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shop_stock\` ADD CONSTRAINT \`FK_b27710e0e9e57d11a3a9dceeba7\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    // Reverting drops shop data (stock per shop, shop ownership); restore from a backup instead if it matters.
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shop_stock\` DROP FOREIGN KEY \`FK_b27710e0e9e57d11a3a9dceeba7\``);
        await queryRunner.query(`ALTER TABLE \`shop_stock\` DROP FOREIGN KEY \`FK_8ff0916aa741752ffceade6bfc7\``);
        await queryRunner.query(`ALTER TABLE \`stock_transaction\` DROP FOREIGN KEY \`FK_fc91912a6d4ec71b081e164ea13\``);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP FOREIGN KEY \`FK_5f5c24c473283e48c166dc90566\``);
        await queryRunner.query(`ALTER TABLE \`customer\` DROP FOREIGN KEY \`FK_561fe80ab7b151f18c4a6f74403\``);
        await queryRunner.query(`ALTER TABLE \`purchase\` DROP FOREIGN KEY \`FK_5896eb37ddc2302927d13a26e14\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_f8ccf35fe3e1b328839cd8e2395\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP FOREIGN KEY \`FK_27020689a0ed9b67c9d40a35e6b\``);
        await queryRunner.query(`ALTER TABLE \`shop\` DROP FOREIGN KEY \`FK_4b904835d318a98b64f1eb5308e\``);
        await queryRunner.query(`DROP INDEX \`uq_invoice_shop_number\` ON \`invoice\``);
        await queryRunner.query(`DROP INDEX \`uq_purchase_shop_number\` ON \`purchase\``);
        await queryRunner.query(`DROP INDEX \`REL_f8ccf35fe3e1b328839cd8e239\` ON \`user\``);
        await queryRunner.query(`ALTER TABLE \`stock_transaction\` DROP COLUMN \`shop_id\``);
        await queryRunner.query(`ALTER TABLE \`invoice\` DROP COLUMN \`shop_id\``);
        await queryRunner.query(`ALTER TABLE \`customer\` DROP COLUMN \`shop_id\``);
        await queryRunner.query(`ALTER TABLE \`purchase\` DROP COLUMN \`shop_id\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_f8ccf35fe3e1b328839cd8e239\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`shop_id\``);
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`rack_location\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`stock_quantity\` decimal(12,2) NOT NULL DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`invoice_terms\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`gstin\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`email\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`phone\` varchar(30) NULL`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`address\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`shop_setting\` ADD \`tagline\` varchar(150) NULL`);
        await queryRunner.query(`DROP INDEX \`uq_shop_stock\` ON \`shop_stock\``);
        await queryRunner.query(`DROP TABLE \`shop_stock\``);
        await queryRunner.query(`DROP INDEX \`IDX_93c27a003c9f8986eec610c35c\` ON \`shop\``);
        await queryRunner.query(`DROP TABLE \`shop\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c7ec75a1a4068196ea74b920df\` ON \`invoice\` (\`invoice_number\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_4763c61264d54673ee262accbe\` ON \`purchase\` (\`purchase_number\`)`);
    }

}
