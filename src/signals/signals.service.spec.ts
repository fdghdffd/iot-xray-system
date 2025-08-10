import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { RabbitMQService, XRayData } from '../rabbitmq/rabbitmq.service';
import { Signal } from './schemas/signal.schema';
import { CreateSignalDto, SignalFilterDto } from '../common/dto/xray-data.dto';

describe('SignalsService', () => {
  let service: SignalsService;
  let signalModel: any;
  let rabbitMQService: any;

  const mockXRayData: XRayData = {
    deviceId: 'test-device-123',
    data: [
      [1234567890, [51.339764, 12.339223, 1.2038]],
      [1234567891, [51.339777, 12.339211, 1.5316]],
      [1234567892, [51.339782, 12.339196, 2.13906]],
    ],
    time: Date.now(),
  };

  const mockSignal = {
    _id: 'signal-id-123',
    deviceId: 'test-device-123',
    timestamp: Date.now(),
    data: mockXRayData.data,
    dataLength: 3,
    dataVolume: 9,
    averageSpeed: 1.62482,
    maxSpeed: 2.13906,
    minSpeed: 1.2038,
    coordinates: [51.339774, 12.33921],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Mock Logger to suppress console output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    // Create mock signal model
    const mockSignalModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findByIdAndDelete: jest.fn().mockReturnThis(),
      aggregate: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      save: jest.fn(),
      new: jest.fn(),
      create: jest.fn(),
      constructor: jest.fn(),
    };

    // Create mock RabbitMQ service
    const mockRabbitMQService = {
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        {
          provide: getModelToken(Signal.name),
          useValue: mockSignalModel,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<SignalsService>(SignalsService);
    signalModel = module.get(getModelToken(Signal.name));
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should set up event listener for xray-data', () => {
      service.onModuleInit();

      expect(rabbitMQService.on).toHaveBeenCalledWith(
        'xray-data',
        expect.any(Function),
      );
    });
  });

  describe('processXRayData', () => {
    it('should process X-ray data and create signal', async () => {
      signalModel.create.mockResolvedValue(mockSignal);

      const result = await service.processXRayData(mockXRayData);

      expect(result).toEqual(mockSignal);
      expect(signalModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'test-device-123',
          dataLength: 3,
          dataVolume: 9,
          averageSpeed: expect.closeTo(1.62482, 5),
          maxSpeed: 2.13906,
          minSpeed: 1.2038,
        }),
      );
    });

    it('should handle processing errors', async () => {
      const error = new Error('Processing failed');
      signalModel.create.mockRejectedValue(error);

      await expect(service.processXRayData(mockXRayData)).rejects.toThrow(
        'Processing failed',
      );
    });
  });

  describe('calculateSignalMetrics', () => {
    it('should calculate correct metrics from X-ray data', () => {
      const result = (service as any).calculateSignalMetrics(mockXRayData);

      expect(result).toEqual(
        expect.objectContaining({
          deviceId: 'test-device-123',
          dataLength: 3,
          dataVolume: 9,
          averageSpeed: expect.closeTo(1.62482, 5),
          maxSpeed: 2.13906,
          minSpeed: 1.2038,
          coordinates: expect.arrayContaining([
            expect.closeTo(51.339774, 5),
            expect.closeTo(12.33921, 5),
          ]),
        }),
      );
    });

    it('should handle empty data array', () => {
      const emptyData: XRayData = {
        deviceId: 'test-device-123',
        data: [],
        time: Date.now(),
      };

      const result = (service as any).calculateSignalMetrics(emptyData);

      expect(result).toEqual(
        expect.objectContaining({
          deviceId: 'test-device-123',
          dataLength: 0,
          dataVolume: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          minSpeed: 0,
          coordinates: [0, 0],
        }),
      );
    });

    it('should handle data with missing speed values', () => {
      const incompleteData: XRayData = {
        deviceId: 'test-device-123',
        data: [
          [1234567890, [51.339764, 12.339223, undefined]],
          [1234567891, [51.339777, 12.339211, 1.5316]],
        ],
        time: Date.now(),
      };

      const result = (service as any).calculateSignalMetrics(incompleteData);

      expect(result.averageSpeed).toBe(1.5316);
      expect(result.maxSpeed).toBe(1.5316);
      expect(result.minSpeed).toBe(1.5316);
    });
  });

  describe('createSignal', () => {
    it('should create a new signal', async () => {
      const createSignalDto: CreateSignalDto = {
        deviceId: 'test-device-123',
        timestamp: Date.now(),
        data: mockXRayData.data,
        dataLength: 3,
        dataVolume: 9,
        averageSpeed: 1.62482,
        maxSpeed: 2.13906,
        minSpeed: 1.2038,
        coordinates: [51.339774, 12.33921],
      };

      signalModel.create.mockResolvedValue(mockSignal);

      const result = await service.createSignal(createSignalDto);

      expect(result).toEqual(mockSignal);
      expect(signalModel.create).toHaveBeenCalledWith(createSignalDto);
    });

    it('should handle creation errors', async () => {
      const createSignalDto: CreateSignalDto = {
        deviceId: 'test-device-123',
        timestamp: Date.now(),
        data: mockXRayData.data,
        dataLength: 3,
        dataVolume: 9,
        averageSpeed: 1.62482,
        maxSpeed: 2.13906,
        minSpeed: 1.2038,
        coordinates: [51.339774, 12.33921],
      };

      const error = new Error('Creation failed');
      signalModel.create.mockRejectedValue(error);

      await expect(service.createSignal(createSignalDto)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all signals without filter', async () => {
      signalModel.exec.mockResolvedValue([mockSignal]);

      const result = await service.findAll();

      expect(result).toEqual([mockSignal]);
      expect(signalModel.find).toHaveBeenCalled();
      expect(signalModel.exec).toHaveBeenCalled();
    });

    it('should apply device ID filter', async () => {
      const filter: SignalFilterDto = { deviceId: 'test-device-123' };
      signalModel.exec.mockResolvedValue([mockSignal]);

      await service.findAll(filter);

      expect(signalModel.where).toHaveBeenCalledWith(
        'deviceId',
        'test-device-123',
      );
    });

    it('should apply time range filter', async () => {
      const filter: SignalFilterDto = {
        startTime: 1234567890,
        endTime: 1234567899,
      };
      signalModel.exec.mockResolvedValue([mockSignal]);

      await service.findAll(filter);

      expect(signalModel.gte).toHaveBeenCalledWith(1234567890);
      expect(signalModel.lte).toHaveBeenCalledWith(1234567899);
    });

    it('should apply pagination', async () => {
      const filter: SignalFilterDto = { limit: 10, skip: 5 };
      signalModel.exec.mockResolvedValue([mockSignal]);

      await service.findAll(filter);

      expect(signalModel.limit).toHaveBeenCalledWith(10);
      expect(signalModel.skip).toHaveBeenCalledWith(5);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      signalModel.exec.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Query failed');
    });
  });

  describe('findOne', () => {
    it('should return signal by ID', async () => {
      signalModel.exec.mockResolvedValue(mockSignal);

      const result = await service.findOne('signal-id-123');

      expect(result).toEqual(mockSignal);
      expect(signalModel.findById).toHaveBeenCalledWith('signal-id-123');
    });

    it('should throw error when signal not found', async () => {
      signalModel.exec.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Signal with ID non-existent-id not found',
      );
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      signalModel.exec.mockRejectedValue(error);

      await expect(service.findOne('signal-id-123')).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('findByDeviceId', () => {
    it('should return signals for specific device', async () => {
      signalModel.exec.mockResolvedValue([mockSignal]);

      const result = await service.findByDeviceId('test-device-123');

      expect(result).toEqual([mockSignal]);
      expect(signalModel.find).toHaveBeenCalledWith({
        deviceId: 'test-device-123',
      });
    });

    it('should apply additional filters', async () => {
      const filter: SignalFilterDto = {
        startTime: 1234567890,
        endTime: 1234567899,
        limit: 10,
      };
      signalModel.exec.mockResolvedValue([mockSignal]);

      await service.findByDeviceId('test-device-123', filter);

      expect(signalModel.gte).toHaveBeenCalledWith(1234567890);
      expect(signalModel.lte).toHaveBeenCalledWith(1234567899);
      expect(signalModel.limit).toHaveBeenCalledWith(10);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      signalModel.exec.mockRejectedValue(error);

      await expect(service.findByDeviceId('test-device-123')).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('getStatistics', () => {
    it('should return overall statistics', async () => {
      const mockAggregationResult = [
        {
          totalSignals: 100,
          totalDevices: ['device-1', 'device-2'],
          averageDataLength: 5.5,
          averageDataVolume: 16.5,
          averageSpeed: 1.8,
          maxSpeed: 3.0,
          minSpeed: 0.5,
        },
      ];

      signalModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalSignals: 100,
        totalDevices: 2,
        averageDataLength: 5.5,
        averageDataVolume: 16.5,
        averageSpeed: 1.8,
        maxSpeed: 3.0,
        minSpeed: 0.5,
      });
    });

    it('should return device-specific statistics', async () => {
      const mockAggregationResult = [
        {
          totalSignals: 50,
          totalDevices: ['device-1'],
          averageDataLength: 4.2,
          averageDataVolume: 12.6,
          averageSpeed: 1.5,
          maxSpeed: 2.5,
          minSpeed: 0.8,
        },
      ];

      signalModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.getStatistics('device-1');

      expect(result.totalSignals).toBe(50);
      expect(result.totalDevices).toBe(1);
    });

    it('should return default values when no data found', async () => {
      signalModel.aggregate.mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalSignals: 0,
        totalDevices: 0,
        averageDataLength: 0,
        averageDataVolume: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        minSpeed: 0,
      });
    });

    it('should handle aggregation errors', async () => {
      const error = new Error('Aggregation failed');
      signalModel.aggregate.mockRejectedValue(error);

      await expect(service.getStatistics()).rejects.toThrow(
        'Aggregation failed',
      );
    });
  });

  describe('updateSignal', () => {
    it('should update signal successfully', async () => {
      const updateData = { dataLength: 5 };
      const updatedSignal = { ...mockSignal, ...updateData };

      signalModel.exec.mockResolvedValue(updatedSignal);

      const result = await service.updateSignal('signal-id-123', updateData);

      expect(result).toEqual(updatedSignal);
      expect(signalModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'signal-id-123',
        updateData,
        { new: true },
      );
    });

    it('should throw error when signal not found', async () => {
      signalModel.exec.mockResolvedValue(null);

      await expect(service.updateSignal('non-existent-id', {})).rejects.toThrow(
        'Signal with ID non-existent-id not found',
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      signalModel.exec.mockRejectedValue(error);

      await expect(service.updateSignal('signal-id-123', {})).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('deleteSignal', () => {
    it('should delete signal successfully', async () => {
      signalModel.exec.mockResolvedValue(mockSignal);

      await service.deleteSignal('signal-id-123');

      expect(signalModel.findByIdAndDelete).toHaveBeenCalledWith(
        'signal-id-123',
      );
    });

    it('should throw error when signal not found', async () => {
      signalModel.exec.mockResolvedValue(null);

      await expect(service.deleteSignal('non-existent-id')).rejects.toThrow(
        'Signal with ID non-existent-id not found',
      );
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      signalModel.exec.mockRejectedValue(error);

      await expect(service.deleteSignal('signal-id-123')).rejects.toThrow(
        'Deletion failed',
      );
    });
  });
});
