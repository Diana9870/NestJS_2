import { ApiProperty } from '@nestjs/swagger';

/** Shape of every error body, produced by the global AllExceptionsFilter. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    description:
      'Reason of the error: a string, or a list of validation messages',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Film with id 7d1c0a9e-1b0b-4f43-9d34-0d9f0c6e3f11 not found',
  })
  message: string | string[];

  @ApiProperty({
    description: 'Path of the request that failed',
    example: '/films/7d1c0a9e-1b0b-4f43-9d34-0d9f0c6e3f11',
  })
  path: string;
}
