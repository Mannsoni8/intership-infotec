import { Schema, model } from "mongoose";
import {
  IVehicle,
  VehicleStatus,
  VehicleType,
} from "../types/vehicle.types";

const vehicleSchema = new Schema<IVehicle>(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    driverName: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["online", "offline", "idle", "maintenance"] satisfies VehicleStatus[],
      default: "offline",
      index: true,
    },

    vehicleType: {
      type: String,
      enum: ["truck", "van", "car", "bike"] satisfies VehicleType[],
      required: true,
    },

    currentLocation: {
      latitude: {
        type: Number,
        required: true,
      },

      longitude: {
        type: Number,
        required: true,
      },
    },

    currentSpeed: {
      type: Number,
      default: 0,
      min: 0,
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

    lastTelemetryAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Vehicle = model<IVehicle>("Vehicle", vehicleSchema);