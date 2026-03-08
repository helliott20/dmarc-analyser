import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function ensureColumns(client: postgres.Sql) {
  // Define columns that should exist on user_preferences
  // Add new columns here as the schema evolves
  const requiredColumns: { name: string; sql: string }[] = [
    { name: 'email_alert_notifications', sql: 'boolean NOT NULL DEFAULT true' },
    { name: 'email_alert_severity', sql: "varchar(50) NOT NULL DEFAULT 'warning,critical'" },
    { name: 'email_digest_frequency', sql: "varchar(20) NOT NULL DEFAULT 'weekly'" },
    { name: 'email_quiet_hours_start', sql: 'integer' },
    { name: 'email_quiet_hours_end', sql: 'integer' },
  ];

  const existing = await client`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  `;
  const existingNames = new Set(existing.map((r) => r.column_name));

  for (const col of requiredColumns) {
    if (!existingNames.has(col.name)) {
      console.log(`[Migrations] Adding missing column: user_preferences.${col.name}`);
      await client.unsafe(`ALTER TABLE user_preferences ADD COLUMN ${col.name} ${col.sql}`);
    }
  }
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('[Migrations] DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('[Migrations] Connecting to database...');

  // Create a separate connection for migrations
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    console.log('[Migrations] Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[Migrations] Migrations completed successfully');
  } catch (error) {
    console.log('[Migrations] Drizzle migrations failed, trying column sync...', error);
  }

  try {
    await ensureColumns(migrationClient);
    console.log('[Migrations] Column check complete');
  } catch (error) {
    console.error('[Migrations] Column sync failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
