import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';

/** Table `films`. The instance is also the response body of the film routes. */
@Entity('films')
export class Film {
  @ApiProperty({
    format: 'uuid',
    example: '7d1c0a9e-1b0b-4f43-9d34-0d9f0c6e3f11',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  @Column({ type: 'varchar' })
  title: string;

  @ApiProperty({ description: 'Duration in minutes', example: 166 })
  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes: number;

  @ApiProperty({ example: 2024 })
  @Column({ name: 'release_year', type: 'integer' })
  releaseYear: number;

  /** Keeps the list in creation order. Not part of the API answer. */
  @Exclude()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Exclude()
  @OneToMany(() => Showing, (showing) => showing.film)
  showings: Relation<Showing[]>;
}
