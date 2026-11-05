import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { trimString } from '../../common/transforms';

/**
 * Any subset of the film fields. `ValidateIf(value !== undefined)` is used
 * instead of `IsOptional` on purpose: IsOptional also lets `null` through,
 * and `{"title": null}` must be rejected as a wrong type.
 */
export class UpdateFilmDto {
  @ApiPropertyOptional({ example: 'Dune: Part Two', maxLength: 255 })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 166, minimum: 1, maximum: 2147483647 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsPositive()
  @Max(2_147_483_647) // the largest value of the integer column
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 2024, minimum: 1888, maximum: 2100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1888)
  @Max(2100)
  releaseYear?: number;
}
