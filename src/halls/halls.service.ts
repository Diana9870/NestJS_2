import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatResponseDto } from '../common/dto/seat.dto';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../common/db-errors';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeatsDto } from './dto/hall-with-seats.dto';
import { Hall } from './entities/hall.entity';

@Injectable()
export class HallsService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallsRepository: Repository<Hall>,
  ) {}

  async create(dto: CreateHallDto): Promise<Hall> {
    const nameTaken =
      (await this.hallsRepository
        .createQueryBuilder('hall')
        .where('LOWER(hall.name) = LOWER(:name)', { name: dto.name })
        .getCount()) > 0;
    if (nameTaken) {
      throw this.duplicateName(dto.name);
    }

    try {
      return await this.hallsRepository.save(
        this.hallsRepository.create({
          name: dto.name,
          rows: dto.rows,
          seatsPerRow: dto.seatsPerRow,
        }),
      );
    } catch (error) {
      // Two requests with the same name at once: the check above passed for
      // both, the unique constraint on halls.name stops the second.
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        throw this.duplicateName(dto.name);
      }
      throw error;
    }
  }

  findAll(): Promise<Hall[]> {
    return this.hallsRepository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  /** Lookup for other modules that need "missing" as a value, not as an error. */
  findById(id: string): Promise<Hall | null> {
    return this.hallsRepository.findOneBy({ id });
  }

  async findOne(id: string): Promise<Hall> {
    const hall = await this.findById(id);
    if (!hall) {
      throw new NotFoundException(`Hall with id ${id} not found`);
    }
    return hall;
  }

  async findOneWithSeats(id: string): Promise<HallWithSeatsDto> {
    const hall = await this.findOne(id);
    // Built field by field: a spread would copy the excluded createdAt too.
    return {
      id: hall.id,
      name: hall.name,
      rows: hall.rows,
      seatsPerRow: hall.seatsPerRow,
      seats: this.buildSeats(hall),
    };
  }

  /** Seat layout of a hall: row 1..rows, seat 1..seatsPerRow, in that order. */
  buildSeats(hall: Pick<Hall, 'rows' | 'seatsPerRow'>): SeatResponseDto[] {
    const seats: SeatResponseDto[] = [];
    for (let row = 1; row <= hall.rows; row++) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat++) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  /**
   * The foreign key showings.hall_id is ON DELETE RESTRICT: the database
   * refuses to delete a hall that still has showings, and that is the 409.
   */
  async remove(id: string): Promise<void> {
    try {
      const result = await this.hallsRepository.delete(id);
      if (!result.affected) {
        throw new NotFoundException(`Hall with id ${id} not found`);
      }
    } catch (error) {
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException(
          `Hall ${id} cannot be deleted: at least one showing references it`,
        );
      }
      throw error;
    }
  }

  private duplicateName(name: string): ConflictException {
    return new ConflictException(`Hall with name "${name}" already exists`);
  }
}
