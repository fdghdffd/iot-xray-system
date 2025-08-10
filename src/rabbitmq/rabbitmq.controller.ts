import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RabbitMQService } from './rabbitmq.service';
import { XRayDataDto } from '../common/dto/xray-data.dto';
import { QueueInfoDto, ConnectionStatusDto } from '../common/dto/rabbitmq.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';

@ApiTags('RabbitMQ')
@Controller('rabbitmq')
export class RabbitMQController {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get('queue-info')
  @ApiOperation({ summary: 'Get queue information' })
  @ApiResponse({
    status: 200,
    description: 'Queue information retrieved successfully',
    type: QueueInfoDto,
  })
  async getQueueInfo(): Promise<SuccessResponseDto<QueueInfoDto>> {
    const queueInfo = await this.rabbitMQService.getQueueInfo();
    return {
      success: true,
      message: 'Queue information retrieved successfully',
      data: queueInfo,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('connection-status')
  @ApiOperation({ summary: 'Get connection status' })
  @ApiResponse({
    status: 200,
    description: 'Connection status retrieved successfully',
    type: ConnectionStatusDto,
  })
  getConnectionStatus(): SuccessResponseDto<ConnectionStatusDto> {
    const status = this.rabbitMQService.getConnectionStatus();
    return {
      success: true,
      message: 'Connection status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish X-ray data to queue' })
  @ApiResponse({
    status: 200,
    description: 'Data published successfully',
    type: SuccessResponseDto,
  })
  async publishXRayData(
    @Body() data: XRayDataDto,
  ): Promise<SuccessResponseDto> {
    await this.rabbitMQService.publishXRayData(data);
    return {
      success: true,
      message: 'X-ray data published successfully',
      data: {
        deviceId: data.deviceId,
        timestamp: data.time,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
