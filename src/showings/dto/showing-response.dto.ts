import { ApiProperty } from '@nestjs/swagger';

/** Showing as returned by POST /showings: links a film and a hall by id. */
export class ShowingResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'c3f1d1a2-4b55-4d0e-8f6c-3f2f3f5b7a01',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '7d1c0a9e-1b0b-4f43-9d34-0d9f0c6e3f11',
  })
  filmId: string;

  @ApiProperty({
    format: 'uuid',
    example: '0b9f6f0c-6a8e-4a64-a6f4-2d8d1f1c9a10',
  })
  hallId: string;

  @ApiProperty({
    description: 'ISO 8601 start date and time, exactly as it was sent',
    example: '2099-01-01T18:00:00Z',
  })
  startsAt: string;

  @ApiProperty({
    description: 'Ticket price in kopiykas (12500 = 125 UAH)',
    example: 12500,
  })
  price: number;
}

/** Showing as returned by the read routes: names instead of ids. */
export class ShowingViewDto {
  @ApiProperty({
    format: 'uuid',
    example: 'c3f1d1a2-4b55-4d0e-8f6c-3f2f3f5b7a01',
  })
  id: string;

  @ApiProperty({ description: 'Title of the film', example: 'Dune: Part Two' })
  filmTitle: string;

  @ApiProperty({ description: 'Name of the hall', example: 'Hall 1' })
  hallName: string;

  @ApiProperty({
    description: 'ISO 8601 start date and time, exactly as it was sent',
    example: '2099-01-01T18:00:00Z',
  })
  startsAt: string;

  @ApiProperty({
    description: 'Ticket price in kopiykas (12500 = 125 UAH)',
    example: 12500,
  })
  price: number;
}
