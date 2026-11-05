import 'dotenv/config';
import { testDatabaseName } from './test-db';

// Runs before every test file: the application under test connects to the
// test database, not to the development one.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = testDatabaseName(process.env.DB_NAME ?? 'cinema');
