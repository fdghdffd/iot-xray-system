import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Signal, SignalDocument } from './schemas/signal.schema';
import { RabbitMQService, XRayData } from '../rabbitmq/rabbitmq.service';
import { CreateSignalDto, SignalFilterDto } from '../common/dto/xray-data.dto';

/**
 * Statistics interface for signal data analysis
 */
interface SignalStatistics {
  /** Total number of signals */
  totalSignals: number;
  /** Total number of unique devices */
  totalDevices: number;
  /** Average data length across all signals */
  averageDataLength: number;
  /** Average data volume across all signals */
  averageDataVolume: number;
  /** Average speed across all signals */
  averageSpeed: number;
  /** Maximum speed found in signals */
  maxSpeed: number;
  /** Minimum speed found in signals */
  minSpeed: number;
}

/**
 * Signals Service for processing and managing X-ray data
 *
 * This service handles:
 * - Processing incoming X-ray data from RabbitMQ
 * - Calculating metrics and statistics
 * - CRUD operations on signal data
 * - Data aggregation and analysis
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private signalsService: SignalsService) {}
 *
 * // Process incoming X-ray data
 * const signal = await this.signalsService.processXRayData(xrayData);
 *
 * // Get statistics
 * const stats = await this.signalsService.getStatistics();
 * ```
 */
@Injectable()
export class SignalsService implements OnModuleInit {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    @InjectModel(Signal.name) private signalModel: Model<SignalDocument>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Initialize the service and set up event listeners
   * Listens for 'xray-data' events from RabbitMQ service
   */
  onModuleInit(): void {
    // Listen for X-ray data events from RabbitMQ
    this.rabbitMQService.on('xray-data', (data: XRayData) => {
      this.processXRayData(data).catch((error) => {
        this.logger.error('Error processing X-ray data:', error);
      });
    });
  }

  /**
   * Processes incoming X-ray data and stores it in the database
   *
   * This method:
   * 1. Calculates metrics from raw X-ray data
   * 2. Creates a new signal document
   * 3. Stores it in MongoDB
   *
   * @param xrayData - Raw X-ray data from IoT device
   * @returns Promise containing the created signal document
   * @throws {Error} When processing or storage fails
   *
   * @example
   * ```typescript
   * const xrayData: XRayData = {
   *   deviceId: 'device-123',
   *   data: [[1234567890, [51.339764, 12.339223, 1.2038]]],
   *   time: Date.now()
   * };
   * const signal = await this.signalsService.processXRayData(xrayData);
   * ```
   */
  async processXRayData(xrayData: XRayData): Promise<Signal> {
    try {
      const signalData = this.calculateSignalMetrics(xrayData);
      return await this.createSignal(signalData);
    } catch (error) {
      this.logger.error('Error processing X-ray data:', error);
      throw error;
    }
  }

  /**
   * Calculates various metrics from raw X-ray data
   *
   * Calculates:
   * - Data length (number of data points)
   * - Data volume (total coordinate count)
   * - Speed statistics (average, max, min)
   * - Average coordinates
   *
   * @param xrayData - Raw X-ray data to process
   * @returns Processed signal data with calculated metrics
   *
   * @example
   * ```typescript
   * const metrics = this.calculateSignalMetrics(xrayData);
   * console.log(`Data length: ${metrics.dataLength}`);
   * console.log(`Average speed: ${metrics.averageSpeed}`);
   * ```
   */
  private calculateSignalMetrics(xrayData: XRayData): CreateSignalDto {
    const { deviceId, data, time } = xrayData;

    // Calculate basic metrics
    const dataLength = data.length;
    const dataVolume = data.reduce((total, [, coordinates]) => {
      return total + coordinates.length;
    }, 0);

    // Extract and calculate speed statistics
    const speeds = data
      .map(([, coordinates]) => coordinates[2])
      .filter((speed) => speed !== undefined);
    const averageSpeed =
      speeds.length > 0
        ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
        : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;

    // Calculate average coordinates
    const validCoordinates = data
      .map(([, coordinates]) => [coordinates[0], coordinates[1]])
      .filter((coord) => coord[0] !== undefined && coord[1] !== undefined);
    const avgCoordinates: [number, number] =
      validCoordinates.length > 0
        ? [
            validCoordinates.reduce((sum, coord) => sum + coord[0], 0) /
              validCoordinates.length,
            validCoordinates.reduce((sum, coord) => sum + coord[1], 0) /
              validCoordinates.length,
          ]
        : [0, 0];

    return {
      deviceId,
      timestamp: time,
      data,
      dataLength,
      dataVolume,
      averageSpeed,
      maxSpeed,
      minSpeed,
      coordinates: avgCoordinates,
    } as CreateSignalDto;
  }

  /**
   * Creates a new signal document in the database
   *
   * @param createSignalDto - Signal data to create
   * @returns Promise containing the created signal document
   * @throws {Error} When database operation fails
   */
  async createSignal(createSignalDto: CreateSignalDto): Promise<Signal> {
    try {
      return await this.signalModel.create(createSignalDto);
    } catch (error) {
      this.logger.error('Error creating signal:', error);
      throw error;
    }
  }

  /**
   * Retrieves signals with optional filtering
   *
   * Supports filtering by:
   * - Device ID
   * - Time range (start/end timestamps)
   * - Pagination (limit/skip)
   *
   * @param filter - Optional filter parameters
   * @returns Promise containing array of signal documents
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * // Get all signals
   * const allSignals = await this.signalsService.findAll();
   *
   * // Get signals for specific device
   * const deviceSignals = await this.signalsService.findAll({
   *   deviceId: 'device-123',
   *   limit: 10
   * });
   *
   * // Get signals in time range
   * const timeRangeSignals = await this.signalsService.findAll({
   *   startTime: 1234567890,
   *   endTime: 1234567899
   * });
   * ```
   */
  async findAll(filter?: SignalFilterDto): Promise<Signal[]> {
    try {
      const query = this.signalModel.find();

      // Apply device ID filter
      if (filter?.deviceId) {
        query.where('deviceId', filter.deviceId);
      }

      // Apply time range filter
      if (filter?.startTime && filter?.endTime) {
        query.where('timestamp').gte(filter.startTime).lte(filter.endTime);
      }

      // Apply pagination
      if (filter?.limit) {
        query.limit(filter.limit);
      }

      if (filter?.skip) {
        query.skip(filter.skip);
      }

      return await query.exec();
    } catch (error) {
      this.logger.error('Error finding signals:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single signal by its ID
   *
   * @param id - Signal document ID
   * @returns Promise containing the signal document
   * @throws {Error} When signal is not found or database operation fails
   */
  async findOne(id: string): Promise<Signal> {
    try {
      const signal = await this.signalModel.findById(id).exec();
      if (!signal) {
        throw new Error(`Signal with ID ${id} not found`);
      }
      return signal;
    } catch (error) {
      this.logger.error('Error finding signal:', error);
      throw error;
    }
  }

  /**
   * Retrieves signals for a specific device with optional filtering
   *
   * @param deviceId - Device ID to filter by
   * @param filter - Optional additional filter parameters
   * @returns Promise containing array of signal documents
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * // Get all signals for a device
   * const deviceSignals = await this.signalsService.findByDeviceId('device-123');
   *
   * // Get recent signals for a device
   * const recentSignals = await this.signalsService.findByDeviceId('device-123', {
   *   startTime: Date.now() - 86400000, // Last 24 hours
   *   limit: 100
   * });
   * ```
   */
  async findByDeviceId(
    deviceId: string,
    filter?: SignalFilterDto,
  ): Promise<Signal[]> {
    try {
      const query = this.signalModel.find({ deviceId });

      // Apply time range filter
      if (filter?.startTime && filter?.endTime) {
        query.where('timestamp').gte(filter.startTime).lte(filter.endTime);
      }

      // Apply pagination
      if (filter?.limit) {
        query.limit(filter.limit);
      }

      if (filter?.skip) {
        query.skip(filter.skip);
      }

      return await query.exec();
    } catch (error) {
      this.logger.error('Error finding signals by device ID:', error);
      throw error;
    }
  }

  /**
   * Calculates statistics for signal data
   *
   * Provides aggregated statistics including:
   * - Total signals count
   * - Unique devices count
   * - Average metrics (data length, volume, speed)
   * - Min/max speed values
   *
   * @param deviceId - Optional device ID to filter statistics
   * @returns Promise containing calculated statistics
   * @throws {Error} When aggregation fails
   *
   * @example
   * ```typescript
   * // Get overall statistics
   * const overallStats = await this.signalsService.getStatistics();
   * console.log(`Total signals: ${overallStats.totalSignals}`);
   *
   * // Get statistics for specific device
   * const deviceStats = await this.signalsService.getStatistics('device-123');
   * console.log(`Device average speed: ${deviceStats.averageSpeed}`);
   * ```
   */
  async getStatistics(deviceId?: string): Promise<SignalStatistics> {
    try {
      // Build match stage for aggregation
      const matchStage: any = {};
      if (deviceId) {
        matchStage.deviceId = deviceId;
      }

      // Perform aggregation
      const result = await this.signalModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSignals: { $sum: 1 },
            totalDevices: { $addToSet: '$deviceId' },
            averageDataLength: { $avg: '$dataLength' },
            averageDataVolume: { $avg: '$dataVolume' },
            averageSpeed: { $avg: '$averageSpeed' },
            maxSpeed: { $max: '$maxSpeed' },
            minSpeed: { $min: '$minSpeed' },
          },
        },
      ]);

      // Return default values if no data found
      if (result.length === 0) {
        return {
          totalSignals: 0,
          totalDevices: 0,
          averageDataLength: 0,
          averageDataVolume: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          minSpeed: 0,
        };
      }

      // Process and return results
      const stats = result[0];
      if (!stats) {
        return {
          totalSignals: 0,
          totalDevices: 0,
          averageDataLength: 0,
          averageDataVolume: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          minSpeed: 0,
        };
      }
      return {
        totalSignals: stats.totalSignals,
        totalDevices: stats.totalDevices.length,
        averageDataLength: Math.round(stats.averageDataLength * 100) / 100,
        averageDataVolume: Math.round(stats.averageDataVolume * 100) / 100,
        averageSpeed: Math.round(stats.averageSpeed * 100) / 100,
        maxSpeed: stats.maxSpeed,
        minSpeed: stats.minSpeed,
      };
    } catch (error) {
      this.logger.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Updates an existing signal document
   *
   * @param id - Signal document ID
   * @param updateSignalDto - Partial data to update
   * @returns Promise containing the updated signal document
   * @throws {Error} When signal is not found or update fails
   */
  async updateSignal(
    id: string,
    updateSignalDto: Partial<CreateSignalDto>,
  ): Promise<Signal> {
    try {
      const updatedSignal = await this.signalModel
        .findByIdAndUpdate(id, updateSignalDto, { new: true })
        .exec();
      if (!updatedSignal) {
        throw new Error(`Signal with ID ${id} not found`);
      }
      return updatedSignal;
    } catch (error) {
      this.logger.error('Error updating signal:', error);
      throw error;
    }
  }

  /**
   * Deletes a signal document from the database
   *
   * @param id - Signal document ID
   * @throws {Error} When signal is not found or deletion fails
   */
  async deleteSignal(id: string): Promise<void> {
    try {
      const result = await this.signalModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new Error(`Signal with ID ${id} not found`);
      }
    } catch (error) {
      this.logger.error('Error deleting signal:', error);
      throw error;
    }
  }
}
