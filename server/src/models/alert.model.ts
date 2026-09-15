import { Schema, model } from "mongoose";
import {
  IAlert,
  AlertType,
  AlertSeverity,
} from "../types/alert.types";

const alertSchema = new Schema<IAlert>(
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
      index: true,
    },

    type: {
      type: String,
      enum: [
        "geofence_breach",
        "overspeed",
        "vehicle_offline",
        "telemetry_anomaly",
      ] satisfies AlertType[],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "critical",
      ] satisfies AlertSeverity[],
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      latitude: {
        type: Number,
        required: true,
      },

      longitude: {
        type: Number,
        required: true,
      },
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

alertSchema.index({
  vehicleId: 1,
  occurredAt: -1,
});

alertSchema.index({
  resolved: 1,
  occurredAt: -1,
});

export const Alert = model<IAlert>(
  "Alert",
  alertSchema
);