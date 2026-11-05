import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateShowingDto } from './dto/create-showing.dto';
import { QueryShowingsDto } from './dto/query-showings.dto';
import { PaginatedShowingsDto } from './dto/paginated-showings.dto';
import {
  ShowingResponseDto,
  ShowingViewDto,
} from './dto/showing-response.dto';
import { ShowingsService } from './showings.service';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(private readonly showingsService: ShowingsService) {}

  @Post()
  @ApiOperation({ summary: 'Put a showing into the schedule' })
  @ApiCreatedResponse({
    description: 'Showing created',
    type: ShowingResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'A field is missing or invalid, startsAt is not ISO 8601 or is in the past, price is not a positive integer, or the film / hall does not exist',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateShowingDto): Promise<ShowingResponseDto> {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List showings, one page at a time',
    description:
      'Filters (filmId, date) are combined with AND. Ordered by start time (`sort`: asc by default), showings that start at the same time are ordered by id. Filtering, ordering and paging are done by the database. Query parameters: `filmId`, `date` (YYYY-MM-DD, UTC day), `page` (integer from 1, default 1), `limit` (integer from 1 to 100, default 20), `sort` (asc | desc, default asc).',
  })
  @ApiOkResponse({
    description:
      'One page of showings (`items`, each with film title and hall name) with `total` (all showings that match the filters), `page` and `limit`',
    type: PaginatedShowingsDto,
  })
  @ApiBadRequestResponse({
    description:
      'page or limit is not an integer or is out of range, date does not match YYYY-MM-DD, or sort is not asc / desc',
    type: ErrorResponseDto,
  })
  findAll(@Query() query: QueryShowingsDto): Promise<PaginatedShowingsDto> {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one showing' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'The showing with film title and hall name',
    type: ShowingViewDto,
  })
  @ApiNotFoundResponse({ description: 'No showing with this id', type: ErrorResponseDto })
  findOne(@Param('id', parseIdPipe) id: string): Promise<ShowingViewDto> {
    return this.showingsService.findOne(id);
  }
}
