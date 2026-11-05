import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class SeatDto {
  @ApiProperty({ description: 'Row number, a positive integer', example: 1, minimum: 1 })
  @IsInt()
  @IsPositive()
  row: number;

  @ApiProperty({ description: 'Seat number in the row, a positive integer', example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  seat: number;
}

/**
 * Identity of a seat for the uniqueness check. It runs before the elements are
 * validated, so it has to survive nulls and primitives instead of throwing.
 */
const seatIdentity = (item: unknown): unknown =>
  item !== null && typeof item === 'object'
    ? `${(item as SeatDto).row}:${(item as SeatDto).seat}`
    : item;

export class CreateBookingDto {
  @ApiProperty({
    description:
      'Seats to book: a non-empty array (at most 1000 items) without repeated seats. Whether a seat exists in the hall and is free is checked against the showing.',
    type: [SeatDto],
    example: [
      { row: 1, seat: 1 },
      { row: 1, seat: 2 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @ArrayUnique(seatIdentity, { message: 'seats must not contain the same seat twice' })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}
