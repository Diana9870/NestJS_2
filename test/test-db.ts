/**
 * The e2e tests wipe their database (drop, migrate, truncate), so they run on
 * a separate database: the name from .env with `_test` added (`cinema_test`).
 * Data of the development database is never touched.
 */
export const testDatabaseName = (name: string): string =>
  name.endsWith('_test') ? name : `${name}_test`;
