import { Router } from "express";
import {
  postImportPreview,
  postImportConfirm,
  postSale,
  putSale,
  destroySale,
  getSalesSummaryController,
  getSalesByInfluencerController,
} from "../controllers/salesController.js";
import { authenticate, authorizeMaster } from "../middleware/authentication.js";
import verificarAceite from "../middlewares/verificarAceite.js";

const router = Router();

router.post("/import/preview", authenticate, authorizeMaster, postImportPreview);
router.post("/import/confirm", authenticate, authorizeMaster, postImportConfirm);

router.post("/", authenticate, authorizeMaster, postSale);
router.put("/:id", authenticate, authorizeMaster, putSale);
router.delete("/:id", authenticate, authorizeMaster, destroySale);

router.get("/summary/:influencerId", authenticate, verificarAceite, getSalesSummaryController);
router.get("/:influencerId", authenticate, verificarAceite, getSalesByInfluencerController);

export default router;
