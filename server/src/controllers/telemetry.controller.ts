import type { Request, Response } from "express";
import { processTelemetry } from "../services/telemetry.service.js";
import type { TelemetryRequestBody } from "../types/telemetry-request.types.js";
import { validateTelemetry } from "../validators/telementry.validator.js";


export const ingestTelemetry = async (
    req: Request<unknown, unknown, TelemetryRequestBody>,
    res: Response
): Promise<void> => {
    try {
        const validationError = validateTelemetry(req.body);

        if (validationError) {
            res.status(400).json({
                message: validationError,
            });
            return;
        }

        const result = await processTelemetry(req.body);

        res.status(202).json({
            message: "Telemetry accepted",
            vehicleId: result.vehicleId,
            timestamp: result.timestamp,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "VEHICLE_NOT_FOUND") {
            res.status(404).json({
                message: "Vehicle not found",
            });
            return;
        }

        console.error("Telemetry ingestion error:", error);

        res.status(500).json({
            message: "Failed to process telemetry",
        });
    }
};