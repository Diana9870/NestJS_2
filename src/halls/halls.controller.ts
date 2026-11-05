import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeatsDto } from './dto/hall-with-seats.dto';
import { Hall } from './entities/hall.entity';
import { HallsService } from './halls.service';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a hall' })
  @ApiCreatedResponse({ description: 'Hall created', type: Hall })
  @ApiBadRequestResponse({
    description: 'A field is missing, has a wrong type, or a number is not a positive integer',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A hall with this name already exists',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateHallDto): Promise<Hall> {
    return this.hallsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all halls' })
  @ApiOkResponse({ description: 'Halls, empty array if there are none', type: [Hall] })
  findAll(): Promise<Hall[]> {
    return this.hallsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one hall together with its seats' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'The hall with the `seats` array (rows x seatsPerRow items)',
    type: HallWithSeatsDto,
  })
  @ApiNotFoundResponse({ description: 'No hall with this id', type: ErrorResponseDto })
  findOne(@Param('id', parseIdPipe) id: string): Promise<HallWithSeatsDto> {
    return this.hallsService.findOneWithSeats(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a hall' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Hall deleted' })
  @ApiNotFoundResponse({ description: 'No hall with this id', type: ErrorResponseDto })
  @ApiConflictResponse({
    description:
      'At least one showing references the hall (showings are never deleted together with it)',
    type: ErrorResponseDto,
  })
  remove(@Param('id', parseIdPipe) id: string): Promise<void> {
    return this.hallsService.remove(id);
  }
}
