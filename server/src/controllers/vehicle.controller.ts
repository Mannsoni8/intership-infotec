import type { Request, Response } from "express";
import {
    createVehicle,
    getVehicleById,
    getVehicles,
    type CreateVehicleInput,
} from "../services/vehicle.service.js";

export const createVehicleController = async (
    req: Request<unknown, unknown, CreateVehicleInput>,
    res: Response
): Promise<void> => {
    try {
        const vehicle = await createVehicle(req.body);

        res.status(201).json({
            message: "Vehicle created successfully",
            vehicle,
        });
    } catch (error) {
        console.error("Vehicle creation error:", error);

        if (
            error instanceof Error &&
            error.message.includes("duplicate")
        ) {
            res.status(409).json({
                message: "Vehicle ID or registration number already exists",
            });
            return;
        }

        res.status(500).json({
            message: "Failed to create vehicle",
        });
    }
};

export const getVehiclesController = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const vehicles = await getVehicles();

        res.status(200).json({
            count: vehicles.length,
            vehicles,
        });
    } catch (error) {
        console.error("Vehicle retrieval error:", error);

        res.status(500).json({
            message: "Failed to retrieve vehicles",
        });
    }
};

export const getVehicleByIdController = async (
    req: Request<{ vehicleId: string }>,
    res: Response
): Promise<void> => {
    try {
        const vehicle = await getVehicleById(req.params.vehicleId);

        if (!vehicle) {
            res.status(404).json({
                message: "Vehicle not found",
            });
            return;
        }

        res.status(200).json({
            vehicle,
        });
    } catch (error) {
        console.error("Vehicle retrieval error:", error);

        res.status(500).json({
            message: "Failed to retrieve vehicle",
        });
    }
};