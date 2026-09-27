import { Vehicle } from "../models/vehicle.model.js";
import type { IVehicle } from "../types/vehicle.types.js";

export interface CreateVehicleInput {
    vehicleId: string;
    registrationNumber: string;
    driverName: string;
    vehicleType: IVehicle["vehicleType"];
    currentLocation: IVehicle["currentLocation"];
}

export const createVehicle = async (
    data: CreateVehicleInput
): Promise<IVehicle> => {
    const vehicle = await Vehicle.create({
        vehicleId: data.vehicleId,
        registrationNumber: data.registrationNumber,
        driverName: data.driverName,
        vehicleType: data.vehicleType,
        currentLocation: data.currentLocation,
    });

    return vehicle;
};