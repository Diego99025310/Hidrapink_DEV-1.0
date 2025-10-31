import { Router } from "express";
import {
  getInfluencerPlan,
  postInfluencerPlan,
  getInfluencerPlanExtended,
  postInfluencerPlanExtended,
  putInfluencerPlan,
  getInfluencerDashboard,
  getInfluencerHistory,
  getMasterValidations,
  postMasterValidationApprove,
  postMasterValidationReject,
  getMasterDashboard,
} from "../controllers/plannerController.js";
import { authenticate, authorizeMaster } from "../middleware/authentication.js";
import verificarAceite from "../middlewares/verificarAceite.js";

const router = Router();

router.get("/influencer/plan", authenticate, verificarAceite, getInfluencerPlan);
router.post("/influencer/plan", authenticate, verificarAceite, postInfluencerPlan);

router.get("/api/influencer/plan", authenticate, verificarAceite, getInfluencerPlanExtended);
router.post("/api/influencer/plan", authenticate, verificarAceite, postInfluencerPlanExtended);

router.put("/influencer/plan/:id", authenticate, verificarAceite, putInfluencerPlan);

router.get("/influencer/dashboard", authenticate, verificarAceite, getInfluencerDashboard);
router.get("/influencer/history", authenticate, verificarAceite, getInfluencerHistory);

router.get("/master/validations", authenticate, authorizeMaster, getMasterValidations);
router.post(
  "/master/validations/:id/approve",
  authenticate,
  authorizeMaster,
  postMasterValidationApprove,
);
router.post(
  "/master/validations/:id/reject",
  authenticate,
  authorizeMaster,
  postMasterValidationReject,
);

router.get("/master/dashboard", authenticate, authorizeMaster, getMasterDashboard);

export default router;
