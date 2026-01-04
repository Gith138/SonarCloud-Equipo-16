import express from "express";
import { recommendation } from "../controllers/recommendation_controller";

const router = express.Router();

router.get("/recommendations", recommendation);

export default router;