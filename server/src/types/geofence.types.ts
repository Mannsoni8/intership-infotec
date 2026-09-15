import { Types } from "mongoose";

export type GeofenceType = "Polygon" | "Circle";

export interface IPolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface ICircleGeometry {
  type: "Circle";
  coordinates: [number, number];
}

export type GeofenceGeometry =
  | IPolygonGeometry
  | ICircleGeometry;

export interface IGeofence {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  geometry: GeofenceGeometry;
  radius?: number;
  isActive: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  createdAt: Date;
  updatedAt: Date;
}