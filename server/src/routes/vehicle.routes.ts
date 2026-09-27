import { Router } from "express";
import { createVehicleController } from "../controllers/vehicle.controller.js";

const router = Router();

router.post("/", createVehicleController);

export default router;