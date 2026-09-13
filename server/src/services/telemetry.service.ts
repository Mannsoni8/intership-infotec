import { Types } from "mongoose";
import { TelemetryBucket } from "../models/telemetry.model";
import { ITelemetryReading } from "../types/telemetry.types";


export const getBucketStart = (timestamp: Date): Date => {
    const bucketStart = new Date(timestamp);

    bucketStart.setMinutes(0);
    bucketStart.setSeconds(0);
    bucketStart.setMilliseconds(0);

    return bucketStart;
};


export const addTelemetryReading = async (
    vehicleId: Types.ObjectId,
    reading: ITelemetryReading
): Promise<void> => {
    const bucketStart = getBucketStart(reading.timestamp);

    await TelemetryBucket.findOneAndUpdate(
        {
            vehicleId,
            bucketStart,
        },
        {
            $push: {
                readings: reading,
            },

            $inc: {
                readingCount: 1,
            },
        },
        {
            upsert: true,
            new: true,
        }
    );
};

export const getTelemetryByTimeRange = async (
    vehicleId: Types.ObjectId,
    start: Date,
    end: Date
) => {
    const buckets = await TelemetryBucket.find({
        vehicleId,
        bucketStart: {
            $gte: getBucketStart(start),
            $lte: getBucketStart(end),
        },
    })
        .sort({ bucketStart: 1 })
        .lean();

    return buckets;
};