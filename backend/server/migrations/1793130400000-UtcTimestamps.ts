import { MigrationInterface, QueryRunner } from "typeorm";

// Before connections were pinned to UTC, MySQL stamped createdAt/updatedAt in the server's local time
// while the app reads them as UTC (so they showed e.g. 5h30m late in India). This shifts existing
// stamps back by the server's UTC offset. A server already on UTC has an offset of 0: nothing changes.
export class UtcTimestamps1793130400000 implements MigrationInterface {
    name = 'UtcTimestamps1793130400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ offset }] = await queryRunner.query(`SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) AS offset`);
        const minutes = Number(offset);
        if (!minutes) return;

        const columns: { table: string; column: string }[] = await queryRunner.query(
            `SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS \`column\` FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('createdAt', 'updatedAt') AND DATA_TYPE = 'datetime'`
        );
        for (const { table, column } of columns) {
            // keep ON UPDATE from re-stamping updatedAt while createdAt is corrected
            const others = columns.filter((c) => c.table === table && c.column !== column).map((c) => `\`${c.column}\` = \`${c.column}\``);
            await queryRunner.query(
                `UPDATE \`${table}\` SET \`${column}\` = \`${column}\` - INTERVAL ? MINUTE${others.length ? ", " + others.join(", ") : ""} WHERE \`${column}\` IS NOT NULL`,
                [minutes]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // not reversible on its own: the original offset isn't recorded
    }
}
