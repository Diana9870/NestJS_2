import { ApiProperty } from '@nestjs/swagger';
import { SeatResponseDto } from '../../common/dto/seat.dto';

/** Booking as returned by the routes: the seats are listed inside it. */
export class BookingResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5a8f3c42-9d7e-4b1a-8c55-1e2d3f4a5b6c',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: 'c3f1d1a2-4b55-4d0e-8f6c-3f2f3f5b7a01',
  })
  showingId: string;

  @ApiProperty({
    description: 'Booked seats, ordered by row and seat',
    type: [SeatResponseDto],
  })
  seats: SeatResponseDto[];

  @ApiProperty({
    description: 'Showing price multiplied by the number of seats, in kopiykas',
    example: 25000,
  })
  totalPrice: number;
}

/** One seat of the hall layout with its state on a particular showing. */
export class SeatAvailabilityDto extends SeatResponseDto {
  @ApiProperty({
    description: 'true if a booking of this showing holds the seat',
    example: false,
  })
  isBooked: boolean;
}
