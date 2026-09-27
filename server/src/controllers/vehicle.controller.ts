import type { Request, Response } from "express";
import {
    createVehicle,
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