import { Schema, model } from "mongoose";

const telemetryReadingSchema = new Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    speed: {
      type: Number,
      required: true,
      min: 0,
    },

    heading: {
      type: Number,
      min: 0,
      max: 360,
    },

    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },

    fuelLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false,
  }
);

const telemetryBucketSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    bucketStart: {
      type: Date,
      required: true,
      index: true,
    },

    readings: {
      type: [telemetryReadingSchema],
      default: [],
    },

    readingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

telemetryBucketSchema.index({
  vehicleId: 1,
  bucketStart: 1,
});

export const TelemetryBucket = model(
  "TelemetryBucket",
  telemetryBucketSchema
);