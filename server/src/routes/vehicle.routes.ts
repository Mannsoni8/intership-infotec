import { Router } from "express";
import {
    createVehicleController,
    getVehicleByIdController,
    getVehiclesController,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.get("/", getVehiclesController);
router.post("/", createVehicleController);
router.get("/:vehicleId", getVehicleByIdController);

export default router;