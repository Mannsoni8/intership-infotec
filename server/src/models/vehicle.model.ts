import mongoose from "mongoose"

const vehicleSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        upperCase: true,
    },
    driverName: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["online", "offline", "idle", "maintenance"],
        default: "offline",
        index: true,
    },

    vehicleType: {
        type: String,
        enum: ["truck", "van", "car", "bike"],
        required: true,
    },

    currentLocation: {
        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },
    },

    currentSpeed: {
        type: Number,
        default: 0,
        min: 0,
    },

    batteryLevel: {
        type: Number,
        min: 0,
        max: 100,
    },

    fuelLevel: {
        type: Number,
        min: 0,
        max: 100,
    },

    lastTelemetryAt: {
        type: Date,
        default: null,
        index: true,
    },
},
    {
        timestamps: true,
    }
)

const vehicleModel = mongoose.model("vehicle", vehicleSchema)

export default vehicleModel
