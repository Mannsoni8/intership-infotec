import { Types } from "mongoose";

export type AlertType =
  | "geofence_breach"
  | "overspeed"
  | "vehicle_offline"
  | "telemetry_anomaly";

export type AlertSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface IAlertLocation {
  latitude: number;
  longitude: number;
}

export interface IAlert {
  _id: Types.ObjectId;

  vehicleId: Types.ObjectId;

  geofenceId?: Types.ObjectId;

  type: AlertType;

  severity: AlertSeverity;

  message: string;

  location: IAlertLocation;

  occurredAt: Date;

  resolved: boolean;

  resolvedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}