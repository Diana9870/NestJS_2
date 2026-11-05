import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';

/**
 * Table `halls`. The seat layout is not stored: it is computed from `rows`
 * and `seatsPerRow`. The instance is also the response body of the hall routes.
 */
@Entity('halls')
@Unique('UQ_halls_name', ['name'])
export class Hall {
  @ApiProperty({
    format: 'uuid',
    example: '0b9f6f0c-6a8e-4a64-a6f4-2d8d1f1c9a10',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique among all halls', example: 'Hall 1' })
  @Column({ type: 'varchar' })
  name: string;

  @ApiProperty({ example: 3 })
  @Column({ type: 'integer' })
  rows: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'seats_per_row', type: 'integer' })
  seatsPerRow: number;

  /** Keeps the list in creation order. Not part of the API answer. */
  @Exclude()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Exclude()
  @OneToMany(() => Showing, (showing) => showing.hall)
  showings: Relation<Showing[]>;
}
