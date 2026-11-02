const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createJob,
  getAllJobs,
  applyJob,
  getMyJobs,
  saveJob,
  getRecommendedJobs,
  notifyJobMatch,
  rankJobApplicants,
  getMatchedJobs,
  getMyApplications,
  deleteJob,
  updateJob,
  getJobApplicants,
  getRecruiterJobs,
  updateApplicationStatus
} = require("../controllers/jobController");

const { recommendJobs } = require("../controllers/recommendationController");

console.log("✅ Job routes loaded");
router.get("/my-applications", protect, getMyApplications);
router.get("/", getAllJobs);
router.post("/", protect, createJob);
router.get("/my", protect, getMyJobs);
router.post("/apply/:id", protect, applyJob);
router.post("/save/:id", protect, saveJob);
router.get("/matched", protect, getMatchedJobs);
router.get("/recommended", protect, getRecommendedJobs);
router.get("/recommendations", protect, recommendJobs);
router.get("/rank-applicants/:id", protect, rankJobApplicants);
router.post("/notify-match/:id", protect, notifyJobMatch);
router.put("/:id", protect, updateJob);
router.delete("/:id", protect, deleteJob);
router.get("/applicants/:jobId", protect, getJobApplicants);
router.put("/:jobId/applicants/:userId/status",protect,updateApplicationStatus);
router.get("/recruiter", protect, getRecruiterJobs);

module.exports = router;