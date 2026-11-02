const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { postUpload, voiceUpload } = require("../middleware/upload");

const {
  getMessages,
  sendMessage,
  sendImage,
  sendVoice,
  deleteMessage,
  markSeen
} = require("../controllers/messageController");

router.get("/:userId", protect, getMessages);
router.post("/:userId", protect, sendMessage);
router.post("/:userId/image",protect,postUpload.single("image"),sendImage);
router.post("/:userId/voice",protect,voiceUpload.single("voice"),sendVoice);
router.delete("/:id", protect, deleteMessage);
router.put("/seen/:userId", protect, markSeen);

module.exports = router;