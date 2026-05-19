import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { 
  getPersonalizedRecommendationsController,
  getUserInterests,
  getInterestBasedRecommendations
} from "../controller/recommendationController.js";

const router = express.Router();

// GET /api/recommendations/personalized?latitude=...&longitude=...
router.get("/personalized", verifyToken, getPersonalizedRecommendationsController);

// GET /api/recommendations/interest-based?latitude=...&longitude=...
router.get("/interest-based", verifyToken, getInterestBasedRecommendations);

// GET /api/recommendations/interests
router.get("/interests", verifyToken, getUserInterests);

export default router;


