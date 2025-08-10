import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Coordinate data structure for X-ray measurements
 */
export class CoordinateDto {
  @ApiProperty({
    description: 'Latitude coordinate (GPS)',
    example: 51.339764,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate (GPS)',
    example: 12.339223833333334,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Speed value in m/s',
    example: 1.2038000000000002,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  speed: number;
}

/**
 * Individual data point with timestamp and coordinates
 */
export class DataPointDto {
  @ApiProperty({
    description: 'Measurement timestamp (milliseconds)',
    example: 762,
  })
  @IsNumber()
  timestamp: number;

  @ApiProperty({
    description: 'Coordinate array [latitude, longitude, speed]',
    example: [51.339764, 12.339223833333334, 1.2038000000000002],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(3)
  @IsNumber({}, { each: true })
  coordinates: [number, number, number];
}

/**
 * Complete X-ray data structure from IoT device
 */
export class XRayDataDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: '66bb584d4ae73e488c30a072',
    pattern: '^[a-f0-9]{24}$',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Array of X-ray data points with timestamps and coordinates',
    type: [DataPointDto],
    example: [
      {
        timestamp: 762,
        coordinates: [51.339764, 12.339223833333334, 1.2038000000000002],
      },
      {
        timestamp: 1766,
        coordinates: [51.33977733333333, 12.339211833333334, 1.531604],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataPointDto)
  data: Array<[number, [number, number, number]]>;

  @ApiProperty({
    description: 'Collection timestamp (Unix timestamp in milliseconds)',
    example: 1735683480000,
  })
  @IsNumber()
  time: number;
}

/**
 * Filter options for signal queries
 */
export class SignalFilterDto {
  @ApiProperty({
    description: 'Filter by specific device ID',
    required: false,
    example: '66bb584d4ae73e488c30a072',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description:
      'Start timestamp for time range filter (Unix timestamp in milliseconds)',
    required: false,
    example: 1735683480000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startTime?: number;

  @ApiProperty({
    description:
      'End timestamp for time range filter (Unix timestamp in milliseconds)',
    required: false,
    example: 1735683480000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  endTime?: number;

  @ApiProperty({
    description: 'Maximum number of results to return',
    required: false,
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiProperty({
    description: 'Number of results to skip (for pagination)',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;
}

/**
 * Data structure for creating a new signal record
 */
export class CreateSignalDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: '66bb584d4ae73e488c30a072',
    pattern: '^[a-f0-9]{24}$',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Collection timestamp (Unix timestamp in milliseconds)',
    example: 1735683480000,
  })
  @IsNumber()
  timestamp: number;

  @ApiProperty({
    description:
      'Raw X-ray data points as array of [timestamp, [lat, lng, speed]]',
    example: [
      [762, [51.339764, 12.339223, 1.2038]],
      [1766, [51.339777, 12.339211, 1.531604]],
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  data: any[];

  @ApiProperty({
    description: 'Number of data points in this signal',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  dataLength: number;

  @ApiProperty({
    description: 'Total number of coordinate values',
    example: 9,
    minimum: 3,
  })
  @IsNumber()
  @Min(3)
  dataVolume: number;

  @ApiProperty({
    description: 'Average speed across all data points (m/s)',
    example: 1.62482,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  averageSpeed: number;

  @ApiProperty({
    description: 'Maximum speed found in data points (m/s)',
    example: 2.13906,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  maxSpeed: number;

  @ApiProperty({
    description: 'Minimum speed found in data points (m/s)',
    example: 1.2038,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  minSpeed: number;

  @ApiProperty({
    description: 'Average coordinates [latitude, longitude]',
    example: [51.339774, 12.33921],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}
