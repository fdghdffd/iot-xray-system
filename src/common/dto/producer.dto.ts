import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class SendSingleMessageDto {
  @ApiProperty({
    description: 'Device ID to send message to',
    example: '66bb584d4ae73e488c30a072',
  })
  @IsString()
  deviceId: string;
}

export class SendBulkMessagesDto {
  @ApiProperty({
    description: 'Array of device IDs to send messages to',
    example: ['66bb584d4ae73e488c30a072', '66bb584d4ae73e488c30a073'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({
    description: 'Number of messages to send per device',
    example: 5,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  count?: number;
}

export class SendRandomDataDto {
  @ApiProperty({
    description: 'Number of random messages to send',
    example: 10,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  count?: number;
}

export class StartSimulationDto {
  @ApiProperty({
    description: 'Device ID to simulate',
    example: '66bb584d4ae73e488c30a072',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Interval between messages in milliseconds',
    example: 5000,
    default: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  interval?: number;
}
