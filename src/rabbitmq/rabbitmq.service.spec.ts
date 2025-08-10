import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RabbitMQService, XRayData } from './rabbitmq.service';
import * as amqp from 'amqplib';

// Mock amqplib
jest.mock('amqplib');

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let configService: ConfigService;
  let mockConnection: any;
  let mockChannel: any;

  const mockXRayData: XRayData = {
    deviceId: 'test-device-123',
    data: [
      [1234567890, [51.339764, 12.339223, 1.2038]],
      [1234567891, [51.339777, 12.339211, 1.5316]],
    ],
    time: Date.now(),
  };

  beforeEach(async () => {
    // Mock Logger to suppress console output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    // Create mock connection and channel
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      checkQueue: jest.fn().mockResolvedValue({
        queue: 'x-ray-queue',
        messageCount: 5,
        consumerCount: 1,
      }),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      closed: false,
    };

    // Mock amqp.connect
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://localhost:5672'),
          },
        },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to RabbitMQ on module initialization', async () => {
      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'x-ray-exchange',
        'fanout',
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('x-ray-queue', {
        durable: true,
      });
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'x-ray-queue',
        'x-ray-exchange',
        '',
      );
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      (amqp.connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from RabbitMQ on module destruction', async () => {
      // First initialize
      await service.onModuleInit();

      // Then destroy
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('publishXRayData', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should publish X-ray data to RabbitMQ', async () => {
      await service.publishXRayData(mockXRayData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'x-ray-exchange',
        '',
        Buffer.from(JSON.stringify(mockXRayData)),
      );
    });

    it('should throw error when channel is not initialized', async () => {
      // Reset service to simulate no connection
      const newService = new RabbitMQService(configService);

      await expect(newService.publishXRayData(mockXRayData)).rejects.toThrow(
        'Channel not initialized',
      );
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish failed');
      mockChannel.publish.mockRejectedValue(error);

      await expect(service.publishXRayData(mockXRayData)).rejects.toThrow(
        'Publish failed',
      );
    });
  });

  describe('getQueueInfo', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return queue information', async () => {
      const queueInfo = await service.getQueueInfo();

      expect(queueInfo).toEqual({
        queue: 'x-ray-queue',
        messageCount: 5,
        consumerCount: 1,
      });
      expect(mockChannel.checkQueue).toHaveBeenCalledWith('x-ray-queue');
    });

    it('should throw error when channel is not initialized', async () => {
      const newService = new RabbitMQService(configService);

      await expect(newService.getQueueInfo()).rejects.toThrow(
        'Channel not initialized',
      );
    });

    it('should handle queue info errors', async () => {
      const error = new Error('Queue info failed');
      mockChannel.checkQueue.mockRejectedValue(error);

      await expect(service.getQueueInfo()).rejects.toThrow('Queue info failed');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected status when no connection', () => {
      const status = service.getConnectionStatus();

      expect(status).toEqual({
        status: 'disconnected',
        url: 'amqp://localhost:5672',
      });
    });

    it('should return connected status when connection exists', async () => {
      await service.onModuleInit();
      const status = service.getConnectionStatus();

      expect(status).toEqual({
        status: 'connected',
        url: 'amqp://localhost:5672',
      });
    });

    it('should return disconnected status when connection is closed', async () => {
      await service.onModuleInit();
      mockConnection.closed = true;

      const status = service.getConnectionStatus();

      expect(status).toEqual({
        status: 'disconnected',
        url: 'amqp://localhost:5672',
      });
    });

    it('should use custom RabbitMQ URL from config', () => {
      const customUrl = 'amqp://custom-host:5672';
      jest.spyOn(configService, 'get').mockReturnValue(customUrl);

      const status = service.getConnectionStatus();

      expect(status.url).toBe(customUrl);
    });
  });

  describe('message consumption', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should emit xray-data event when valid message is received', () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify(mockXRayData)),
      };

      // Set up event listener
      const eventSpy = jest.fn();
      service.on('xray-data', eventSpy);

      // Simulate message consumption
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      consumeCallback(mockMessage);

      expect(eventSpy).toHaveBeenCalledWith(mockXRayData);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle invalid JSON in message', () => {
      const mockMessage = {
        content: Buffer.from('invalid json'),
      };

      // Set up event listener
      const eventSpy = jest.fn();
      service.on('xray-data', eventSpy);

      // Simulate message consumption
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      consumeCallback(mockMessage);

      expect(eventSpy).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle null message', () => {
      // Set up event listener
      const eventSpy = jest.fn();
      service.on('xray-data', eventSpy);

      // Simulate null message
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      consumeCallback(null);

      expect(eventSpy).not.toHaveBeenCalled();
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      const errorHandler = jest.fn();
      mockConnection.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler.mockImplementation(handler);
        }
      });

      await service.onModuleInit();

      // Simulate connection error
      const error = new Error('Connection lost');
      errorHandler(error);

      expect(mockConnection.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should handle connection close events', async () => {
      const closeHandler = jest.fn();
      mockConnection.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler.mockImplementation(handler);
        }
      });

      await service.onModuleInit();

      // Simulate connection close
      closeHandler();

      expect(mockConnection.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
    });
  });
});
