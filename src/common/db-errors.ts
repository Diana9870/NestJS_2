import { QueryFailedError } from 'typeorm';

/** PostgreSQL error codes the service turns into HTTP answers. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * True if `error` is a TypeORM-wrapped PostgreSQL error with this code.
 * TypeORM puts the original driver error into `driverError`.
 */
export function isPgError(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === code;
}
