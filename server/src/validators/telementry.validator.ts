import type { TelemetryRequestBody } from "../types/telemetry-request.types.js";

export const validateTelemetry = (
    body: TelemetryRequestBody
): string | null => {
    const {
        vehicleId,
        latitude,
        longitude,
        speed,
        heading,
        batteryLevel,
        fuelLevel,
        timestamp,
    } = body;

    if (!vehicleId || typeof vehicleId !== "string") {
        return "vehicleId is required";
    }

    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        return "latitude must be between -90 and 90";
    }

    if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        return "longitude must be between -180 and 180";
    }

    if (!Number.isFinite(speed) || speed < 0) {
        return "speed must be a non-negative number";
    }

    if (
        heading !== undefined &&
        (!Number.isFinite(heading) || heading < 0 || heading > 360)
    ) {
        return "heading must be between 0 and 360";
    }

    if (
        batteryLevel !== undefined &&
        (!Number.isFinite(batteryLevel) ||
            batteryLevel < 0 ||
            batteryLevel > 100)
    ) {
        return "batteryLevel must be between 0 and 100";
    }

    if (
        fuelLevel !== undefined &&
        (!Number.isFinite(fuelLevel) ||
            fuelLevel < 0 ||
            fuelLevel > 100)
    ) {
        return "fuelLevel must be between 0 and 100";
    }

    if (
        timestamp !== undefined &&
        Number.isNaN(new Date(timestamp).getTime())
    ) {
        return "timestamp must be a valid date";
    }

    return null;
};