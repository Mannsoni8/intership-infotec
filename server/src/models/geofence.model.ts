import { Schema, model } from "mongoose";
import {
  IGeofence,
  GeofenceGeometry,
} from "../types/geofence.types";

const geofenceSchema = new Schema<IGeofence>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    geometry: {
      type: {
        type: String,
        enum: ["Polygon", "Circle"],
        required: true,
      },

      coordinates: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },

    radius: {
      type: Number,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    alertOnEntry: {
      type: Boolean,
      default: true,
    },

    alertOnExit: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Geofence = model<IGeofence>(
  "Geofence",
  geofenceSchema
);