import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EventEmitter } from 'events';
import { QueueInfoDto, ConnectionStatusDto } from '../common/dto/rabbitmq.dto';

/**
 * Interface representing X-ray data structure
 * Contains device information and measurement data
 */
export interface XRayData {
  /** Unique identifier for the IoT device */
  deviceId: string;
  /** Array of data points with timestamp and coordinates */
  data: Array<[number, [number, number, number]]>;
  /** Unix timestamp when data was collected */
  time: number;
}

/**
 * Interface for RabbitMQ connection management
 */
export interface RabbitMQConnection {
  /** Active RabbitMQ connection */
  connection: amqp.Connection;
  /** Active RabbitMQ channel */
  channel: amqp.Channel;
}

/**
 * Interface for RabbitMQ message structure
 */
export interface RabbitMQMessage {
  /** Message content as buffer */
  content: Buffer;
  /** Message fields (routing info) */
  fields: amqp.MessageFields;
  /** Message properties (headers, etc.) */
  properties: amqp.MessageProperties;
}

/**
 * RabbitMQ Service for handling message queue operations
 *
 * This service manages:
 * - Connection to RabbitMQ server
 * - Queue and exchange setup
 * - Message publishing and consuming
 * - Event emission for X-ray data processing
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private rabbitMQService: RabbitMQService) {}
 *
 * // Publish X-ray data
 * await this.rabbitMQService.publishXRayData(xrayData);
 *
 * // Listen for incoming data
 * this.rabbitMQService.on('xray-data', (data) => {
 *   console.log('Received:', data);
 * });
 * ```
 */
@Injectable()
export class RabbitMQService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQService.name);

  /** Active RabbitMQ connection */
  private connection: any = null;

  /** Active RabbitMQ channel */
  private channel: any = null;

  /** Exchange name for X-ray data */
  private readonly exchangeName = 'x-ray-exchange';

  /** Queue name for X-ray data */
  private readonly queueName = 'x-ray-queue';

  /** Routing key (empty for fanout exchange) */
  private readonly routingKey = '';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /**
   * Initialize the service when the module starts
   * Establishes connection to RabbitMQ and sets up queues
   */
  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  /**
   * Cleanup when the module is destroyed
   * Closes all connections gracefully
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Establishes connection to RabbitMQ server
   *
   * This method:
   * 1. Connects to RabbitMQ using configuration
   * 2. Creates a channel for operations
   * 3. Sets up error and close event handlers
   * 4. Initializes queue and exchange setup
   * 5. Starts the consumer
   *
   * @throws {Error} When connection fails
   */
  private async connect(): Promise<void> {
    try {
      // Get RabbitMQ URL from configuration or use default
      const rabbitmqUrl =
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://localhost:5672';

      // Establish connection
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Set up error handling
      this.connection.on('error', (error: Error) => {
        this.logger.error('RabbitMQ connection error:', error);
      });

      // Set up close handling
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      // Initialize queue infrastructure
      await this.setupQueue();
      await this.startConsumer();

      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Sets up RabbitMQ exchange and queue
   *
   * Creates:
   * - Fanout exchange for broadcasting messages
   * - Durable queue for message persistence
   * - Binding between exchange and queue
   *
   * @throws {Error} When setup fails
   */
  private async setupQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      // Create fanout exchange (broadcasts to all bound queues)
      await this.channel.assertExchange(this.exchangeName, 'fanout', {
        durable: true, // Survives server restart
      });

      // Create durable queue (survives server restart)
      await this.channel.assertQueue(this.queueName, {
        durable: true,
      });

      // Bind queue to exchange with empty routing key
      await this.channel.bindQueue(
        this.queueName,
        this.exchangeName,
        this.routingKey,
      );

      this.logger.log('Queue setup completed');
    } catch (error) {
      this.logger.error('Failed to setup queue:', error);
      throw error;
    }
  }

  /**
   * Starts consuming messages from the queue
   *
   * This method:
   * 1. Listens for incoming messages
   * 2. Parses JSON content as XRayData
   * 3. Emits 'xray-data' event for other services
   * 4. Acknowledges successful processing
   * 5. Rejects failed messages for retry
   *
   * @throws {Error} When consumer setup fails
   */
  private async startConsumer(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      // Start consuming messages
      await this.channel.consume(this.queueName, (msg: any) => {
        if (msg) {
          try {
            // Parse message content as X-ray data
            const content = JSON.parse(msg.content.toString()) as XRayData;
            this.logger.log(
              `Received X-ray data from device: ${content.deviceId}`,
            );

            // Emit event for other services to handle
            this.emit('xray-data', content);

            // Acknowledge successful processing
            this.channel?.ack(msg);
          } catch (error) {
            this.logger.error('Error processing message:', error);
            // Reject message and requeue for retry
            this.channel?.nack(msg, false, true);
          }
        }
      });
      this.logger.log('Consumer started');
    } catch (error) {
      this.logger.error('Failed to start consumer:', error);
      throw error;
    }
  }

  /**
   * Publishes X-ray data to the RabbitMQ exchange
   *
   * @param data - X-ray data to publish
   * @throws {Error} When publishing fails or channel is not initialized
   *
   * @example
   * ```typescript
   * const xrayData: XRayData = {
   *   deviceId: 'device-123',
   *   data: [[1234567890, [51.339764, 12.339223, 1.2038]]],
   *   time: Date.now()
   * };
   * await this.rabbitMQService.publishXRayData(xrayData);
   * ```
   */
  async publishXRayData(data: XRayData): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      // Convert data to JSON string
      const message = JSON.stringify(data);

      // Publish to exchange
      await this.channel.publish(
        this.exchangeName,
        this.routingKey,
        Buffer.from(message),
      );

      this.logger.log(`Published X-ray data for device: ${data.deviceId}`);
    } catch (error) {
      this.logger.error('Failed to publish X-ray data:', error);
      throw error;
    }
  }

  /**
   * Gets information about the current queue
   *
   * @returns Promise containing queue information (name, message count, consumer count)
   * @throws {Error} When channel is not initialized or operation fails
   *
   * @example
   * ```typescript
   * const queueInfo = await this.rabbitMQService.getQueueInfo();
   * console.log(`Queue: ${queueInfo.queue}, Messages: ${queueInfo.messageCount}`);
   * ```
   */
  async getQueueInfo(): Promise<QueueInfoDto> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      const queueInfo = await this.channel.checkQueue(this.queueName);
      return {
        queue: queueInfo.queue,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      };
    } catch (error) {
      this.logger.error('Failed to get queue info:', error);
      throw error;
    }
  }

  /**
   * Gets the current connection status
   *
   * @returns Connection status information including URL and state
   *
   * @example
   * ```typescript
   * const status = this.rabbitMQService.getConnectionStatus();
   * if (status.status === 'connected') {
   *   console.log('Connected to:', status.url);
   * }
   * ```
   */
  getConnectionStatus(): ConnectionStatusDto {
    const url =
      this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';

    if (!this.connection) {
      return {
        status: 'disconnected',
        url,
      };
    }

    // Check if connection is closed using a safer approach
    const isClosed = this.connection.closed || false;
    if (isClosed) {
      return {
        status: 'disconnected',
        url,
      };
    }

    return {
      status: 'connected',
      url,
    };
  }

  /**
   * Gracefully disconnects from RabbitMQ
   *
   * This method:
   * 1. Closes the channel
   * 2. Closes the connection
   * 3. Resets internal state
   * 4. Logs the disconnection
   */
  private async disconnect(): Promise<void> {
    try {
      // Close channel first
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      // Then close connection
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }
}
