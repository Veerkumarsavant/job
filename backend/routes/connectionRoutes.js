const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Connection = require("../models/Connection");

const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getRequests,
  getMutualConnections,
  getPeopleYouMayKnow,
  getConnections
} = require("../controllers/connectionController");


const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }
  next();
};


router.get("/people-you-may-know", protect, getPeopleYouMayKnow);
router.get("/requests", protect, getRequests);
router.get("/mutual/:id", protect, validateObjectId, getMutualConnections);
router.post("/request/:id", protect, validateObjectId, sendRequest);
router.post("/accept/:id", protect, validateObjectId, acceptRequest);
router.post("/reject/:id", protect, validateObjectId, rejectRequest);
router.get("/", protect, getConnections);


module.exports = router;