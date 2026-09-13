import { Types } from "mongoose";

export interface ITelemetryReading {
    timestamp: Date;
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
    batteryLevel?: number;
    fuelLevel?: number;
}

export interface ITelemetryBucket {
    _id: Types.ObjectId;
    vehicleId: Types.ObjectId;
    bucketStart: Date;
    readings: ITelemetryReading[];
    readingCount: number;
    createdAt: Date;
    updatedAt: Date;
}