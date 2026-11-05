import { ApiProperty } from '@nestjs/swagger';
import { SeatResponseDto } from '../../common/dto/seat.dto';

/** Response of GET /halls/:id: the hall and its computed seat layout. */
export class HallWithSeatsDto {
  @ApiProperty({
    format: 'uuid',
    example: '0b9f6f0c-6a8e-4a64-a6f4-2d8d1f1c9a10',
  })
  id: string;

  @ApiProperty({ description: 'Unique among all halls', example: 'Hall 1' })
  name: string;

  @ApiProperty({ example: 3 })
  rows: number;

  @ApiProperty({ example: 5 })
  seatsPerRow: number;

  @ApiProperty({
    description: 'Every seat of the hall, computed from rows x seatsPerRow',
    type: [SeatResponseDto],
  })
  seats: SeatResponseDto[];
}
