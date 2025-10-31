import { Router } from "express";
import {
  create,
  destroy,
  index,
  show,
  summary,
  update,
} from "../controllers/influencerController.js";
import { authenticate, authorizeMaster } from "../middleware/authentication.js";

const router = Router();

router.use(authenticate);

router.get("/influenciadoras", index);
router.get("/influenciadoras/consulta", authorizeMaster, summary);

router.post("/influenciadora", authorizeMaster, create);
router.get("/influenciadora/:id", show);
router.put("/influenciadora/:id", authorizeMaster, update);
router.delete("/influenciadora/:id", authorizeMaster, destroy);

export default router;
