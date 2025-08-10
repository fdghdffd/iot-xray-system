import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProducerService } from './producer.service';
import {
  SendSingleMessageDto,
  SendBulkMessagesDto,
  SendRandomDataDto,
  StartSimulationDto,
} from '../common/dto/producer.dto';

/**
 * Producer Controller - IoT Device Simulation
 *
 * This controller handles IoT device simulation and X-Ray data generation
 */
@ApiTags('🤖 Producer - IoT Device Simulation')
@Controller('producer')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  @Get('devices')
  @ApiOperation({
    summary: '📱 Get Available Devices',
    description: 'Get list of all available IoT devices for simulation',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Device list retrieved successfully',
    schema: {
      example: {
        devices: ['66bb584d4ae73e488c30a072', 'device2', 'device3'],
        count: 3,
      },
    },
  })
  getAvailableDevices() {
    const devices = this.producerService.getAvailableDevices();
    return { devices, count: devices.length };
  }

  @Post('send-single')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '📤 Send Single X-Ray Message',
    description: 'Send a single X-Ray message from a specific IoT device',
  })
  @ApiBody({
    type: SendSingleMessageDto,
    description: 'Device ID for sending message',
    examples: {
      example1: {
        summary: 'Send from main device',
        value: {
          deviceId: '66bb584d4ae73e488c30a072',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Message sent successfully',
    schema: {
      example: {
        message: 'Message sent successfully',
        deviceId: '66bb584d4ae73e488c30a072',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Error sending message',
    schema: {
      example: {
        success: false,
        message: 'Error sending message',
        errorCode: 'SEND_ERROR',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async sendSingleMessage(@Body() body: SendSingleMessageDto) {
    await this.producerService.sendSingleMessage(body.deviceId);
    return {
      message: 'Message sent successfully',
      deviceId: body.deviceId,
    };
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '📦 Send Multiple Messages',
    description: 'Send multiple X-Ray messages from multiple IoT devices',
  })
  @ApiBody({
    type: SendBulkMessagesDto,
    description: 'List of devices and message count',
    examples: {
      example1: {
        summary: 'Send from two devices',
        value: {
          deviceIds: ['66bb584d4ae73e488c30a072', 'device2'],
          count: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Messages sent successfully',
    schema: {
      example: {
        message: 'Messages sent successfully',
        deviceIds: ['66bb584d4ae73e488c30a072', 'device2'],
        count: 5,
        totalMessages: 10,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Error sending messages',
    schema: {
      example: {
        success: false,
        message: 'Error sending messages',
        errorCode: 'BULK_SEND_ERROR',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async sendBulkMessages(@Body() body: SendBulkMessagesDto) {
    const count = body.count || 1;
    await this.producerService.sendBulkMessages(body.deviceIds, count);
    return {
      message: 'Messages sent successfully',
      deviceIds: body.deviceIds,
      count,
      totalMessages: body.deviceIds.length * count,
    };
  }

  @Post('send-random')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🎲 Send Random Data',
    description: 'Generate and send random X-Ray data for testing',
  })
  @ApiBody({
    type: SendRandomDataDto,
    description: 'Number of random messages to send',
    examples: {
      example1: {
        summary: 'Send 10 random messages',
        value: {
          count: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Random data sent successfully',
    schema: {
      example: {
        message: 'Random data sent successfully',
        count: 10,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Error sending random data',
    schema: {
      example: {
        success: false,
        message: 'Error sending random data',
        errorCode: 'RANDOM_SEND_ERROR',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async sendRandomData(@Body() body: SendRandomDataDto) {
    const count = body.count || 1;
    await this.producerService.sendRandomData(count);
    return {
      message: 'Random data sent successfully',
      count,
    };
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔄 Start Continuous Simulation',
    description:
      'Start continuous simulation that sends X-Ray messages at regular intervals',
  })
  @ApiBody({
    type: StartSimulationDto,
    description: 'Simulation settings',
    examples: {
      example1: {
        summary: 'Simulate with 5 second interval',
        value: {
          deviceId: '66bb584d4ae73e488c30a072',
          interval: 5000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Simulation started successfully',
    schema: {
      example: {
        message: 'Simulation started successfully',
        deviceId: '66bb584d4ae73e488c30a072',
        interval: 5000,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Error starting simulation',
    schema: {
      example: {
        success: false,
        message: 'Error starting simulation',
        errorCode: 'SIMULATION_ERROR',
        timestamp: '2025-01-08T10:00:00.000Z',
      },
    },
  })
  async startSimulation(@Body() body: StartSimulationDto) {
    const interval = body.interval || 5000;
    await this.producerService.simulateDevice(body.deviceId, interval);
    return {
      message: 'Simulation started successfully',
      deviceId: body.deviceId,
      interval,
    };
  }
}
