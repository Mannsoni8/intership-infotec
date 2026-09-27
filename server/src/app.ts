import express from "express";
import telemetryRouter from "./routes/telemetry.routes.js";

const app = express();

app.use(express.json());

app.use("/api/telemetry", telemetryRouter);

export default app;