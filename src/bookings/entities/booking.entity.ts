import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';
import { BookingSeat } from './booking-seat.entity';

/**
 * Table `bookings`. The seats are not stored here but one per row in
 * `booking_seats`. Never returned as is: the routes answer with
 * `BookingResponseDto`.
 */
@Entity('bookings')
@Index('IDX_bookings_showing_id', ['showingId'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'showing_id', type: 'uuid' })
  showingId: string;

  @ManyToOne(() => Showing, (showing) => showing.bookings, {
    nullable: false,
  })
  @JoinColumn({ name: 'showing_id' })
  showing: Relation<Showing>;

  /** Showing price multiplied by the number of seats, in kopiykas. */
  @Column({ name: 'total_price', type: 'integer' })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => BookingSeat, (seat) => seat.booking)
  seats: Relation<BookingSeat[]>;
}
