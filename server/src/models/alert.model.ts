import { Schema, model } from "mongoose";

const alertSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    geofenceId: {
      type: Schema.Types.ObjectId,
      ref: "Geofence",
    },

    type: {
      type: String,
      enum: [
        "geofence_breach",
        "overspeed",
        "vehicle_offline",
        "telemetry_anomaly",
      ],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
    },

    location: {
      latitude: Number,
      longitude: Number,
    },

    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },

    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Alert = model("Alert", alertSchema);