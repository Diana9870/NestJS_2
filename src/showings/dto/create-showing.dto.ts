import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsPositive,
  IsUUID,
  Matches,
  Max,
} from 'class-validator';

export class CreateShowingDto {
  @ApiProperty({ description: 'Id of an existing film', format: 'uuid' })
  @IsUUID()
  filmId: string;

  @ApiProperty({ description: 'Id of an existing hall', format: 'uuid' })
  @IsUUID()
  hallId: string;

  @ApiProperty({
    description:
      'ISO 8601 date and time, must be in the future. A value without an offset is read as UTC. The value is returned exactly as sent; sorting and the date filter use the UTC instant.',
    example: '2099-01-01T18:00:00Z',
  })
  // Date AND time in the extended format (2099-01-01T18:00[:00][Z|+03:00]):
  // a bare date or the basic format (20990101T180000Z) is rejected.
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/i, {
    message: 'startsAt must be an ISO 8601 date and time, e.g. 2099-01-01T18:00:00Z',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  startsAt: string;

  @ApiProperty({
    description: 'Ticket price in kopiykas, a positive integer (12500 = 125 UAH)',
    example: 12500,
    minimum: 1,
    maximum: 2147483647,
  })
  @IsInt()
  @IsPositive()
  @Max(2_147_483_647) // the largest value of the integer column
  price: number;
}
