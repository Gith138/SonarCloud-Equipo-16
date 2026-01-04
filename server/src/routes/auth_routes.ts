import { Router } from "express";
import { register, login, resetPassword, forgotPassword } from "../controllers/auth_controller"

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;