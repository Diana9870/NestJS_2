import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';
import { Booking } from './booking.entity';

/**
 * Table `booking_seats`: one row is one seat held by one booking on one
 * showing.
 *
 * The rule "a seat of a showing cannot be sold twice" is this unique index.
 * The database rejects a second row with the same (showing_id, row, seat)
 * whatever the application does, even if two requests arrive at once and both
 * see the seat as free. `showing_id` is stored here on purpose (it could be
 * reached through `booking_id`): an index can only span columns of one table.
 */
@Entity('booking_seats')
@Index('UQ_booking_seats_showing_row_seat', ['showingId', 'row', 'seat'], {
  unique: true,
})
@Index('IDX_booking_seats_booking_id', ['bookingId'])
export class BookingSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  // Deleting a booking deletes its seats: ON DELETE CASCADE in the database.
  @ManyToOne(() => Booking, (booking) => booking.seats, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ name: 'showing_id', type: 'uuid' })
  showingId: string;

  @ManyToOne(() => Showing, { nullable: false })
  @JoinColumn({ name: 'showing_id' })
  showing: Relation<Showing>;

  @Column({ type: 'integer' })
  row: number;

  @Column({ type: 'integer' })
  seat: number;
}
