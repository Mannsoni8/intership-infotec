import { Router } from "express";
import {
    createVehicleController,
    getVehiclesController,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.get("/", getVehiclesController);
router.post("/", createVehicleController);

export default router;