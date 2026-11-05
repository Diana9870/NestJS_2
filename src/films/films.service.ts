import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
} from '../common/db-errors';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';

@Injectable()
export class FilmsService {
  constructor(
    @InjectRepository(Film)
    private readonly filmsRepository: Repository<Film>,
  ) {}

  create(dto: CreateFilmDto): Promise<Film> {
    return this.filmsRepository.save(
      this.filmsRepository.create({
        title: dto.title,
        durationMinutes: dto.durationMinutes,
        releaseYear: dto.releaseYear,
      }),
    );
  }

  findAll(): Promise<Film[]> {
    return this.filmsRepository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  /** Lookup for other modules that need "missing" as a value, not as an error. */
  findById(id: string): Promise<Film | null> {
    return this.filmsRepository.findOneBy({ id });
  }

  async findOne(id: string): Promise<Film> {
    const film = await this.findById(id);
    if (!film) {
      throw new NotFoundException(`Film with id ${id} not found`);
    }
    return film;
  }

  async update(id: string, dto: UpdateFilmDto): Promise<Film> {
    const film = await this.findOne(id);
    if (dto.title !== undefined) film.title = dto.title;
    if (dto.durationMinutes !== undefined) {
      film.durationMinutes = dto.durationMinutes;
    }
    if (dto.releaseYear !== undefined) film.releaseYear = dto.releaseYear;
    return this.filmsRepository.save(film);
  }

  /**
   * The foreign key showings.film_id is ON DELETE RESTRICT, so the database
   * refuses to delete a film that still has showings. That refusal is the 409;
   * no showing is ever deleted together with the film.
   */
  async remove(id: string): Promise<void> {
    try {
      const result = await this.filmsRepository.delete(id);
      if (!result.affected) {
        throw new NotFoundException(`Film with id ${id} not found`);
      }
    } catch (error) {
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException(
          `Film ${id} cannot be deleted: at least one showing references it`,
        );
      }
      throw error;
    }
  }
}
