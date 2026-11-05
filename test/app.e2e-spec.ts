import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Booking } from './../src/bookings/entities/booking.entity';
import { BookingSeat } from './../src/bookings/entities/booking-seat.entity';
import { Showing } from './../src/showings/entities/showing.entity';

const missingId = '00000000-0000-4000-8000-000000000000';

describe('Cinema API (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let dataSource: DataSource;

  beforeAll(async () => {
    // The global ValidationPipe, exception filter and serializer are registered
    // inside AppModule, so the test app behaves exactly like the real one.
    // It connects to the test database (see set-env.ts).
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());

    // The schema comes from the migrations only: start from an empty database
    // and apply all of them (this also proves they run from scratch).
    dataSource = app.get(DataSource);
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "booking_seats", "bookings", "showings", "halls", "films" CASCADE',
    );
  });

  const createFilm = async (title = 'Дюна') =>
    (
      await http
        .post('/films')
        .send({ title, durationMinutes: 155, releaseYear: 2021 })
        .expect(201)
    ).body;
  const createHall = async (name = 'Зал 1', rows = 3, seatsPerRow = 5) =>
    (await http.post('/halls').send({ name, rows, seatsPerRow }).expect(201))
      .body;
  const inDays = (days: number, hour = 18) => {
    const date = new Date(Date.now() + days * 86_400_000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  };
  const createShowing = async (
    filmId: string,
    hallId: string,
    startsAt = inDays(5),
    price = 12500,
  ) =>
    (
      await http
        .post('/showings')
        .send({ filmId, hallId, startsAt, price })
        .expect(201)
    ).body;
  const ids = (body: Array<{ id: string }>) => body.map((item) => item.id);
  const listShowings = async (query = '') =>
    (await http.get(`/showings${query}`).expect(200)).body;

  describe('films', () => {
    it('створює, читає, оновлює й видаляє фільм', async () => {
      await http.get('/films').expect(200, []);
      const film = await createFilm();
      expect(film.id).toEqual(expect.any(String));
      await http.get(`/films/${film.id}`).expect(200, film);
      const updated = await http
        .patch(`/films/${film.id}`)
        .send({ title: 'Дюна 2' })
        .expect(200);
      expect(updated.body).toEqual({ ...film, title: 'Дюна 2' });
      await http.delete(`/films/${film.id}`).expect(204).expect('');
      await http.get(`/films/${film.id}`).expect(404);
    });

    it('400 на відсутнє поле, неправильний тип і невалідний PATCH', async () => {
      await http.post('/films').send({ title: 'X' }).expect(400);
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: '100', releaseYear: 2020 })
        .expect(400);
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: -5, releaseYear: 2020 })
        .expect(400);
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: 90, releaseYear: -5 })
        .expect(400);
      const film = await createFilm();
      await http
        .patch(`/films/${film.id}`)
        .send({ releaseYear: 'давно' })
        .expect(400);
      await http
        .patch(`/films/${film.id}`)
        .send({ title: null, durationMinutes: null })
        .expect(400);
      await http.get(`/films/${film.id}`).expect(200, film);
    });

    it('не пропускає зайві поля до сервісу', async () => {
      const res = await http
        .post('/films')
        .send({
          title: 'X',
          durationMinutes: 90,
          releaseYear: 2000,
          id: 'hack',
          extra: 1,
        })
        .expect(201);
      expect(res.body.id).not.toBe('hack');
      expect(res.body.extra).toBeUndefined();
    });

    it('404 для невідомого id', async () => {
      await http.get(`/films/${missingId}`).expect(404);
      await http.patch(`/films/${missingId}`).send({}).expect(404);
      await http.delete(`/films/${missingId}`).expect(404);
    });

    it('409 при видаленні фільму з сеансом', async () => {
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      await http.delete(`/films/${film.id}`).expect(409);
      await http.get(`/films/${film.id}`).expect(200, film);
    });
  });

  describe('halls', () => {
    it('створює зал і повертає його з переліком місць', async () => {
      await http.get('/halls').expect(200, []);
      const hall = await createHall();
      const res = await http.get(`/halls/${hall.id}`).expect(200);
      expect(res.body.seats).toHaveLength(15);
      expect(res.body.seats[0]).toEqual({ row: 1, seat: 1 });
      expect(res.body.seats[14]).toEqual({ row: 3, seat: 5 });
      await http.get('/halls').expect(200, [hall]);
      await http.delete(`/halls/${hall.id}`).expect(204);
      await http.get(`/halls/${hall.id}`).expect(404);
    });

    it('400 на невалідні дані, 409 на дубль назви', async () => {
      await http.post('/halls').send({ name: 'A', rows: 3 }).expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: '3', seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 0, seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 2.5, seatsPerRow: 5 })
        .expect(400);
      await createHall('A');
      await http
        .post('/halls')
        .send({ name: 'A', rows: 1, seatsPerRow: 1 })
        .expect(409);
    });

    it('назва залу унікальна без урахування регістру й пробілів по краях', async () => {
      await createHall('Hall 1');
      await http
        .post('/halls')
        .send({ name: 'hall 1', rows: 1, seatsPerRow: 1 })
        .expect(409);
      await http
        .post('/halls')
        .send({ name: '  Hall 1  ', rows: 1, seatsPerRow: 1 })
        .expect(409);
      await http.get('/halls').expect((res) => {
        expect(res.body).toHaveLength(1);
      });
    });

    it('404 для невідомого залу, 409 при видаленні залу з сеансом', async () => {
      await http.get(`/halls/${missingId}`).expect(404);
      await http.delete(`/halls/${missingId}`).expect(404);
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      await http.delete(`/halls/${hall.id}`).expect(409);
      await http.get(`/halls/${hall.id}`).expect(200);
    });
  });

  describe('showings', () => {
    it('створює сеанс і віддає його з назвами фільму й залу', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const showing = await createShowing(film.id, hall.id);
      expect(showing).toMatchObject({
        filmId: film.id,
        hallId: hall.id,
        price: 12500,
      });
      const res = await http.get(`/showings/${showing.id}`).expect(200);
      expect(res.body).toEqual({
        id: showing.id,
        filmTitle: 'Дюна',
        hallName: 'Зал 1',
        startsAt: showing.startsAt,
        price: 12500,
      });
      await http.get(`/showings/${missingId}`).expect(404);
    });

    it('400 з причиною на невалідні дані', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const base = {
        filmId: film.id,
        hallId: hall.id,
        startsAt: inDays(3),
        price: 100,
      };

      const noFilm = await http
        .post('/showings')
        .send({ ...base, filmId: missingId })
        .expect(400);
      expect(noFilm.body.message).toContain(missingId);
      const noHall = await http
        .post('/showings')
        .send({ ...base, hallId: missingId })
        .expect(400);
      expect(noHall.body.message).toContain(missingId);

      await http
        .post('/showings')
        .send({ ...base, startsAt: 'завтра' })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, startsAt: '2030-02-30T10:00:00Z' })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, startsAt: '2000-01-01T10:00:00Z' })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, price: 0 })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, price: 99.5 })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, price: '100' })
        .expect(400);
      await http.post('/showings').send({ filmId: film.id }).expect(400);
      await http
        .post('/showings')
        .send({ ...base, startsAt: '20990501T120000Z' })
        .expect(400);
      await http
        .post('/showings')
        .send({ ...base, startsAt: '2099-05-01' })
        .expect(400);
      expect((await listShowings()).items).toEqual([]);
    });

    it('фільтрує за filmId і датою та сортує за часом, потім за id', async () => {
      const film1 = await createFilm('Фільм 1');
      const film2 = await createFilm('Фільм 2');
      const hall = await createHall();
      const late = await createShowing(film1.id, hall.id, inDays(5, 20));
      const early = await createShowing(film1.id, hall.id, inDays(5, 10));
      const other = await createShowing(film2.id, hall.id, inDays(6, 10));
      const tie1 = await createShowing(film2.id, hall.id, inDays(7, 12));
      const tie2 = await createShowing(film2.id, hall.id, inDays(7, 12));

      const all = await listShowings();
      expect(all).toMatchObject({ total: 5, page: 1, limit: 20 });
      expect(all.items).toHaveLength(5);
      const times = all.items.map((s: { startsAt: string }) => s.startsAt);
      expect(times).toEqual([...times].sort());
      expect(ids(all.items).slice(3)).toEqual([tie1.id, tie2.id].sort());
      expect(all.items[0].filmTitle).toBe('Фільм 1');
      expect(all.items[0].hallName).toBe('Зал 1');

      const byFilm = await listShowings(`?filmId=${film1.id}`);
      expect(ids(byFilm.items)).toEqual([early.id, late.id]);
      expect(byFilm.total).toBe(2);

      const day = inDays(6).slice(0, 10);
      const byDate = await listShowings(`?date=${day}`);
      expect(ids(byDate.items)).toEqual([other.id]);

      const both = await listShowings(`?filmId=${film1.id}&date=${day}`);
      expect(both).toEqual({ items: [], total: 0, page: 1, limit: 20 });

      // filmId that is not a UUID matches nothing (as before), not a 500.
      expect((await listShowings('?filmId=abc')).items).toEqual([]);

      await http.get('/showings?date=01.05.2030').expect(400);
      await http.get('/showings?date=2030-13-45').expect(400);
    });

    it('повертає startsAt як надіслано, а date рахує добу за UTC', async () => {
      const film = await createFilm();
      const hall = await createHall();
      // 01:00 за +03:00 це ще 22:00 попередньої доби за UTC.
      const sent = '2099-06-01T01:00:00+03:00';
      const shifted = await createShowing(film.id, hall.id, sent);
      expect(shifted.startsAt).toBe(sent);
      expect(shifted).not.toHaveProperty('startsAtMs');

      const one = await http.get(`/showings/${shifted.id}`).expect(200);
      expect(one.body.startsAt).toBe(sent);
      expect(one.body).not.toHaveProperty('startsAtMs');
      const list = await listShowings();
      expect(list.items[0].startsAt).toBe(sent);
      expect(list.items[0]).not.toHaveProperty('startsAtMs');

      const prevDay = await listShowings('?date=2099-05-31');
      expect(ids(prevDay.items)).toEqual([shifted.id]);
      const nextDay = await listShowings('?date=2099-06-01');
      expect(nextDay.items).toEqual([]);
    });

    it('значення без зсуву зберігається як є й читається як UTC', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const showing = await createShowing(
        film.id,
        hall.id,
        '2099-07-01T18:00:00',
      );
      expect(showing.startsAt).toBe('2099-07-01T18:00:00');
      const res = await listShowings('?date=2099-07-01');
      expect(ids(res.items)).toEqual([showing.id]);
    });

    it('сортує сеанси з різними зсувами за справжнім моментом часу', async () => {
      const film = await createFilm();
      const hall = await createHall();
      // 10:00+05:00 = 05:00Z, раніше за 08:00Z, хоча «10» більше за «08».
      const first = await createShowing(
        film.id,
        hall.id,
        '2099-08-01T10:00:00+05:00',
      );
      const second = await createShowing(
        film.id,
        hall.id,
        '2099-08-01T08:00:00Z',
      );
      const res = await listShowings('?date=2099-08-01');
      expect(ids(res.items)).toEqual([first.id, second.id]);
    });

    it('показує зайнятість місць на сеансі', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const showing = await createShowing(film.id, hall.id);
      const before = await http
        .get(`/showings/${showing.id}/seats`)
        .expect(200);
      expect(before.body).toHaveLength(15);
      expect(before.body.every((s: { isBooked: boolean }) => !s.isBooked)).toBe(
        true,
      );

      await http
        .post(`/showings/${showing.id}/bookings`)
        .send({ seats: [{ row: 2, seat: 3 }] })
        .expect(201);
      const after = await http.get(`/showings/${showing.id}/seats`).expect(200);
      const booked = after.body.filter(
        (s: { isBooked: boolean }) => s.isBooked,
      );
      expect(booked).toEqual([{ row: 2, seat: 3, isBooked: true }]);
      await http.get(`/showings/${missingId}/seats`).expect(404);
    });
  });

  describe('bookings', () => {
    let showingId: string;

    beforeEach(async () => {
      const film = await createFilm();
      const hall = await createHall();
      showingId = (await createShowing(film.id, hall.id, inDays(5), 12500)).id;
    });

    const book = (seats: unknown) =>
      http.post(`/showings/${showingId}/bookings`).send({ seats });

    it('створює бронювання з підсумковою ціною', async () => {
      await http.get('/bookings').expect(200, []);
      const res = await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
        { row: 3, seat: 5 },
      ]).expect(201);
      expect(res.body).toMatchObject({ showingId, totalPrice: 37500 });
      expect(res.body.seats).toHaveLength(3);
      await http.get('/bookings').expect(200, [res.body]);
      await http.get(`/showings/${showingId}/bookings`).expect(200, [res.body]);
    });

    it('404 для невідомого сеансу', async () => {
      await http
        .post(`/showings/${missingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
      await http.get(`/showings/${missingId}/bookings`).expect(404);
    });

    it('400 на невалідний масив місць', async () => {
      await book([]).expect(400);
      await book(undefined).expect(400);
      await book([{ row: 1 }]).expect(400);
      await book([null]).expect(400);
      await book([{ row: 1, seat: 'a' }]).expect(400);
      await book([{ row: 0, seat: 1 }]).expect(400);
      await book([{ row: 1, seat: -1 }]).expect(400);
      await book([{ row: 1.5, seat: 1 }]).expect(400);
      await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 1 },
      ]).expect(400);
      await book([{ row: 4, seat: 1 }]).expect(400);
      await book([{ row: 1, seat: 6 }]).expect(400);
      await http.get('/bookings').expect(200, []);
    });

    it('409 при зайнятому місці й нічого не бронює', async () => {
      await book([{ row: 2, seat: 2 }]).expect(201);
      await book([
        { row: 1, seat: 1 },
        { row: 2, seat: 2 },
      ]).expect(409);
      const seats = await http.get(`/showings/${showingId}/seats`).expect(200);
      expect(
        seats.body.filter((s: { isBooked: boolean }) => s.isBooked),
      ).toHaveLength(1);
      await http.get(`/showings/${showingId}/bookings`).expect((res) => {
        expect(res.body).toHaveLength(1);
      });
    });

    it('скасування звільняє місця', async () => {
      const first = await book([{ row: 1, seat: 1 }]).expect(201);
      await book([{ row: 1, seat: 1 }]).expect(409);
      await http.delete(`/bookings/${first.body.id}`).expect(204).expect('');
      await book([{ row: 1, seat: 1 }]).expect(201);
      await http.delete(`/bookings/${missingId}`).expect(404);
      await http.delete(`/bookings/${first.body.id}`).expect(404);
    });
  });

  describe('GET /showings: сторінки, ліміт і сортування', () => {
    // 7 сеансів: день 1 (3 шт.), день 2 (1), день 3 (3). Усередині дня - різний час.
    let created: Array<{ id: string; startsAt: string }>;
    let film1Id: string;

    beforeEach(async () => {
      const film1 = await createFilm('Фільм 1');
      const film2 = await createFilm('Фільм 2');
      film1Id = film1.id;
      const hall = await createHall();
      created = [];
      const plan: Array<[string, number, number]> = [
        [film1.id, 1, 10],
        [film2.id, 1, 14],
        [film1.id, 1, 18],
        [film2.id, 2, 12],
        [film1.id, 3, 9],
        [film2.id, 3, 15],
        [film1.id, 3, 21],
      ];
      for (const [filmId, day, hour] of plan) {
        created.push(
          await createShowing(filmId, hall.id, inDays(day, hour), 10000),
        );
      }
    });

    it('за замовчуванням page=1, limit=20, sort=asc; відповідь має items, total, page, limit', async () => {
      const body = await listShowings();
      expect(Object.keys(body).sort()).toEqual(
        ['items', 'limit', 'page', 'total'].sort(),
      );
      expect(body).toMatchObject({ total: 7, page: 1, limit: 20 });
      expect(ids(body.items)).toEqual(created.map((s) => s.id));
    });

    it('limit і page ріжуть вибірку; total не залежить від сторінки', async () => {
      const p1 = await listShowings('?limit=3&page=1');
      const p2 = await listShowings('?limit=3&page=2');
      const p3 = await listShowings('?limit=3&page=3');
      expect(ids(p1.items)).toEqual(ids(created.slice(0, 3)));
      expect(ids(p2.items)).toEqual(ids(created.slice(3, 6)));
      expect(ids(p3.items)).toEqual(ids(created.slice(6)));
      for (const [body, page] of [
        [p1, 1],
        [p2, 2],
        [p3, 3],
      ] as const) {
        expect(body).toMatchObject({ total: 7, page, limit: 3 });
      }
    });

    it('сторінка за межами вибірки: порожні items, total лишається', async () => {
      const body = await listShowings('?limit=5&page=9');
      expect(body).toEqual({ items: [], total: 7, page: 9, limit: 5 });
    });

    it('sort=desc повертає від пізнього до раннього', async () => {
      const body = await listShowings('?sort=desc&limit=100');
      expect(ids(body.items)).toEqual(ids([...created].reverse()));
      const first = await listShowings('?sort=desc&limit=2');
      expect(ids(first.items)).toEqual(ids([created[6], created[5]]));
    });

    it('total і items рахуються разом із фільтрами', async () => {
      const day3 = inDays(3).slice(0, 10);
      const body = await listShowings(`?date=${day3}&limit=2&page=2`);
      expect(body.total).toBe(3);
      expect(ids(body.items)).toEqual([created[6].id]);

      const byFilm = await listShowings(`?filmId=${film1Id}&limit=2`);
      expect(byFilm.total).toBe(4);
      expect(byFilm.items).toHaveLength(2);
      expect(
        byFilm.items.every((s: { filmTitle: string }) => s.filmTitle === 'Фільм 1'),
      ).toBe(true);
    });

    it('сеанси з однаковим часом лежать у порядку id на кожній сторінці', async () => {
      const film = await createFilm('Однаковий час');
      const hall = await createHall('Зал 2');
      const when = inDays(20, 12);
      const same = [];
      for (let i = 0; i < 4; i++) {
        same.push(await createShowing(film.id, hall.id, when));
      }
      const sorted = ids(same).sort();
      const a = await listShowings(`?filmId=${film.id}&limit=2&page=1`);
      const b = await listShowings(`?filmId=${film.id}&limit=2&page=2`);
      expect([...ids(a.items), ...ids(b.items)]).toEqual(sorted);
    });

    it('400 на невалідні page, limit, sort і date', async () => {
      for (const query of [
        'page=0',
        'page=-1',
        'page=abc',
        'page=1.5',
        'page=',
        'page=1&page=2',
        'limit=0',
        'limit=101',
        'limit=-5',
        'limit=abc',
        'limit=2.5',
        'limit=',
        'sort=up',
        'sort=ASC',
        'sort=',
        'date=2099-1-1',
        'date=31.12.2099',
        'date=2099-02-30',
      ]) {
        const res = await http.get(`/showings?${query}`).expect(400);
        expect(res.body.statusCode).toBe(400);
      }
      // Межі допустимого проходять.
      await http.get('/showings?page=1&limit=1').expect(200);
      await http.get('/showings?limit=100').expect(200);
    });
  });

  describe('формат помилок', () => {
    it('кожна помилка має statusCode, message і path', async () => {
      const notFound = await http.get(`/films/${missingId}`).expect(404);
      expect(notFound.body).toEqual({
        statusCode: 404,
        message: expect.any(String),
        path: `/films/${missingId}`,
      });

      const badBody = await http.post('/films').send({ title: 'X' }).expect(400);
      expect(Object.keys(badBody.body).sort()).toEqual(
        ['message', 'path', 'statusCode'],
      );
      expect(badBody.body.path).toBe('/films');
      expect(Array.isArray(badBody.body.message)).toBe(true);

      const badQuery = await http.get('/showings?limit=500').expect(400);
      expect(badQuery.body.path).toBe('/showings?limit=500');

      const unknownRoute = await http.get('/no-such-route').expect(404);
      expect(unknownRoute.body).toEqual({
        statusCode: 404,
        message: expect.any(String),
        path: '/no-such-route',
      });
    });
  });

  describe('бронювання в транзакції', () => {
    let showingId: string;

    beforeEach(async () => {
      const film = await createFilm();
      const hall = await createHall();
      showingId = (await createShowing(film.id, hall.id, inDays(5), 12500)).id;
    });

    const book = (seats: unknown, id = showingId) =>
      http.post(`/showings/${id}/bookings`).send({ seats });
    const rowsInDb = async () => ({
      bookings: await dataSource.getRepository(Booking).count(),
      seats: await dataSource.getRepository(BookingSeat).count(),
    });

    it('успіх: одне бронювання і по рядку на кожне місце', async () => {
      const res = await book([
        { row: 3, seat: 5 },
        { row: 1, seat: 1 },
      ]).expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        showingId,
        // Відповідь упорядковує місця за рядом і місцем.
        seats: [
          { row: 1, seat: 1 },
          { row: 3, seat: 5 },
        ],
        totalPrice: 25000,
      });
      expect(await rowsInDb()).toEqual({ bookings: 1, seats: 2 });
      const stored = await dataSource.getRepository(BookingSeat).find();
      expect(stored.every((s) => s.showingId === showingId)).toBe(true);
      expect(stored.every((s) => s.bookingId === res.body.id)).toBe(true);
    });

    it('зайняте місце: 409 і в базі не лишається ні бронювання, ні жодного місця', async () => {
      await book([{ row: 2, seat: 2 }]).expect(201);
      const before = await rowsInDb();

      const res = await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
        { row: 2, seat: 2 },
        { row: 3, seat: 3 },
      ]).expect(409);

      expect(await rowsInDb()).toEqual(before);
      expect(res.body).toEqual({
        statusCode: 409,
        message: expect.any(String),
        path: `/showings/${showingId}/bookings`,
      });
    });

    it('відповідь 409 не містить тексту помилки бази даних', async () => {
      await book([{ row: 1, seat: 1 }]).expect(201);
      const res = await book([{ row: 1, seat: 1 }]).expect(409);
      const text = JSON.stringify(res.body);
      expect(text).not.toMatch(
        /duplicate key|violates|unique constraint|UQ_|booking_seats|showing_id|23505/i,
      );
      expect(res.body.message).toContain('row 1, seat 1');
    });

    it('те саме місце на іншому сеансі вільне', async () => {
      const film = await createFilm('Інший');
      const hall = await createHall('Зал 2');
      const other = await createShowing(film.id, hall.id);
      await book([{ row: 1, seat: 1 }]).expect(201);
      await book([{ row: 1, seat: 1 }], other.id).expect(201);
    });

    it('одночасні запити на те саме місце: рівно один успіх, решта 409, часткових записів немає', async () => {
      // Кожен запит бере спільне місце (1,1) і своє власне. Переможець один;
      // власні місця тих, хто програв, не мають лишитися в базі.
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          book([
            { row: 1, seat: 1 },
            { row: 2, seat: i + 1 },
          ]),
        ),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(7);
      expect(await rowsInDb()).toEqual({ bookings: 1, seats: 2 });
    });

    it('унікальний індекс працює в самій базі, повз застосунок', async () => {
      const first = await book([{ row: 1, seat: 1 }]).expect(201);
      const bookings = dataSource.getRepository(Booking);
      const intruder = await bookings.save(
        bookings.create({ showingId, totalPrice: 1 }),
      );
      const insert = dataSource.getRepository(BookingSeat).insert({
        bookingId: intruder.id,
        showingId,
        row: 1,
        seat: 1,
      });
      await expect(insert).rejects.toBeInstanceOf(QueryFailedError);
      await expect(insert).rejects.toMatchObject({
        driverError: { code: '23505' },
      });
      expect(first.body.id).not.toBe(intruder.id);
    });

    it('скасування бронювання видаляє його місця в базі (каскад), чужі лишаються', async () => {
      const a = await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
      ]).expect(201);
      await book([{ row: 2, seat: 1 }]).expect(201);
      expect(await rowsInDb()).toEqual({ bookings: 2, seats: 3 });

      await http.delete(`/bookings/${a.body.id}`).expect(204);
      expect(await rowsInDb()).toEqual({ bookings: 1, seats: 1 });
      await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
      ]).expect(201);
    });

    it('нерозумно велика сума не падає з 500', async () => {
      const film = await createFilm('Дорогий');
      const hall = await createHall('Зал 3', 10, 10);
      const pricey = await createShowing(
        film.id,
        hall.id,
        inDays(9),
        2_000_000_000,
      );
      await book(
        [
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
        ],
        pricey.id,
      ).expect(400);
      await book([{ row: 1, seat: 1 }], pricey.id).expect(201);
    });
  });

  describe('видалення фільму й залу з сеансами', () => {
    it('409 з поясненням, фільм, зал і сеанс лишаються', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const showing = await createShowing(film.id, hall.id);

      const byFilm = await http.delete(`/films/${film.id}`).expect(409);
      expect(byFilm.body.message).toContain('showing');
      expect(byFilm.body.path).toBe(`/films/${film.id}`);
      const byHall = await http.delete(`/halls/${hall.id}`).expect(409);
      expect(byHall.body.message).toContain('showing');

      const text = JSON.stringify([byFilm.body, byHall.body]);
      expect(text).not.toMatch(/violates|foreign key|constraint|FK_/i);

      await http.get(`/films/${film.id}`).expect(200);
      await http.get(`/halls/${hall.id}`).expect(200);
      await http.get(`/showings/${showing.id}`).expect(200);
      expect(await dataSource.getRepository(Showing).count()).toBe(1);
    });

    it('фільм і зал без сеансів видаляються', async () => {
      const film = await createFilm();
      const hall = await createHall();
      await http.delete(`/films/${film.id}`).expect(204);
      await http.delete(`/halls/${hall.id}`).expect(204);
    });
  });
});
