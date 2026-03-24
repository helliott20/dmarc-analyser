import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Maps a drizzle column definition to a Postgres SQL type string.
 */
function columnToSqlType(column: PgColumn): string {
  const ct = column.columnType;

  switch (ct) {
    case 'PgUUID':
      return 'uuid';
    case 'PgVarchar': {
      const length = (column as any).config?.length;
      return length ? `varchar(${length})` : 'varchar';
    }
    case 'PgText':
      return 'text';
    case 'PgBoolean':
      return 'boolean';
    case 'PgInteger':
      return 'integer';
    case 'PgBigInt53':
      return 'bigint';
    case 'PgTimestamp':
      return 'timestamp';
    case 'PgJsonb':
      return 'jsonb';
    case 'PgInet':
      return 'inet';
    case 'PgEnumColumn': {
      // Use the enum name from the column's enum definition
      const enumInstance = (column as any).enum;
      if (enumInstance?.enumName) {
        return enumInstance.enumName;
      }
      // Fallback: read from config
      const enumName = (column as any).config?.enum?.enumName;
      return enumName || 'text';
    }
    default:
      return 'text';
  }
}

/**
 * Builds the full SQL column definition including NOT NULL and DEFAULT.
 */
function columnToSqlDef(column: PgColumn): string {
  let sql = columnToSqlType(column);

  if (column.hasDefault) {
    const def = column.default;
    if (typeof def === 'string') {
      sql += ` DEFAULT '${def}'`;
    } else if (typeof def === 'number' || typeof def === 'boolean') {
      sql += ` DEFAULT ${def}`;
    } else if (def !== undefined && def !== null) {
      // SQL expression default (like defaultNow, defaultRandom) — skip for ALTER TABLE
      // These are handled by Postgres internally or are generation expressions
      const sqlDefault = (column as any).defaultFn ? null : String(def);
      if (sqlDefault) {
        sql += ` DEFAULT ${sqlDefault}`;
      }
    }
  }

  if (column.notNull) {
    sql += ' NOT NULL';
  }

  return sql;
}

/**
 * Iterates all tables in the schema, checks for missing columns in the DB,
 * and adds them via ALTER TABLE.
 */
async function syncSchemaColumns(client: postgres.Sql) {
  // Collect all pgTable objects from the schema
  const tables: PgTable[] = [];
  for (const value of Object.values(schema)) {
    // pgTable objects have a Symbol that marks them; getTableConfig will work on them
    if (value && typeof value === 'object' && 'getSQL' in value) {
      // Not a table — relations and enums also exist in schema
    }
    try {
      const config = getTableConfig(value as PgTable);
      if (config?.name && config?.columns) {
        tables.push(value as PgTable);
      }
    } catch {
      // Not a table (enum, relation, etc.) — skip
    }
  }

  // Get all existing columns in the public schema
  const existingCols = await client`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const existingSet = new Set(
    existingCols.map((r) => `${r.table_name}.${r.column_name}`)
  );

  let addedCount = 0;

  for (const table of tables) {
    const { name: tableName, columns } = getTableConfig(table);

    // Skip if the table doesn't exist at all (initial migration handles full table creation)
    const tableExists = existingCols.some((r) => r.table_name === tableName);
    if (!tableExists) continue;

    for (const column of columns) {
      const key = `${tableName}.${column.name}`;
      if (!existingSet.has(key)) {
        const colDef = columnToSqlDef(column);
        console.log(`[Migrations] Adding missing column: ${key} (${colDef})`);
        await client.unsafe(
          `ALTER TABLE "${tableName}" ADD COLUMN "${column.name}" ${colDef}`
        );
        addedCount++;
      }
    }
  }

  if (addedCount === 0) {
    console.log('[Migrations] All columns are in sync');
  } else {
    console.log(`[Migrations] Added ${addedCount} missing column(s)`);
  }
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('[Migrations] DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('[Migrations] Connecting to database...');

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    console.log('[Migrations] Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[Migrations] Migrations completed successfully');
  } catch (error) {
    console.log('[Migrations] Drizzle file migrations skipped or failed:', error);
  }

  try {
    await syncSchemaColumns(migrationClient);
    console.log('[Migrations] Schema sync complete');
  } catch (error) {
    console.error('[Migrations] Schema sync failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }

  // Auto-seed global known senders (safe to run repeatedly - uses onConflictDoNothing)
  try {
    const { seedKnownSenders } = await import('./seeds/known-senders');
    await seedKnownSenders();
  } catch (error) {
    console.log('[Migrations] Known senders seed skipped:', error);
  }
}

runMigrations();
