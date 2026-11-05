import dataSource from './data-source';
import { Booking } from './bookings/entities/booking.entity';
import { BookingSeat } from './bookings/entities/booking-seat.entity';
import { Film } from './films/entities/film.entity';
import { Hall } from './halls/entities/hall.entity';
import { Showing } from './showings/entities/showing.entity';

/**
 * Fills an empty database (after `npm run migration:run`) with data for a
 * manual check: 2 films, 2 halls, 4 showings on different dates, 1 booking.
 *
 * Idempotent: every row has a fixed id and is inserted with
 * `ON CONFLICT DO NOTHING`, so a second run creates no duplicates.
 * The ids are valid UUID v4 values, so the routes accept them.
 */

const FILM_DUNE = '11111111-1111-4111-8111-111111111111';
const FILM_ARRIVAL = '11111111-1111-4111-8111-222222222222';
const HALL_BIG = '22222222-2222-4222-8222-111111111111';
const HALL_SMALL = '22222222-2222-4222-8222-222222222222';
const SHOWING_1 = '33333333-3333-4333-8333-111111111111';
const SHOWING_2 = '33333333-3333-4333-8333-222222222222';
const SHOWING_3 = '33333333-3333-4333-8333-333333333333';
const SHOWING_4 = '33333333-3333-4333-8333-444444444444';
const BOOKING_1 = '44444444-4444-4444-8444-111111111111';

/** `days` days from today at `hour`:00 UTC, as an ISO string. */
function startsAt(days: number, hour: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function seed(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(Film)
        .values([
          {
            id: FILM_DUNE,
            title: 'Dune: Part Two',
            durationMinutes: 166,
            releaseYear: 2024,
          },
          {
            id: FILM_ARRIVAL,
            title: 'Arrival',
            durationMinutes: 116,
            releaseYear: 2016,
          },
        ])
        .orIgnore()
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into(Hall)
        .values([
          { id: HALL_BIG, name: 'Hall 1', rows: 8, seatsPerRow: 12 },
          { id: HALL_SMALL, name: 'Hall 2', rows: 3, seatsPerRow: 5 },
        ])
        .orIgnore()
        .execute();

      const showing = (
        id: string,
        filmId: string,
        hallId: string,
        days: number,
        hour: number,
        price: number,
      ) => {
        const iso = startsAt(days, hour);
        return {
          id,
          filmId,
          hallId,
          startsAt: new Date(iso),
          startsAtInput: iso,
          price,
        };
      };
      await manager
        .createQueryBuilder()
        .insert()
        .into(Showing)
        .values([
          showing(SHOWING_1, FILM_DUNE, HALL_BIG, 1, 18, 25000),
          showing(SHOWING_2, FILM_DUNE, HALL_SMALL, 2, 12, 18000),
          showing(SHOWING_3, FILM_ARRIVAL, HALL_BIG, 3, 20, 22000),
          showing(SHOWING_4, FILM_ARRIVAL, HALL_SMALL, 7, 15, 15000),
        ])
        .orIgnore()
        .execute();

      // One booking of two seats on the first showing.
      await manager
        .createQueryBuilder()
        .insert()
        .into(Booking)
        .values([{ id: BOOKING_1, showingId: SHOWING_1, totalPrice: 50000 }])
        .orIgnore()
        .execute();
      await manager
        .createQueryBuilder()
        .insert()
        .into(BookingSeat)
        .values([
          {
            id: '55555555-5555-4555-8555-111111111111',
            bookingId: BOOKING_1,
            showingId: SHOWING_1,
            row: 4,
            seat: 6,
          },
          {
            id: '55555555-5555-4555-8555-222222222222',
            bookingId: BOOKING_1,
            showingId: SHOWING_1,
            row: 4,
            seat: 7,
          },
        ])
        .orIgnore()
        .execute();
    });

    const counts = {
      films: await dataSource.getRepository(Film).count(),
      halls: await dataSource.getRepository(Hall).count(),
      showings: await dataSource.getRepository(Showing).count(),
      bookings: await dataSource.getRepository(Booking).count(),
      bookingSeats: await dataSource.getRepository(BookingSeat).count(),
    };
    console.log('Seed done. Rows in the database:', counts);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
