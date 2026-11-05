import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from './bookings/bookings.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { buildDataSourceOptions } from './database/data-source-options';
import { FilmsModule } from './films/films.module';
import { HallsModule } from './halls/halls.module';
import { ShowingsModule } from './showings/showings.module';

@Module({
  imports: [
    // Reads .env and validates it (class-validator, see env.validation.ts).
    // The application does not start if a variable is missing or malformed.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Connection parameters come from ConfigService, not from process.env.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildDataSourceOptions({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_USERNAME: config.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_NAME: config.get('DB_NAME', { infer: true }),
        }),
    }),
    FilmsModule,
    HallsModule,
    ShowingsModule,
    BookingsModule,
  ],
  providers: [
    {
      // Global ValidationPipe. Registered here (not only in main.ts) so that
      // it is active for any app built from AppModule, tests included.
      // whitelist: properties without a DTO decorator are stripped, so fields
      // that are not in a DTO never reach a service.
      // transform: bodies and queries become DTO class instances.
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    {
      // One error body for every failure: { statusCode, message, path }.
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      // Honours @Exclude() on entities (createdAt of films and halls).
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
