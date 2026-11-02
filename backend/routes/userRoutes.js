const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { avatarUpload, resumeUpload ,coverUpload } = require("../middleware/upload");
const User = require("../models/User");
const {
  trackProfileView,
  getMe,
  updateProfile,
  getUser,
  followUser,
  connectUser,
  getSuggestions,
  getProfileVisitors,
  getAllUsers,
  getUserStats,
  addEducation,
  addProject,
  addCertificate,
  addSkill,
  uploadResume,
  uploadCover,
  deleteEducation,
  deleteProject,
  deleteCertificate,
  deleteSkill,
  updateEducation,
  updateProject,
  updateCertificate,
  updateSkill,
  viewProfile,
  uploadAvatar
} = require("../controllers/userController");
router.post("/view/:id", protect, trackProfileView);
router.get("/", protect, getAllUsers);
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.get("/stats", protect, getUserStats);
router.get("/suggestions", protect, getSuggestions);
router.get("/visitors", protect, getProfileVisitors);
router.post("/follow/:id", protect, followUser);
router.post("/connect/:id", protect, connectUser);
router.post("/skills", protect, addSkill);
router.post("/education", protect, addEducation);
router.post("/projects", protect, addProject);
router.post("/certificates", protect, addCertificate);
//router.post("/resume",protect,resumeUpload.single("resume"),uploadResume);
router.post("/resume",protect,
  (req, res, next) => {
    console.log("✅ RESUME ROUTE HIT");
    next();
  },
  resumeUpload.single("resume"),
  uploadResume
);
router.post("/upload-avatar",protect,avatarUpload.single("avatar"),uploadAvatar);

router.post("/cover",protect,coverUpload.single("cover"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const coverPath = `/uploads/covers/${req.file.filename}`;

      user.cover = coverPath;
      await user.save();

      res.json({ cover: coverPath });

    } catch (err) {
      console.error("Cover upload error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);
router.get("/:id", protect, getUser);
router.put("/education/:index",protect,updateEducation);
router.delete("/education/:index",protect,deleteEducation);
router.put("/projects/:index",protect,updateProject);
router.delete("/projects/:index",protect,deleteProject);
router.put("/certificates/:index",protect,updateCertificate);
router.delete("/certificates/:index",protect,deleteCertificate);
router.put("/skills/:index",protect,updateSkill);
router.delete("/skills/:index",protect,deleteSkill);
module.exports = router;