import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
} from '../common/db-errors';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { PaginatedShowingsDto } from './dto/paginated-showings.dto';
import { QueryShowingsDto } from './dto/query-showings.dto';
import {
  ShowingResponseDto,
  ShowingViewDto,
} from './dto/showing-response.dto';
import { Showing } from './entities/showing.entity';

const DAY_MS = 86_400_000;

/**
 * Parses an ISO 8601 date-time to epoch ms. A value without an offset
 * (2099-01-01T18:00:00) is read as UTC, never in the server's local zone.
 */
function parseStartsAt(value: string): number {
  const hasOffset = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(value.split('T')[1] ?? '');
  const isDateTime = value.includes('T');
  return Date.parse(isDateTime && !hasOffset ? `${value}Z` : value);
}

@Injectable()
export class ShowingsService {
  constructor(
    @InjectRepository(Showing)
    private readonly showingsRepository: Repository<Showing>,
    private readonly filmsService: FilmsService,
    private readonly hallsService: HallsService,
  ) {}

  async create(dto: CreateShowingDto): Promise<ShowingResponseDto> {
    if (!(await this.filmsService.findById(dto.filmId))) {
      throw new BadRequestException(`Film with id ${dto.filmId} not found`);
    }
    if (!(await this.hallsService.findById(dto.hallId))) {
      throw new BadRequestException(`Hall with id ${dto.hallId} not found`);
    }

    const startsAtMs = parseStartsAt(dto.startsAt);
    if (Number.isNaN(startsAtMs)) {
      throw new BadRequestException(
        'startsAt is not a valid ISO 8601 date and time',
      );
    }
    if (startsAtMs <= Date.now()) {
      throw new BadRequestException('startsAt must not be in the past');
    }

    try {
      const showing = await this.showingsRepository.save(
        this.showingsRepository.create({
          filmId: dto.filmId,
          hallId: dto.hallId,
          // The real instant (UTC): sorting and the date filter use this.
          startsAt: new Date(startsAtMs),
          // Returned to clients exactly as they sent it.
          startsAtInput: dto.startsAt,
          price: dto.price,
        }),
      );
      return {
        id: showing.id,
        filmId: showing.filmId,
        hallId: showing.hallId,
        startsAt: showing.startsAtInput,
        price: showing.price,
      };
    } catch (error) {
      // The film or the hall was deleted between the check and the insert.
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw new BadRequestException('Film or hall does not exist anymore');
      }
      throw error;
    }
  }

  /**
   * One page of the schedule. Filtering, ordering, counting and cutting out
   * the page are all done by the database: the query carries WHERE, ORDER BY,
   * OFFSET and LIMIT, and only the rows of the page are loaded.
   */
  async findAll(query: QueryShowingsDto): Promise<PaginatedShowingsDto> {
    const { filmId, date, page = 1, limit = 20, sort = 'asc' } = query;

    // Ids are UUIDs, so any other filmId matches nothing (and would be an
    // error for a uuid column), as in the previous version of the service.
    if (filmId !== undefined && !isUUID(filmId)) {
      return { items: [], total: 0, page, limit };
    }

    const builder = this.showingsRepository
      .createQueryBuilder('showing')
      .innerJoinAndSelect('showing.film', 'film')
      .innerJoinAndSelect('showing.hall', 'hall');

    if (filmId !== undefined) {
      builder.andWhere('showing.filmId = :filmId', { filmId });
    }
    if (date !== undefined) {
      // The day is a UTC day: [00:00:00Z of date, 00:00:00Z of the next day).
      const from = new Date(`${date}T00:00:00.000Z`);
      const to = new Date(from.getTime() + DAY_MS);
      builder.andWhere('showing.startsAt >= :from AND showing.startsAt < :to', {
        from,
        to,
      });
    }

    const [showings, total] = await builder
      .orderBy('showing.startsAt', sort === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('showing.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items: showings.map((showing) => this.toView(showing)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ShowingViewDto> {
    const showing = await this.showingsRepository.findOne({
      where: { id },
      relations: { film: true, hall: true },
    });
    if (!showing) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return this.toView(showing);
  }

  /** The showing with its hall loaded, for other modules. Throws 404. */
  async findEntity(id: string): Promise<Showing> {
    const showing = await this.showingsRepository.findOne({
      where: { id },
      relations: { hall: true },
    });
    if (!showing) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return showing;
  }

  private toView(showing: Showing): ShowingViewDto {
    return {
      id: showing.id,
      filmTitle: showing.film.title,
      hallName: showing.hall.name,
      startsAt: showing.startsAtInput,
      price: showing.price,
    };
  }
}
