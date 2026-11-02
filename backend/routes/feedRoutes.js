const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getFeed } = require("../controllers/feedController");

router.get("/feed", protect, getFeed);

module.exports = router;