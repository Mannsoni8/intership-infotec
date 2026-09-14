import { Types } from "mongoose";

export type VehicleStatus =
    | "online"
    | "offline"
    | "idle"
    | "maintenance";

export type VehicleType =
    | "truck"
    | "van"
    | "car"
    | "bike";

export interface ICurrentLocation {
    latitude: number;
    longitude: number;
}

export interface IVehicle {
    _id: Types.ObjectId;
    vehicleId: string;
    registrationNumber: string;
    driverName: string;
    status: VehicleStatus;
    vehicleType: VehicleType;
    currentLocation: ICurrentLocation;
    currentSpeed: number;
    batteryLevel?: number;
    fuelLevel?: number;
    lastTelemetryAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}