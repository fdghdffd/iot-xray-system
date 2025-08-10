import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SignalDocument = Signal & Document;

/**
 * Signal Schema for storing X-ray data from IoT devices
 *
 * This schema represents processed X-ray data including:
 * - Device identification
 * - Timestamp information
 * - Raw coordinate data
 * - Calculated metrics (speed statistics, data volume)
 * - Average coordinates
 */
@Schema({
  timestamps: true,
  collection: 'signals',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Signal {
  @Prop({
    required: true,
    type: String,
    description: 'Unique device identifier (24-character hex string)',
    example: '66bb584d4ae73e488c30a072',
    match: /^[a-f0-9]{24}$/,
  })
  deviceId: string;

  @Prop({
    required: true,
    type: Number,
    description: 'Collection timestamp (Unix timestamp in milliseconds)',
    example: 1735683480000,
  })
  timestamp: number;

  @Prop({
    required: true,
    description:
      'Raw X-ray data points: [timestamp, [latitude, longitude, speed]]',
    example: [
      [762, [51.339764, 12.339223833333334, 1.2038000000000002]],
      [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
    ],
  })
  data: Array<[number, [number, number, number]]>;

  @Prop({
    required: true,
    type: Number,
    description: 'Number of data points in this signal',
    example: 3,
    min: 1,
  })
  dataLength: number;

  @Prop({
    required: true,
    type: Number,
    description: 'Total number of coordinate values (dataLength * 3)',
    example: 9,
    min: 3,
  })
  dataVolume: number;

  @Prop({
    type: Number,
    description: 'Average speed across all data points (m/s)',
    example: 1.62482,
    min: 0,
  })
  averageSpeed?: number;

  @Prop({
    type: Number,
    description: 'Maximum speed found in data points (m/s)',
    example: 2.13906,
    min: 0,
  })
  maxSpeed?: number;

  @Prop({
    type: Number,
    description: 'Minimum speed found in data points (m/s)',
    example: 1.2038,
    min: 0,
  })
  minSpeed?: number;

  @Prop({
    type: [Number],
    description: 'Average coordinates [latitude, longitude]',
    example: [51.339774, 12.33921],
    validate: {
      validator: function (coords: number[]) {
        return (
          coords.length === 2 &&
          coords[0] >= -90 &&
          coords[0] <= 90 &&
          coords[1] >= -180 &&
          coords[1] <= 180
        );
      },
      message: 'Coordinates must be [latitude, longitude] with valid ranges',
    },
  })
  coordinates?: [number, number];

  @Prop({
    type: Date,
    default: Date.now,
    description: 'Record creation timestamp',
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
    description: 'Record last update timestamp',
  })
  updatedAt: Date;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);

// Indexes for better query performance
SignalSchema.index({ deviceId: 1 });
SignalSchema.index({ timestamp: 1 });
SignalSchema.index({ createdAt: 1 });
SignalSchema.index({ deviceId: 1, timestamp: 1 });
SignalSchema.index({ deviceId: 1, createdAt: 1 });

// Virtual for formatted timestamp
SignalSchema.virtual('formattedTimestamp').get(function () {
  return new Date(this.timestamp).toISOString();
});

// Virtual for formatted creation date
SignalSchema.virtual('formattedCreatedAt').get(function () {
  return this.createdAt.toISOString();
});

// Virtual for formatted update date
SignalSchema.virtual('formattedUpdatedAt').get(function () {
  return this.updatedAt.toISOString();
});

// Pre-save middleware to ensure data consistency
SignalSchema.pre('save', function (next) {
  // Ensure dataVolume is consistent with dataLength
  if (this.dataLength && this.dataVolume !== this.dataLength * 3) {
    this.dataVolume = this.dataLength * 3;
  }

  // Ensure coordinates are calculated if not provided
  if (!this.coordinates && this.data && this.data.length > 0) {
    const totalLat = this.data.reduce((sum, [, coords]) => sum + coords[0], 0);
    const totalLng = this.data.reduce((sum, [, coords]) => sum + coords[1], 0);
    this.coordinates = [
      totalLat / this.data.length,
      totalLng / this.data.length,
    ];
  }

  next();
});
