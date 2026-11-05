import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../common/transforms';

export class CreateFilmDto {
  @ApiProperty({ example: 'Dune: Part Two', maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Duration in minutes, a positive integer',
    example: 166,
    minimum: 1,
    maximum: 2147483647,
  })
  @IsInt()
  @IsPositive()
  @Max(2_147_483_647) // the largest value of the integer column
  durationMinutes: number;

  @ApiProperty({ example: 2024, minimum: 1888, maximum: 2100 })
  @IsInt()
  @Min(1888)
  @Max(2100)
  releaseYear: number;
}
