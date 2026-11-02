const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { resumeUpload } = require("../middleware/upload");

const {
    createResume,
    getResume,
    updateResume,
    deleteResume,
    uploadResume,
    getPublicResume,
    getComments,
    addComment
} = require("../controllers/resumeController");

router.post("/upload",protect,resumeUpload.single("resume"),uploadResume);

router.post("/", protect, createResume);
router.get("/:id", protect, getResume);
router.put("/:id", protect, updateResume);
router.delete("/:id", protect, deleteResume);
router.get("/:id/public", getPublicResume);
router.get("/:id/comments", getComments);
router.post("/:id/comments", addComment);

module.exports = router;
