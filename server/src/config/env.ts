import dotenv from "dotenv"
dotenv.config()

if (!process.env.MONGO_URI) {
    throw new Error("Database url is not define")
}

if (!process.env.PORT) {
    throw new Error("Port is not define")
}

const config = {
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT
}

export default config