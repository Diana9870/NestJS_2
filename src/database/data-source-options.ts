import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingSeat } from '../bookings/entities/booking-seat.entity';
import { EnvironmentVariables } from '../config/env.validation';
import { Film } from '../films/entities/film.entity';
import { Hall } from '../halls/entities/hall.entity';
import { Showing } from '../showings/entities/showing.entity';

/**
 * One description of the connection for everything that talks to the database:
 * the application (TypeOrmModule), the TypeORM CLI (src/data-source.ts) and the
 * seed script. Works from `src` (ts-node) and from `dist` (compiled).
 */
export function buildDataSourceOptions(
  env: Pick<
    EnvironmentVariables,
    'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME'
  >,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // gen_random_uuid() as the default of uuid primary keys.
    uuidExtension: 'pgcrypto',
    entities: [Film, Hall, Showing, Booking, BookingSeat],
    migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
    // The schema is created by migrations only.
    synchronize: false,
    migrationsRun: false,
  };
}
