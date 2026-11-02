const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const Application = require("../models/Application");
const {
  applyJob,
  getMyApplications,
  getApplicationsForRecruiter,
  updateApplicationStatus,
  getApplicationsByJob
} = require("../controllers/applicationController");
router.get("/recruiter",protect,allowRoles("recruiter"),getApplicationsForRecruiter);
router.get("/my-applications", protect, getMyApplications);
router.get("/applied", protect, async (req, res) => {
  try {
    const apps = await Application.find({
      applicant: req.user.id
    }).select("job");
    const jobIds = apps.map(app => app.job.toString());
    res.json(jobIds);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applied jobs" });
  }
});
router.post("/apply/:jobId", protect, applyJob);
router.get("/job/:jobId",protect,allowRoles("recruiter"),getApplicationsByJob);
router.put(
  "/:id/status",
  protect,
  allowRoles("recruiter"),
  updateApplicationStatus
);
module.exports = router;