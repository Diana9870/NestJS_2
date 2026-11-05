import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';
import { FilmsService } from './films.service';

@ApiTags('films')
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a film' })
  @ApiCreatedResponse({ description: 'Film created', type: Film })
  @ApiBadRequestResponse({
    description: 'A field is missing or has a wrong type',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateFilmDto): Promise<Film> {
    return this.filmsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all films' })
  @ApiOkResponse({ description: 'Films, empty array if there are none', type: [Film] })
  findAll(): Promise<Film[]> {
    return this.filmsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one film' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The film', type: Film })
  @ApiNotFoundResponse({ description: 'No film with this id', type: ErrorResponseDto })
  findOne(@Param('id', parseIdPipe) id: string): Promise<Film> {
    return this.filmsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any subset of the film fields' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated film', type: Film })
  @ApiBadRequestResponse({
    description: 'A field has a wrong type',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No film with this id', type: ErrorResponseDto })
  update(
    @Param('id', parseIdPipe) id: string,
    @Body() dto: UpdateFilmDto,
  ): Promise<Film> {
    return this.filmsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a film' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Film deleted' })
  @ApiNotFoundResponse({ description: 'No film with this id', type: ErrorResponseDto })
  @ApiConflictResponse({
    description:
      'At least one showing references the film (showings are never deleted together with it)',
    type: ErrorResponseDto,
  })
  remove(@Param('id', parseIdPipe) id: string): Promise<void> {
    return this.filmsService.remove(id);
  }
}
