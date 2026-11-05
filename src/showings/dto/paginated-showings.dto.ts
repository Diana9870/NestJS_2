import { ApiProperty } from '@nestjs/swagger';
import { ShowingViewDto } from './showing-response.dto';

/** Response of GET /showings: one page of showings and the paging data. */
export class PaginatedShowingsDto {
  @ApiProperty({
    description:
      'Showings of the current page, each with the film title and the hall name',
    type: [ShowingViewDto],
  })
  items: ShowingViewDto[];

  @ApiProperty({
    description: 'Number of all showings that match the filters, not only this page',
    example: 42,
  })
  total: number;

  @ApiProperty({ description: 'Number of the current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size that was applied', example: 20 })
  limit: number;
}
