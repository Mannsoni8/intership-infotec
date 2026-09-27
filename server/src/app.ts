import express from "express";
import telemetryRouter from "./routes/telemetry.routes.js";
import vehicleRouter from "./routes/vehicle.routes.js";

const app = express();

app.use(express.json());

app.use("/api/telemetry", telemetryRouter);
app.use("/api/vehicles", vehicleRouter);


export default app;