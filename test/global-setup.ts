import 'dotenv/config';
import { Client } from 'pg';
import { validateEnv } from '../src/config/env.validation';
import { testDatabaseName } from './test-db';

/**
 * Creates the test database once, before all tests, if it does not exist.
 * Connects to the maintenance database `postgres` with the credentials from .env.
 * The schema itself is created by the migrations inside the spec.
 */
export default async function globalSetup(): Promise<void> {
  const env = validateEnv(process.env);
  const admin = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: 'postgres',
  });
  await admin.connect();
  try {
    const name = testDatabaseName(env.DB_NAME);
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }
}
