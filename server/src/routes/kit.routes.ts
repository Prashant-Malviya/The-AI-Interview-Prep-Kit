import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createKit,
  createKitsBulk,
  listKits,
  getKit,
  updateKit,
  regenerateSection,
  recordPractice,
} from "../controllers/kit.controller";

const router = Router();

router.use(requireAuth); // every kit route requires a signed-in user

router.post("/", createKit);
router.post("/bulk", createKitsBulk);
router.get("/", listKits);
router.get("/:id", getKit);
router.patch("/:id", updateKit);
router.post("/:id/regenerate", regenerateSection);
router.post("/:id/practice", recordPractice);

export default router;
