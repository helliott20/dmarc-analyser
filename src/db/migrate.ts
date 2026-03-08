import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

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
    console.error('[Migrations] Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await migrationClient.end();
  }
}

runMigrations();
