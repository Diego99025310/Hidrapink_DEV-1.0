import { Router } from "express";
import { login, me, register } from "../controllers/authController.js";
import { authenticate, authorizeMaster } from "../middleware/authentication.js";

const router = Router();

router.post("/login", login);
router.post("/api/login", login);

router.post("/register", authenticate, authorizeMaster, register);
router.post("/api/register", authenticate, authorizeMaster, register);

router.get("/me", authenticate, me);
router.get("/api/me", authenticate, me);

export default router;

