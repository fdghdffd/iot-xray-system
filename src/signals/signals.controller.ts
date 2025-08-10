import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SignalsService } from './signals.service';
import { CreateSignalDto, SignalFilterDto } from '../common/dto/xray-data.dto';
import {
  SuccessResponseDto,
  ErrorResponseDto,
} from '../common/dto/response.dto';
import { Signal } from './schemas/signal.schema';

/**
 * Signals Controller - X-Ray Data Management
 *
 * This controller handles X-Ray data management and retrieval from IoT devices
 */
@ApiTags('📊 Signals - X-Ray Data Management')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  @ApiOperation({
    summary: '📝 Create New X-Ray Record',
    description: 'Create and store a new X-Ray record from IoT device',
  })
  @ApiBody({
    type: CreateSignalDto,
    description: 'X-Ray data to store',
    examples: {
      example1: {
        summary: 'Simple Example',
        value: {
          deviceId: '66bb584d4ae73e488c30a072',
          timestamp: 1735683480000,
          data: [
            [762, [51.339764, 12.339223, 1.2038]],
            [1766, [51.339777, 12.339211, 1.531604]],
          ],
          dataLength: 2,
          dataVolume: 6,
          averageSpeed: 1.3677,
          maxSpeed: 1.531604,
          minSpeed: 1.2038,
          coordinates: [51.33977, 12.339217],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '✅ Record created successfully',
    schema: {
      example: {
        success: true,
        message: 'X-Ray record created successfully',
        data: {
          deviceId: '66bb584d4ae73e488c30a072',
          timestamp: 1735683480000,
          dataLength: 2,
          averageSpeed: 1.3677,
          coordinates: [51.33977, 12.339217],
        },
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Invalid input data',
    schema: {
      example: {
        success: false,
        message: 'Invalid input data',
        errorCode: 'VALIDATION_ERROR',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async create(
    @Body() createSignalDto: CreateSignalDto,
  ): Promise<SuccessResponseDto<Signal>> {
    try {
      const signal = await this.signalsService.createSignal(createSignalDto);
      return {
        success: true,
        message: 'X-Ray record created successfully',
        data: signal,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({
    summary: '🔍 Search and Filter X-Ray Records',
    description:
      'Retrieve all X-Ray records with filtering by device, time, and pagination',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'Filter by device ID (optional)',
    example: '66bb584d4ae73e488c30a072',
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Start time for filter (optional)',
    example: 1735683480000,
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'End time for filter (optional)',
    example: 1735683480000,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page (default: 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of results to skip (pagination)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: '✅ Results retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'X-Ray records retrieved successfully',
        data: [
          {
            deviceId: '66bb584d4ae73e488c30a072',
            timestamp: 1735683480000,
            dataLength: 3,
            averageSpeed: 1.62482,
            coordinates: [51.339774, 12.33921],
          },
          {
            deviceId: '66bb584d4ae73e488c30a072',
            timestamp: 1735683481000,
            dataLength: 2,
            averageSpeed: 1.531604,
            coordinates: [51.339777, 12.339211],
          },
        ],
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async findAll(
    @Query() filter: SignalFilterDto,
  ): Promise<SuccessResponseDto<Signal[]>> {
    try {
      const signals = await this.signalsService.findAll(filter);
      return {
        success: true,
        message: 'X-Ray records retrieved successfully',
        data: signals,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('statistics')
  @ApiOperation({
    summary: '📈 Data Statistics and Analysis',
    description:
      'Get overall statistics from X-Ray records including count, average speed, and device distribution',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'Filter statistics by specific device (optional)',
    example: '66bb584d4ae73e488c30a072',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          totalSignals: 150,
          totalDevices: 5,
          averageSpeed: 1.45,
          maxSpeed: 3.2,
          minSpeed: 0.1,
          averageDataLength: 25,
          deviceDistribution: {
            '66bb584d4ae73e488c30a072': 30,
            device2: 25,
          },
        },
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async getStatistics(
    @Query('deviceId') deviceId?: string,
  ): Promise<SuccessResponseDto> {
    try {
      const statistics = await this.signalsService.getStatistics(deviceId);
      return {
        success: true,
        message: 'Statistics retrieved successfully',
        data: statistics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('device/:deviceId')
  @ApiOperation({
    summary: '📱 Device-Specific Records',
    description: 'Retrieve all X-Ray records from a specific IoT device',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID',
    example: '66bb584d4ae73e488c30a072',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Device records retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Device records retrieved successfully',
        data: [
          {
            deviceId: '66bb584d4ae73e488c30a072',
            timestamp: 1735683480000,
            dataLength: 3,
            averageSpeed: 1.62482,
          },
        ],
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '❌ Device not found',
    schema: {
      example: {
        success: false,
        message: 'Device not found',
        errorCode: 'DEVICE_NOT_FOUND',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async findByDeviceId(
    @Param('deviceId') deviceId: string,
    @Query() filter: SignalFilterDto,
  ): Promise<SuccessResponseDto<Signal[]>> {
    try {
      const signals = await this.signalsService.findByDeviceId(
        deviceId,
        filter,
      );
      return {
        success: true,
        message: 'Device records retrieved successfully',
        data: signals,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: '🔍 Get Specific Record',
    description: 'Retrieve complete information of a specific X-Ray record',
  })
  @ApiParam({
    name: 'id',
    description: 'Record ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Record retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Record retrieved successfully',
        data: {
          deviceId: '66bb584d4ae73e488c30a072',
          timestamp: 1735683480000,
          dataLength: 3,
          averageSpeed: 1.62482,
          coordinates: [51.339774, 12.33921],
        },
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '❌ Record not found',
    schema: {
      example: {
        success: false,
        message: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<Signal>> {
    try {
      const signal = await this.signalsService.findOne(id);
      return {
        success: true,
        message: 'Record retrieved successfully',
        data: signal,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: '✏️ Update Record',
    description: 'Partially update an existing X-Ray record',
  })
  @ApiParam({
    name: 'id',
    description: 'Record ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: CreateSignalDto,
    description: 'New data for update',
    examples: {
      example1: {
        summary: 'Update Speed',
        value: {
          averageSpeed: 2.0,
          maxSpeed: 3.0,
          minSpeed: 1.0,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Record updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Record updated successfully',
        data: {
          deviceId: '66bb584d4ae73e488c30a072',
          averageSpeed: 2.0,
          maxSpeed: 3.0,
          minSpeed: 1.0,
        },
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '❌ Record not found',
    schema: {
      example: {
        success: false,
        message: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateSignalDto: Partial<CreateSignalDto>,
  ): Promise<SuccessResponseDto<Signal>> {
    try {
      const signal = await this.signalsService.updateSignal(
        id,
        updateSignalDto,
      );
      return {
        success: true,
        message: 'Record updated successfully',
        data: signal,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: '🗑️ Delete Record',
    description: 'Permanently delete an X-Ray record from database',
  })
  @ApiParam({
    name: 'id',
    description: 'Record ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Record deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Record deleted successfully',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '❌ Record not found',
    schema: {
      example: {
        success: false,
        message: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    try {
      await this.signalsService.deleteSignal(id);
      return {
        success: true,
        message: 'Record deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }
  }
}
