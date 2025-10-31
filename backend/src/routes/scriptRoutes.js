import { Router } from "express";
import {
  create,
  destroy,
  index,
  show,
  update,
} from "../controllers/scriptController.js";
import { authenticate, authorizeMaster } from "../middleware/authentication.js";
import verificarAceite from "../middlewares/verificarAceite.js";

const router = Router();

router.get("/scripts", authenticate, verificarAceite, index);
router.get("/scripts/:id", authenticate, verificarAceite, show);
router.post("/scripts", authenticate, authorizeMaster, create);
router.put("/scripts/:id", authenticate, authorizeMaster, update);
router.delete("/scripts/:id", authenticate, authorizeMaster, destroy);

export default router;
