const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { logoUpload } = require("../middleware/upload");

const {
  getRecruiterDashboard,
  getRecruiterStats,
  getRecruiterProfile,
  updateRecruiterProfile,
  uploadLogo,
  getRecruiterApplications,
  updateApplicationStatus,
  getApplicationAnalytics,
} = require("../controllers/recruiterController");

router.use((req, res, next) => {
  console.log("➡️ Recruiter:", req.method, req.originalUrl);
  next();
});
router.get("/applications",protect,allowRoles("recruiter"),getRecruiterApplications);
router.get("/dashboard", protect, allowRoles("recruiter"), getRecruiterDashboard);
router.get("/stats", protect, allowRoles("recruiter"), getRecruiterStats);
router.get("/profile", protect, allowRoles("recruiter"), getRecruiterProfile);
router.put("/profile",protect,allowRoles("recruiter"),
  (req, res, next) => {
    if (!req.body.companyName) {
      return res.status(400).json({ message: "Company name required" });
    }
    next();
  },
  updateRecruiterProfile
);

router.post("/upload-logo",protect,allowRoles("recruiter"),logoUpload.single("logo"),uploadLogo);
router.get("/analytics",protect,allowRoles("recruiter"),getApplicationAnalytics);

module.exports = router;