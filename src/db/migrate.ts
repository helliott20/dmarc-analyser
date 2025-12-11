import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    // Check if the database already has the core tables
    const tableCheck = await migrationClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `;

    const schemaExists = tableCheck[0]?.exists;

    if (schemaExists) {
      console.log('[Migrations] Database schema already exists');

      // Ensure the migration is marked as applied so future runs don't fail
      // Get the migration file name from the drizzle folder
      const migrationsFolder = './drizzle';
      const migrationFiles = fs.readdirSync(migrationsFolder)
        .filter(f => f.endsWith('.sql'))
        .sort();

      if (migrationFiles.length > 0) {
        const migrationFile = migrationFiles[0];
        const migrationName = migrationFile.replace('.sql', '');
        const migrationContent = fs.readFileSync(path.join(migrationsFolder, migrationFile), 'utf-8');
        const hash = crypto.createHash('sha256').update(migrationContent).digest('hex');

        // Check if this migration is already recorded
        const existingMigration = await migrationClient`
          SELECT 1 FROM drizzle.__drizzle_migrations
          WHERE hash = ${hash}
          LIMIT 1
        `.catch(() => []);

        if (existingMigration.length === 0) {
          // Record the migration as applied
          await migrationClient`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
            ON CONFLICT DO NOTHING
          `;
          console.log('[Migrations] Marked existing schema migration as applied');
        } else {
          console.log('[Migrations] Migration already recorded');
        }
      }

      console.log('[Migrations] Skipping migrations - schema is up to date');
    } else {
      // Fresh database - run migrations normally
      console.log('[Migrations] Running migrations on fresh database...');
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('[Migrations] Migrations completed successfully');
    }
  } catch (error) {
    console.error('[Migrations] Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await migrationClient.end();
  }
}

runMigrations();
