import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Vehicle } from "../models/vehicle.model.js";
import { addTelemetryReading } from "../services/telemetry.service.js";
import { ITelemetryReading } from "../types/telemetry.types.js";

const router = Router();

interface TelemetryRequestBody {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
    batteryLevel?: number;
    fuelLevel?: number;
    timestamp?: string;
}

const isValidLatitude = (latitude: number): boolean =>
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;

const isValidLongitude = (longitude: number): boolean =>
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

const isValidPercentage = (value: number | undefined): boolean =>
    value === undefined ||
    (Number.isFinite(value) && value >= 0 && value <= 100);

const isValidHeading = (heading: number | undefined): boolean =>
    heading === undefined ||
    (Number.isFinite(heading) && heading >= 0 && heading <= 360);

router.post(
    "/",
    async (
        req: Request<unknown, unknown, TelemetryRequestBody>,
        res: Response
    ): Promise<void> => {
        try {
            const {
                vehicleId,
                latitude,
                longitude,
                speed,
                heading,
                batteryLevel,
                fuelLevel,
                timestamp,
            } = req.body;

            if (!vehicleId || typeof vehicleId !== "string") {
                res.status(400).json({
                    message: "vehicleId is required",
                });
                return;
            }

            if (!isValidLatitude(latitude)) {
                res.status(400).json({
                    message: "latitude must be between -90 and 90",
                });
                return;
            }

            if (!isValidLongitude(longitude)) {
                res.status(400).json({
                    message: "longitude must be between -180 and 180",
                });
                return;
            }

            if (!Number.isFinite(speed) || speed < 0) {
                res.status(400).json({
                    message: "speed must be a non-negative number",
                });
                return;
            }

            if (!isValidHeading(heading)) {
                res.status(400).json({
                    message: "heading must be between 0 and 360",
                });
                return;
            }

            if (!isValidPercentage(batteryLevel)) {
                res.status(400).json({
                    message: "batteryLevel must be between 0 and 100",
                });
                return;
            }

            if (!isValidPercentage(fuelLevel)) {
                res.status(400).json({
                    message: "fuelLevel must be between 0 and 100",
                });
                return;
            }

            const telemetryTimestamp = timestamp
                ? new Date(timestamp)
                : new Date();

            if (Number.isNaN(telemetryTimestamp.getTime())) {
                res.status(400).json({
                    message: "timestamp must be a valid date",
                });
                return;
            }

            const vehicle = await Vehicle.findOne({ vehicleId });

            if (!vehicle) {
                res.status(404).json({
                    message: "Vehicle not found",
                });
                return;
            }

            const reading: ITelemetryReading = {
                timestamp: telemetryTimestamp,
                latitude,
                longitude,
                speed,
                ...(heading !== undefined && { heading }),
                ...(batteryLevel !== undefined && { batteryLevel }),
                ...(fuelLevel !== undefined && { fuelLevel }),
            };

            await addTelemetryReading(
                vehicle._id as Types.ObjectId,
                reading
            );

            vehicle.currentLocation = {
                latitude,
                longitude,
            };

            vehicle.currentSpeed = speed;
            vehicle.lastTelemetryAt = telemetryTimestamp;
            vehicle.status = "online";

            if (batteryLevel !== undefined) {
                vehicle.batteryLevel = batteryLevel;
            }

            if (fuelLevel !== undefined) {
                vehicle.fuelLevel = fuelLevel;
            }

            await vehicle.save();

            res.status(202).json({
                message: "Telemetry accepted",
                vehicleId: vehicle.vehicleId,
                timestamp: telemetryTimestamp,
            });
        } catch (error) {
            console.error("Telemetry ingestion error:", error);

            res.status(500).json({
                message: "Failed to process telemetry",
            });
        }
    }
);

export default router;