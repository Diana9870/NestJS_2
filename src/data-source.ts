import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from './config/env.validation';
import { buildDataSourceOptions } from './database/data-source-options';

/**
 * Data source for the TypeORM CLI (`npm run migration:run` and friends) and
 * for the seed script. Reads the same .env as the application and validates it
 * the same way. The Nest application does not use this file.
 */
export default new DataSource(
  buildDataSourceOptions(validateEnv(process.env)),
);
