const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const analyticsController = require("../controllers/analyticsController");

router.get("/recruiter", protect, analyticsController.getRecruiterAnalytics);

module.exports = router;