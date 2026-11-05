import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { toInteger } from '../../common/transforms';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class QueryShowingsDto {
  @ApiPropertyOptional({
    description: 'Keep only the showings of this film',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  filmId?: string;

  @ApiPropertyOptional({
    description:
      'Keep only the showings that start on this day (YYYY-MM-DD, day boundaries are UTC)',
    example: '2099-01-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  @IsISO8601(
    { strict: true },
    { message: 'date must be a valid calendar date in YYYY-MM-DD format' },
  )
  date?: string;

  @ApiPropertyOptional({
    description: 'Page number, an integer from 1',
    type: Number,
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(toInteger)
  @IsInt({ message: 'page must be an integer number' })
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of showings on a page, an integer from 1 to 100',
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Transform(toInteger)
  @IsInt({ message: 'limit must be an integer number' })
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description:
      'Order by start time: asc (earliest first) or desc (latest first). Showings that start at the same time are ordered by id.',
    enum: SORT_ORDERS,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'sort must be one of: asc, desc' })
  sort: SortOrder = 'asc';
}
