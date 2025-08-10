import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, XRayData } from '../rabbitmq/rabbitmq.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for X-ray data file structure
 * Maps device IDs to their corresponding data
 */
interface XRayDataFile {
  [deviceId: string]: {
    /** Array of data points with timestamp and coordinates */
    data: Array<[number, [number, number, number]]>;
    /** Unix timestamp when data was collected */
    time: number;
  };
}

/**
 * Producer Service for simulating IoT devices and sending X-ray data
 *
 * This service handles:
 * - Loading X-ray data from JSON files
 * - Simulating IoT device behavior
 * - Sending data to RabbitMQ
 * - Managing continuous simulations
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private producerService: ProducerService) {}
 *
 * // Send single message
 * await this.producerService.sendSingleMessage('device-123');
 *
 * // Start continuous simulation
 * const stopSimulation = await this.producerService.simulateDevice('device-123', 5000);
 * // Later: stopSimulation(); // Stop the simulation
 * ```
 */
@Injectable()
export class ProducerService implements OnModuleInit {
  private readonly logger = new Logger(ProducerService.name);

  /** Loaded X-ray data from file */
  private xrayData: XRayDataFile = {};

  /** Active simulation intervals for cleanup */
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly rabbitMQService: RabbitMQService) {
    // Initialize with sample data by default
    this.createSampleData();
  }

  /**
   * Initializes the service by loading X-ray data
   * This method should be called after the service is constructed
   */
  async onModuleInit(): Promise<void> {
    // Only load data if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.loadXRayData();
    }
  }

  /**
   * Loads X-ray data from the x-ray.json file
   *
   * This method:
   * 1. Attempts to read x-ray.json from the project root
   * 2. Parses the JSON data
   * 3. Falls back to sample data if file doesn't exist
   * 4. Logs the loading process
   *
   * @example
   * ```typescript
   * // Data file structure:
   * {
   *   "device-123": {
   *     "data": [[1234567890, [51.339764, 12.339223, 1.2038]]],
   *     "time": 1735683480000
   *   }
   * }
   * ```
   */
  private loadXRayData(): void {
    try {
      const dataPath = path.join(process.cwd(), 'x-ray.json');
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        this.xrayData = JSON.parse(fileContent) as XRayDataFile;
        this.logger.log(
          `Loaded X-ray data for ${Object.keys(this.xrayData).length} devices`,
        );
      } else {
        this.logger.warn('x-ray.json not found, creating sample data');
        this.createSampleData();
      }
    } catch (error) {
      this.logger.error('Error loading X-ray data:', error);
      this.createSampleData();
    }
  }

  /**
   * Creates sample X-ray data for testing purposes
   *
   * Generates realistic sample data with:
   * - Realistic coordinates (latitude/longitude)
   * - Speed values in reasonable range
   * - Current timestamp
   */
  private createSampleData(): void {
    this.xrayData = {
      '66bb584d4ae73e488c30a072': {
        data: [
          [762, [51.339764, 12.339223833333334, 1.2038000000000002]],
          [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
          [2763, [51.339782, 12.339196166666667, 2.13906]],
        ],
        time: Date.now(),
      },
    };
  }

  /**
   * Gets list of available device IDs
   *
   * @returns Array of device IDs that have data available
   *
   * @example
   * ```typescript
   * const devices = this.producerService.getAvailableDevices();
   * console.log('Available devices:', devices);
   * ```
   */
  getAvailableDevices(): string[] {
    return Object.keys(this.xrayData);
  }

  /**
   * Starts continuous simulation for a specific device
   *
   * This method:
   * 1. Validates device exists in data
   * 2. Sets up interval to send data periodically
   * 3. Cycles through available data points
   * 4. Sends data to RabbitMQ
   * 5. Returns cleanup function to stop simulation
   *
   * @param deviceId - Device ID to simulate
   * @param interval - Interval between messages in milliseconds (default: 5000)
   * @returns Promise resolving to cleanup function
   * @throws {Error} When device is not found in data
   *
   * @example
   * ```typescript
   * // Start simulation every 5 seconds
   * const stopSimulation = await this.producerService.simulateDevice('device-123', 5000);
   *
   * // Later, stop the simulation
   * stopSimulation();
   * ```
   */
  async simulateDevice(
    deviceId: string,
    interval: number = 5000,
  ): Promise<() => void> {
    this.logger.log(`Starting simulation for device: ${deviceId}`);

    if (!this.xrayData[deviceId]) {
      throw new Error(`Device ${deviceId} not found in data`);
    }

    const deviceData = this.xrayData[deviceId];
    let dataIndex = 0;

    // Set up interval to send data periodically
    const intervalId = setInterval(async () => {
      try {
        // Cycle through available data points
        const currentData = deviceData.data[dataIndex % deviceData.data.length];
        const xrayData: XRayData = {
          deviceId,
          data: [currentData],
          time: Date.now(),
        };

        await this.rabbitMQService.publishXRayData(xrayData);
        this.logger.log(
          `Sent data for device: ${deviceId}, index: ${dataIndex}`,
        );
        dataIndex++;
      } catch (error) {
        this.logger.error(`Error sending data for device ${deviceId}:`, error);
      }
    }, interval);

    // Store interval for cleanup
    this.simulationIntervals.set(deviceId, intervalId);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      this.simulationIntervals.delete(deviceId);
      this.logger.log(`Stopped simulation for device: ${deviceId}`);
    };
  }

  /**
   * Sends a single message for a specific device
   *
   * @param deviceId - Device ID to send message for
   * @throws {Error} When device is not found in data
   *
   * @example
   * ```typescript
   * await this.producerService.sendSingleMessage('device-123');
   * ```
   */
  async sendSingleMessage(deviceId: string): Promise<void> {
    if (!this.xrayData[deviceId]) {
      throw new Error(`Device ${deviceId} not found in data`);
    }

    const deviceData = this.xrayData[deviceId];
    const xrayData: XRayData = {
      deviceId,
      data: deviceData.data,
      time: Date.now(),
    };

    await this.rabbitMQService.publishXRayData(xrayData);
    this.logger.log(`Sent single message for device: ${deviceId}`);
  }

  /**
   * Sends bulk messages for multiple devices
   *
   * @param deviceIds - Array of device IDs to send messages for
   * @param count - Number of messages per device (default: 1)
   *
   * @example
   * ```typescript
   * // Send 5 messages for each device
   * await this.producerService.sendBulkMessages(['device-1', 'device-2'], 5);
   * ```
   */
  async sendBulkMessages(
    deviceIds: string[],
    count: number = 1,
  ): Promise<void> {
    for (const deviceId of deviceIds) {
      if (!this.xrayData[deviceId]) {
        this.logger.warn(`Device ${deviceId} not found, skipping`);
        continue;
      }

      for (let i = 0; i < count; i++) {
        await this.sendSingleMessage(deviceId);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between messages
      }
    }
  }

  /**
   * Generates random X-ray data from available devices
   *
   * @returns Randomly selected X-ray data from available devices
   *
   * @example
   * ```typescript
   * const randomData = this.producerService.generateRandomData();
   * console.log('Random device:', randomData.deviceId);
   * ```
   */
  generateRandomData(): XRayData {
    const deviceIds = this.getAvailableDevices();
    const randomDeviceId =
      deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const deviceData = this.xrayData[randomDeviceId];

    return {
      deviceId: randomDeviceId,
      data: deviceData.data,
      time: Date.now(),
    };
  }

  /**
   * Sends random X-ray data multiple times
   *
   * @param count - Number of random messages to send (default: 1)
   *
   * @example
   * ```typescript
   * // Send 10 random messages
   * await this.producerService.sendRandomData(10);
   * ```
   */
  async sendRandomData(count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      const randomData = this.generateRandomData();
      await this.rabbitMQService.publishXRayData(randomData);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Stops simulation for a specific device
   *
   * @param deviceId - Device ID to stop simulation for
   *
   * @example
   * ```typescript
   * this.producerService.stopSimulation('device-123');
   * ```
   */
  stopSimulation(deviceId: string): void {
    const intervalId = this.simulationIntervals.get(deviceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.simulationIntervals.delete(deviceId);
      this.logger.log(`Stopped simulation for device: ${deviceId}`);
    }
  }

  /**
   * Stops all active simulations
   *
   * @example
   * ```typescript
   * this.producerService.stopAllSimulations();
   * ```
   */
  stopAllSimulations(): void {
    for (const [deviceId] of this.simulationIntervals) {
      this.stopSimulation(deviceId);
    }
  }
}
