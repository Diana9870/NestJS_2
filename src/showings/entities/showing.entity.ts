import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Film } from '../../films/entities/film.entity';
import { Hall } from '../../halls/entities/hall.entity';

/**
 * Table `showings`. Never returned as is: the routes answer with the DTOs from
 * `dto/showing-response.dto.ts`.
 */
@Entity('showings')
@Index('IDX_showings_starts_at_id', ['startsAt', 'id'])
@Index('IDX_showings_film_id', ['filmId'])
@Index('IDX_showings_hall_id', ['hallId'])
export class Showing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'film_id', type: 'uuid' })
  filmId: string;

  // A film cannot be deleted while a showing references it (no cascade).
  @ManyToOne(() => Film, (film) => film.showings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'film_id' })
  film: Relation<Film>;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId: string;

  // Same for a hall.
  @ManyToOne(() => Hall, (hall) => hall.showings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'hall_id' })
  hall: Relation<Hall>;

  /** The real instant. Sorting and the `date` filter use this column. */
  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  /**
   * `startsAt` exactly as the client sent it (`2099-06-01T01:00:00+03:00`).
   * A timestamptz keeps only the instant, not the offset, and the API returns
   * the value as it was sent, so the original text is kept next to it.
   */
  @Column({ name: 'starts_at_input', type: 'varchar' })
  startsAtInput: string;

  /** Ticket price in kopiykas. */
  @Column({ type: 'integer' })
  price: number;

  @OneToMany(() => Booking, (booking) => booking.showing)
  bookings: Relation<Booking[]>;
}
