import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class QueueInfoDto {
  @ApiProperty({
    description: 'Queue name',
    example: 'x-ray-queue',
  })
  @IsString()
  queue: string;

  @ApiProperty({
    description: 'Number of messages in queue',
    example: 5,
  })
  @IsNumber()
  messageCount: number;

  @ApiProperty({
    description: 'Number of consumers',
    example: 1,
  })
  @IsNumber()
  consumerCount: number;
}

export class PublishMessageDto {
  @ApiProperty({
    description: 'Message content to publish',
    example: {
      deviceId: '66bb584d4ae73e488c30a072',
      data: [],
      time: 1735683480000,
    },
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Routing key (optional)',
    example: '',
    required: false,
  })
  @IsOptional()
  @IsString()
  routingKey?: string;
}

export class ConnectionStatusDto {
  @ApiProperty({
    description: 'Connection status',
    example: 'connected',
  })
  @IsString()
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'Connection URL',
    example: 'amqp://localhost:5672',
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Error message if connection failed',
    example: 'Connection refused',
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;
}
