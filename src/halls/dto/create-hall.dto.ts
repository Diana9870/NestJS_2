import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { trimString } from '../../common/transforms';

export class CreateHallDto {
  @ApiProperty({ description: 'Must be unique among all halls', example: 'Hall 1', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Number of rows, a positive integer', example: 3, minimum: 1, maximum: 1000 })
  @IsInt()
  @IsPositive()
  @Max(1000)
  rows: number;

  @ApiProperty({
    description: 'Seats in every row, a positive integer',
    example: 5,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsPositive()
  @Max(1000)
  seatsPerRow: number;
}
