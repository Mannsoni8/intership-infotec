import mongoose from "mongoose"
import config from "./env"

export const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI)
        console.log("Database is connected")
    } catch (error) {
        console.log(`Error in connecting database ${error}`)
    }
}