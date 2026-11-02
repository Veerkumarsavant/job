const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createInterview,
  getInterviews
} = require("../controllers/interviewController");

console.log("createInterview:", typeof createInterview);
console.log("getInterviews:", typeof getInterviews);

router.post("/", protect, createInterview);
router.get("/", protect, getInterviews);

module.exports = router;